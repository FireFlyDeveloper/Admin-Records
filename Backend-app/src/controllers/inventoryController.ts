/**
 * @file Inventory Controller
 * @description Handles all inventory-related operations including item CRUD, lot management, checkout flows, and barcode scanning
 * @module controllers/inventoryController
 * @requires express
 * @requires ../services/inventoryService
 * @requires ../middleware/auth
 * @requires ../services/emailService
 * @requires ../utils/errors
 * 
 * @author Admin-Records Team
 * @since 2024-04-25
 * 
 * @see {@link ../services/inventoryService Inventory Service}
 * @see {@link ../middleware/auth Authentication Middleware}
 * @see {@link https://github.com/admin-records/docs/api/inventory Inventory API Docs}
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  listItems,
  getItemById,
  createItem,
  updateItem,
  softDeleteItem,
  listLotsByItem,
  listLotsByExpiration,
  getLotById,
  createLot,
  updateLot,
  deleteLotById,
  createCheckout,
  getCheckoutById,
  listCheckouts,
  createReturn,
  cancelCheckout,
  scanCode,
  logInventoryActivity,
  approveCheckout,
  rejectCheckout,
  CheckoutLine,
  ReturnLine,
} from '../services/inventoryService';
import { ValidationError, ForbiddenError, NotFoundError } from '../utils/errors';
import { validateAndNormalizeCreateItem, validateAndNormalizeUpdateItem } from '../utils/itemValidation';
import { getPublicBorrowerId } from '../routes/public';
import {
  notifyCheckoutCreated,
  notifyCheckoutApproved,
  notifyCheckoutRejected,
  notifyPublicBorrowerApproved,
} from '../services/emailService';
import { markPendingRequestNotificationsResolved } from '../services/notificationService';

/**
 * Extracts and validates user context from authenticated request
 * 
 * @function getUserContext
 * @param {AuthRequest} req - Authenticated express request object
 * 
 * @returns {{userId: string, userRoles: string[], isAdmin: boolean, isStaff: boolean, canCheckoutQuantifiable: boolean}} User context object
 * 
 * @throws {ForbiddenError} When user is not authenticated
 * @throws {TypeError} When user roles are not an array
 * 
 * @private
 * @since 1.0.0
 * 
 * @example
 * const { userId, userRoles, isAdmin, isStaff, canCheckoutQuantifiable } = getUserContext(req)
 * // Returns: { userId: 'uuid', userRoles: ['admin'], isAdmin: true, isStaff: true, canCheckoutQuantifiable: true }
 */
function getUserContext(req: AuthRequest) {
  const user = req.user;
  if (!user) throw new ForbiddenError();
  const isAdmin = user.roles.includes('admin');
  const isStaff = user.roles.includes('staff');
  const canCheckoutQuantifiable = isAdmin || user.roles.includes('staff'); // staff has can_checkout_quantifiable=true per seed
  return { userId: user.id, userRoles: user.roles as string[], isAdmin, isStaff, canCheckoutQuantifiable };
}

// --- Items ---

/**
 * Retrieves paginated list of inventory items with optional filtering
 * 
 * @async
 * @function getItems
 * @param {AuthRequest} req - Authenticated express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * 
 * @query {string} [type] - Filter by item type (trackable/quantifiable)
 * @query {string} [category] - Filter by item category
 * @query {string} [status] - Filter by item status
 * @query {string} [search] - Search term for name/description matching
 * @query {string} [room] - Filter by room location
 * @query {string} [expiration] - Filter by expiration criteria
 * 
 * @returns {Promise<Response>} JSON response with items array
 * 
 * @throws {DatabaseError} When database query fails
 * @throws {ValidationError} When query parameters are invalid
 * @throws {ForbiddenError} When user is not authenticated
 * 
 * @example
 * // Request: GET /api/items?status=available&search=laptop
 * // Response: { items: [{ id: 'uuid', name: 'Laptop', status: 'available', ... }] }
 * 
 * @example
 * // Request: GET /api/items?type=trackable&category=equipment
 * // Response: { items: [...filtered items...] }
 * 
 * @since 1.0.0
 * @author Admin-Records Team
 * 
 * @see {@link ../services/inventoryService.listItems Service Implementation}
 * @see {@link https://github.com/admin-records/docs/api/items GET /api/items API Docs}
 */
export async function getItems(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { type, category, status, search, room, expiration } = req.query;
    const items = await listItems({
      type: type as string | undefined,
      category: category as string | undefined,
      status: status as string | undefined,
      search: search as string | undefined,
      room: room as string | undefined,
      expiration: expiration as string | undefined,
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

/**
 * Retrieves a single inventory item by ID
 * 
 * @async
 * @function getItem
 * @param {AuthRequest} req - Authenticated express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * 
 * @param {string} req.params.id - Item UUID
 * 
 * @returns {Promise<Response>} JSON response with item object
 * 
 * @throws {NotFoundError} When item ID is not found
 * @throws {DatabaseError} When database query fails
 * @throws {ForbiddenError} When user is not authenticated
 * @throws {ValidationError} When item ID format is invalid
 * 
 * @example
 * // Request: GET /api/items/123e4567-e89b-12d3-a456-426614174000
 * // Response: { item: { id: 'uuid', name: 'Laptop', status: 'available', ... } }
 * 
 * @since 1.0.0
 * @author Admin-Records Team
 * 
 * @see {@link ../services/inventoryService.getItemById Service Implementation}
 * @see {@link https://github.com/admin-records/docs/api/items/:id GET /api/items/:id API Docs}
 */
export async function getItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const item = await getItemById(req.params.id as string);
    res.json({ item });
  } catch (err) {
    next(err);
  }
}

/**
 * Creates a new inventory item
 * 
 * @async
 * @function postItem
 * @param {AuthRequest} req - Authenticated express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * 
 * @body {string} item_type - Item type: 'trackable' or 'quantifiable'
 * @body {string} name - Item name (required)
 * @body {string} [sku] - Stock keeping unit
 * @body {string} [category] - Item category
 * @body {string} [description] - Item description
 * @body {string} [status] - Initial status
 * 
 * @returns {Promise<Response>} JSON response with created item (201 status)
 * 
 * @throws {ValidationError} When required fields are missing or invalid
 * @throws {ForbiddenError} When user lacks admin/staff permissions
 * @throws {DatabaseError} When database insert fails
 * @throws {UniqueConstraintError} When SKU conflicts with existing item
 * 
 * @example
 * // Request: POST /api/items
 * // Body: { item_type: 'trackable', name: 'Microscope', category: 'Lab Equipment' }
 * // Response: { item: { id: 'uuid', item_type: 'trackable', name: 'Microscope', ... } }
 * 
 * @since 1.0.0
 * @author Admin-Records Team
 * 
 * @see {@link ../services/inventoryService.createItem Service Implementation}
 * @see {@link https://github.com/admin-records/docs/api/items POST /api/items API Docs}
 */
export async function postItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    if (!ctx.isAdmin && !ctx.isStaff) {
      throw new ForbiddenError('Only admin or staff can create items');
    }

    const normalised = validateAndNormalizeCreateItem(req.body);

    const result = await createItem({
      ...normalised,
      created_by: ctx.userId,
    });
    const { item, restored } = result;

    await logInventoryActivity({
      actor_id: ctx.userId,
      action: 'create_item',
      entity_type: 'item',
      entity_id: item.id,
      metadata: {
        item_type: normalised.item_type,
        name: normalised.name,
        restored,
      },
    });

    res.status(restored ? 200 : 201).json({ item, restored });
  } catch (err) {
    next(err);
  }
}

/**
 * Updates an existing inventory item
 * 
 * @async
 * @function patchItem
 * @param {AuthRequest} req - Authenticated express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * 
 * @param {string} req.params.id - Item UUID to update
 * @param {string} [req.body.name] - Updated item name
 * @param {string} [req.body.sku] - Updated SKU
 * @param {string} [req.body.category] - Updated category
 * @param {string} [req.body.description] - Updated description
 * @param {string} [req.body.status] - Updated status
 * 
 * @returns {Promise<Response>} JSON response with updated item
 * 
 * @throws {ValidationError} When request body contains invalid data
 * @throws {NotFoundError} When item ID is not found
 * @throws {ForbiddenError} When user lacks admin/staff permissions
 * @throws {DatabaseError} When database update fails
 * @throws {UniqueConstraintError} When SKU conflicts with another item
 * 
 * @example
 * // Request: PATCH /api/items/123e4567-e89b-12d3-a456-426614174000
 * // Body: { name: 'Updated Microscope', status: 'maintenance' }
 * // Response: { item: { id: 'uuid', name: 'Updated Microscope', status: 'maintenance', ... } }
 * 
 * @since 1.0.0
 * @author Admin-Records Team
 * 
 * @see {@link ../services/inventoryService.updateItem Service Implementation}
 * @see {@link https://github.com/admin-records/docs/api/items/:id PATCH /api/items/:id API Docs}
 */
export async function patchItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    if (!ctx.isAdmin && !ctx.isStaff) {
      throw new ForbiddenError('Only admin or staff can update items');
    }

    const normalised = validateAndNormalizeUpdateItem(req.body);

    const item = await updateItem(req.params.id as string, normalised);

    await logInventoryActivity({
      actor_id: ctx.userId,
      action: 'update_item',
      entity_type: 'item',
      entity_id: item.id,
    });

    res.json({ item });
  } catch (err) {
    next(err);
  }
}

/**
 * Soft deletes an inventory item (marks as deleted, not permanent)
 * 
 * @async
 * @function deleteItem
 * @param {AuthRequest} req - Authenticated express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next middleware function
 * 
 * @param {string} req.params.id - Item UUID to delete
 * 
 * @returns {Promise<Response>} 204 No Content status
 * 
 * @throws {NotFoundError} When item ID is not found
 * @throws {ForbiddenError} When user lacks admin/staff permissions
 * @throws {DatabaseError} When database update fails
 * @throws {ValidationError} When item has active checkouts or dependencies
 * 
 * @example
 * // Request: DELETE /api/items/123e4567-e89b-12d3-a456-426614174000
 * // Response: 204 No Content
 * 
 * @since 1.0.0
 * @author Admin-Records Team
 * 
 * @see {@link ../services/inventoryService.softDeleteItem Service Implementation}
 * @see {@link https://github.com/admin-records/docs/api/items/:id DELETE /api/items/:id API Docs}
 */
export async function deleteItem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    if (!ctx.isAdmin && !ctx.isStaff) {
      throw new ForbiddenError('Only admin or staff can delete items');
    }

    await softDeleteItem(req.params.id as string);

    await logInventoryActivity({
      actor_id: ctx.userId,
      action: 'delete_item',
      entity_type: 'item',
      entity_id: req.params.id as string,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// --- Lots ---

export async function getLots(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const lots = await listLotsByItem(req.params.id as string);
    res.json({ lots });
  } catch (err) {
    next(err);
  }
}

export async function getLotsByExpiration(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    if (!ctx.isAdmin && !ctx.isStaff) {
      throw new ForbiddenError('Only admin or staff can view expiration lot summaries');
    }

    const expiration = req.query.expiration as string | undefined;
    if (!expiration) {
      throw new ValidationError('expiration query parameter is required');
    }

    const lots = await listLotsByExpiration(expiration);
    res.json({ lots });
  } catch (err) {
    next(err);
  }
}

export async function getLot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const lot = await getLotById(req.params.lotId as string);
    res.json({ lot });
  } catch (err) {
    next(err);
  }
}

export async function postLot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    if (!ctx.isAdmin && !ctx.isStaff) {
      throw new ForbiddenError('Only admin or staff can create lots');
    }

    const { lot_code, quantity_total, purchased_at, expires_at, notes } = req.body;
    if (!lot_code || quantity_total === undefined) {
      throw new ValidationError('lot_code and quantity_total are required');
    }

    const lot = await createLot({
      item_id: req.params.id as string,
      lot_code,
      quantity_total: Number(quantity_total),
      purchased_at,
      expires_at,
      notes,
    });

    await logInventoryActivity({
      actor_id: ctx.userId,
      action: 'create_lot',
      entity_type: 'item_lot',
      entity_id: lot.id,
      metadata: { item_id: req.params.id, lot_code, quantity_total },
    });

    res.status(201).json({ lot });
  } catch (err) {
    next(err);
  }
}

export async function patchLot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    if (!ctx.isAdmin && !ctx.isStaff) {
      throw new ForbiddenError('Only admin or staff can update lots');
    }

    const { lot_code, quantity_total, purchased_at, expires_at, notes } = req.body;
    const lot = await updateLot(req.params.lotId as string, {
      lot_code,
      quantity_total: quantity_total !== undefined ? Number(quantity_total) : undefined,
      purchased_at,
      expires_at,
      notes,
    });

    await logInventoryActivity({
      actor_id: ctx.userId,
      action: 'update_lot',
      entity_type: 'item_lot',
      entity_id: lot.id,
    });

    res.json({ lot });
  } catch (err) {
    next(err);
  }
}

export async function deleteLot(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    if (!ctx.isAdmin && !ctx.isStaff) {
      throw new ForbiddenError('Only admin or staff can delete lots');
    }

    const lot = await deleteLotById(req.params.lotId as string);

    await logInventoryActivity({
      actor_id: ctx.userId,
      action: 'delete_lot',
      entity_type: 'item_lot',
      entity_id: lot.id,
      metadata: { item_id: lot.item_id, lot_code: lot.lot_code, quantity_total: lot.quantity_total },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// --- Checkout ---

export async function postCheckout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const { lines, notes } = req.body;
    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      throw new ValidationError('lines array is required');
    }

    // Validate each line
    const checkoutLines: CheckoutLine[] = lines.map((l: any) => ({
      lot_id: l.lot_id,
      item_id: l.item_id,
      quantity: Number(l.quantity),
    }));

    // All authenticated users can create checkout requests;
    // admin/staff get immediate open status, students go to pending_approval.
    const result = await createCheckout(ctx.userId, checkoutLines, notes, ctx.isAdmin || ctx.isStaff);

    await logInventoryActivity({
      actor_id: ctx.userId,
      action: ctx.isAdmin || ctx.isStaff ? 'request' : 'request',
      entity_type: 'lot',
      entity_id: result.transaction.id,
      metadata: { items: result.items.map((i) => ({ item_id: i.item_id, lot_id: i.lot_id, qty: i.quantity_out })), status: result.transaction.status },
    });

    // Notify admin/staff if this is a pending approval checkout request
    if (result.transaction.status === 'pending_approval' && req.user) {
      // Don't await — fire and forget to avoid slowing the response
      notifyCheckoutCreated(
        req.user.display_name,
        req.user.email,
        result.transaction.id,
        result.items.length
      ).catch((err) => console.error('[EMAIL] Failed to notify checkout created:', err));
    }

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCheckouts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const { status, user_id, item_id } = req.query;

    // Students can only see their own checkouts
    const filterUserId = ctx.isAdmin || ctx.isStaff
      ? (user_id as string | undefined)
      : ctx.userId;

    const transactions = await listCheckouts({
      userId: filterUserId,
      status: status as string | undefined,
      itemId: item_id as string | undefined,
    });
    const publicBorrowerId = await getPublicBorrowerId();
    
    // Apply role-based response formatting
    const formattedTransactions = transactions.map(txn => {
      const responseTxn: any = { ...txn };
      try {
        const notesJson = responseTxn.notes ? JSON.parse(responseTxn.notes) : null;
        if (txn.checked_out_by === publicBorrowerId && notesJson?.email) {
          responseTxn.requester_email = notesJson.email;
        }
      } catch {
        // Ignore invalid notes JSON
      }

      if (ctx.isAdmin || ctx.isStaff) {
        // Admins/staff see full notes
        return responseTxn;
      } else {
        // Students see sanitized notes - only include non-sensitive fields
        const sanitizedTxn = { ...responseTxn };
        if (sanitizedTxn.notes) {
          try {
            const notesJson = JSON.parse(sanitizedTxn.notes);
            const isPublicBorrow = txn.checked_out_by === publicBorrowerId;
            // Only keep fields students should see; preserve requester email for public borrows
            const sanitizedNotes = {
              created_at: notesJson.created_at || null,
              returned_at: notesJson.returned_at || null,
              item_name: notesJson.item_name || null,
              status: notesJson.status || null,
              ...(isPublicBorrow && notesJson.email ? { email: notesJson.email } : {}),
            };
            sanitizedTxn.notes = JSON.stringify(sanitizedNotes);
          } catch {
            // If notes is not valid JSON, keep as-is (might be plain text)
          }
        }
        return sanitizedTxn;
      }
    });
    
    res.json({ transactions: formattedTransactions });
  } catch (err) {
    next(err);
  }
}

export async function getCheckout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const result = await getCheckoutById(req.params.id as string);

    // Students can only view their own
    if (!ctx.isAdmin && !ctx.isStaff && result.transaction.checked_out_by !== ctx.userId) {
      throw new ForbiddenError();
    }

    // Apply role-based response formatting
    if (!ctx.isAdmin && !ctx.isStaff && result.transaction.notes) {
      try {
        const notesJson = JSON.parse(result.transaction.notes);
        const publicBorrowerId = await getPublicBorrowerId();
        const isPublicBorrow = result.transaction.checked_out_by === publicBorrowerId;
        // Only keep fields students should see; preserve requester email for public borrows
        const sanitizedNotes = {
          created_at: notesJson.created_at || null,
          returned_at: notesJson.returned_at || null,
          item_name: notesJson.item_name || null,
          status: notesJson.status || null,
          ...(isPublicBorrow && notesJson.email ? { email: notesJson.email } : {}),
        };
        result.transaction.notes = JSON.stringify(sanitizedNotes);
      } catch {
        // If notes is not valid JSON, keep as-is (might be plain text)
      }
    }

    try {
      const publicBorrowerId = await getPublicBorrowerId();
      const notesJson = result.transaction.notes ? JSON.parse(result.transaction.notes) : null;
      if (result.transaction.checked_out_by === publicBorrowerId && notesJson?.email) {
        (result.transaction as any).requester_email = notesJson.email;
      }
    } catch {
      // Ignore invalid notes JSON
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function postApproveCheckout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    if (!ctx.isAdmin && !ctx.isStaff) {
      throw new ForbiddenError('Only admin or staff can approve checkouts');
    }

    const checkoutId = req.params.id as string;
    const transaction = await approveCheckout(checkoutId, ctx.userId);
    await markPendingRequestNotificationsResolved(checkoutId);

    await logInventoryActivity({
      actor_id: ctx.userId,
      action: 'approve_checkout',
      entity_type: 'checkout_transaction',
      entity_id: checkoutId,
    });

    // Notify the requester that their checkout was approved.
    // For PUBLIC borrows (checked_out_by === publicBorrowerId), the student's email is
    // only in the notes JSON — use that. For AUTHENTICATED checkouts, always use
    // the user's account email via notifyCheckoutApproved so the approval email goes
    // to the correct logged-in user rather than any email stored in notes.
    const notes = transaction.notes as string | undefined;
    const publicBorrowerId = await getPublicBorrowerId();
    if (notes && notes.trim().startsWith('{') && transaction.checked_out_by === publicBorrowerId) {
      // Truly a public borrow — email is only available in notes JSON
      try {
        const studentInfo = JSON.parse(notes);
        if (studentInfo.email && studentInfo.name) {
          notifyPublicBorrowerApproved(
            studentInfo.name,
            studentInfo.email,
            checkoutId
          ).catch((err) => console.error('[EMAIL] Failed to notify public borrower approved:', err));
        } else {
          notifyCheckoutApproved(transaction.checked_out_by, checkoutId)
            .catch((err) => console.error('[EMAIL] Failed to notify checkout approved:', err));
        }
      } catch {
        notifyCheckoutApproved(transaction.checked_out_by, checkoutId)
          .catch((err) => console.error('[EMAIL] Failed to notify checkout approved:', err));
      }
    } else {
      // Authenticated user — use their account email from the users table
      notifyCheckoutApproved(transaction.checked_out_by, checkoutId)
        .catch((err) => console.error('[EMAIL] Failed to notify checkout approved:', err));
    }

    res.json({ transaction });
  } catch (err) {
    next(err);
  }
}

export async function postRejectCheckout(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    if (!ctx.isAdmin && !ctx.isStaff) {
      throw new ForbiddenError('Only admin or staff can reject checkouts');
    }

    const checkoutId = req.params.id as string;
    const transaction = await rejectCheckout(checkoutId, ctx.userId);
    await markPendingRequestNotificationsResolved(checkoutId);

    await logInventoryActivity({
      actor_id: ctx.userId,
      action: 'reject_checkout',
      entity_type: 'checkout_transaction',
      entity_id: checkoutId,
    });

    // Notify the requester that their checkout was rejected
    notifyCheckoutRejected(
      transaction.checked_out_by,
      checkoutId
    ).catch((err) => console.error('[EMAIL] Failed to notify checkout rejected:', err));

    res.json({ transaction });
  } catch (err) {
    next(err);
  }
}

// --- Return ---

export async function postReturn(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const checkoutId = req.params.id as string;
    const { lines, notes } = req.body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      throw new ValidationError('lines array is required');
    }

    const returnLines: ReturnLine[] = lines.map((l: any) => ({
      checkout_item_id: l.checkout_item_id,
      quantity: Number(l.quantity),
    }));

    // Students can only return their own transactions
    if (!ctx.isAdmin && !ctx.isStaff) {
      const checkout = await getCheckoutById(checkoutId);
      if (checkout.transaction.checked_out_by !== ctx.userId) {
        throw new ForbiddenError('Can only return your own checkouts');
      }
    }

    const result = await createReturn(checkoutId, ctx.userId, returnLines, notes);

    await logInventoryActivity({
      actor_id: ctx.userId,
      action: 'return',
      entity_type: 'return_transaction',
      entity_id: result.returnTxn.id,
      metadata: { checkout_id: checkoutId, items: returnLines },
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

// --- Cancel ---

export async function postCancel(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const ctx = getUserContext(req);
    const checkoutId = req.params.id as string;

    // Only admin/staff can cancel, or the owner if still open?
    // Prompt says: cancellation only if open and no returns yet.
    // We'll restrict cancel to admin/staff or the original checker-outer.
    const checkout = await getCheckoutById(checkoutId);
    if (!ctx.isAdmin && !ctx.isStaff && checkout.transaction.checked_out_by !== ctx.userId) {
      throw new ForbiddenError();
    }

    const transaction = await cancelCheckout(checkoutId);
    await markPendingRequestNotificationsResolved(checkoutId);

    await logInventoryActivity({
      actor_id: ctx.userId,
      action: 'cancel_checkout',
      entity_type: 'checkout_transaction',
      entity_id: checkoutId,
    });

    res.json({ transaction });
  } catch (err) {
    next(err);
  }
}

// --- Scan ---

export async function postScan(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { code } = req.body;
    if (!code) {
      throw new ValidationError('code is required');
    }
    const result = await scanCode(code as string);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
