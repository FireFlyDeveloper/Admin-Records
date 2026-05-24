import { query } from '../utils/db';
import { UserOnlineStatus } from '../types';

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  last_active: string;
  created_at: string;
  expires_at: string;
}

export async function createOrUpdateUserSession(
  userId: string,
  sessionToken: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await query(
    `SELECT update_user_activity($1, $2, $3, $4)`,
    [userId, sessionToken, ipAddress || null, userAgent || null]
  );
}

export async function getUserOnlineStatus(userId: string): Promise<'online' | 'offline' | 'inactive'> {
  const result = await query(
    `SELECT status FROM user_online_status WHERE id = $1`,
    [userId]
  );
  
  if (result.rows.length === 0) {
    return 'offline';
  }
  
  return result.rows[0].status as 'online' | 'offline' | 'inactive';
}

export async function getAllUserStatuses(): Promise<UserOnlineStatus[]> {
  const result = await query(
    `SELECT id, email, display_name, is_active, status, last_seen 
     FROM user_online_status 
     ORDER BY 
       CASE status 
         WHEN 'online' THEN 1
         WHEN 'offline' THEN 2
         WHEN 'inactive' THEN 3
       END, display_name`,
    []
  );
  
  return result.rows;
}

export async function cleanupExpiredSessions(): Promise<void> {
  await query(
    `DELETE FROM user_sessions WHERE expires_at < now()`,
    []
  );
}

export async function getUserSession(userId: string, sessionToken: string): Promise<UserSession | null> {
  const result = await query(
    `SELECT * FROM user_sessions 
     WHERE user_id = $1 AND session_token = $2 AND expires_at > now()`,
    [userId, sessionToken]
  );
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return result.rows[0];
}

export async function logoutUserSession(sessionToken: string): Promise<void> {
  await query(
    `DELETE FROM user_sessions WHERE session_token = $1`,
    [sessionToken]
  );
}

export async function logoutAllUserSessions(userId: string): Promise<void> {
  await query(
    `DELETE FROM user_sessions WHERE user_id = $1`,
    [userId]
  );
}