import { query, withTransaction } from '../utils/db';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { getStoragePath, ensureStorageDir } from './documentService';
import { Document } from '../types';

export async function uploadDocumentsBatch(
  userId: string,
  folderId: string | null,
  files: Array<{ originalname: string; path: string; size: number; mimetype: string }>,
  conflict: 'replace' | 'rename' | 'skip' = 'replace'
): Promise<{ success: boolean; document: Document | null; error?: string }[]> {
  const batchId = uuidv4();
  const results: Array<{ success: boolean; document: Document | null; error?: string }> = [];
  
  await withTransaction(async (client) => {
    for (const file of files) {
      try {
        ensureStorageDir();
        const ext = path.extname(file.originalname);
        const storageName = `${uuidv4()}${ext}`;
        const destPath = path.join(getStoragePath(), storageName);
        
        // Move uploaded file to storage
        fs.renameSync(file.path, destPath);
        
        const docName = file.originalname;
        let finalName = docName;
        let version = 1;
        
        // Check for existing document with same name
        const existingDoc = folderId 
          ? await client.query(
              'SELECT * FROM documents WHERE folder_id = $1 AND name = $2 AND deleted_at IS NULL',
              [folderId, docName]
            )
          : await client.query(
              'SELECT * FROM documents WHERE folder_id IS NULL AND name = $1 AND deleted_at IS NULL',
              [docName]
            );
        
        if (existingDoc.rows.length > 0) {
          const existing = existingDoc.rows[0];
          
          switch (conflict) {
            case 'replace':
              // Create new version
              version = existing.version + 1;
              
              // Archive old version
              await client.query(
                `INSERT INTO document_versions (document_id, version, storage_path, size_bytes, uploaded_by, created_at)
                 VALUES ($1, $2, $3, $4, $5, now())`,
                [existing.id, existing.version, existing.storage_path, existing.size_bytes, userId]
              );
              
              // Update existing document
              await client.query(
                `UPDATE documents 
                 SET storage_path = $1, mime_type = $2, size_bytes = $3, version = $4, updated_at = now()
                 WHERE id = $5`,
                [storageName, file.mimetype, file.size, version, existing.id]
              );
              
              results.push({
                success: true,
                document: { ...existing, storage_path: storageName, mime_type: file.mimetype, size_bytes: file.size, version },
              });
              break;
              
            case 'rename':
              // Find unique name
              let counter = 1;
              let newName = docName;
              while (true) {
                const nameWithoutExt = path.basename(docName, path.extname(docName));
                newName = `${nameWithoutExt} (${counter})${ext}`;
                const checkResult = folderId 
                  ? await client.query(
                      'SELECT 1 FROM documents WHERE folder_id = $1 AND name = $2 AND deleted_at IS NULL',
                      [folderId, newName]
                    )
                  : await client.query(
                      'SELECT 1 FROM documents WHERE folder_id IS NULL AND name = $1 AND deleted_at IS NULL',
                      [newName]
                    );
                if (checkResult.rows.length === 0) break;
                counter++;
              }
              finalName = newName;
              
              // Create new document
              const newDocResult = await client.query(
                `INSERT INTO documents (folder_id, name, mime_type, size_bytes, storage_path, version, uploaded_by, upload_batch_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [folderId, finalName, file.mimetype, file.size, storageName, version, userId, batchId]
              );
              
              results.push({
                success: true,
                document: newDocResult.rows[0],
              });
              break;
              
            case 'skip':
              // Skip this file
              fs.unlinkSync(destPath); // Clean up moved file
              results.push({
                success: false,
                document: null,
                error: `File "${docName}" already exists, skipping`,
              });
              continue; // Skip to next file
          }
        } else {
          // No conflict, create new document
          const newDocResult = await client.query(
            `INSERT INTO documents (folder_id, name, mime_type, size_bytes, storage_path, version, uploaded_by, upload_batch_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [folderId, finalName, file.mimetype, file.size, storageName, version, userId, batchId]
          );
          
          results.push({
            success: true,
            document: newDocResult.rows[0],
          });
        }
      } catch (error) {
        // Clean up file if there was an error
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        
        results.push({
          success: false,
          document: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  });
  
  return results;
}

export async function getDocumentsByBatchId(batchId: string): Promise<Document[]> {
  const result = await query(
    'SELECT * FROM documents WHERE upload_batch_id = $1 AND deleted_at IS NULL ORDER BY created_at',
    [batchId]
  );
  return result.rows;
}