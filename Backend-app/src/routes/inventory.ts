import { Router } from 'express';
import {
  getItems,
  getItem,
  postItem,
  patchItem,
  deleteItem,
  getLots,
  getLotsByExpiration,
  getLot,
  postLot,
  patchLot,
  deleteLot,
  postCheckout,
  getCheckouts,
  getCheckout,
  postReturn,
  postCancel,
  postScan,
  postApproveCheckout,
  postRejectCheckout,
} from '../controllers/inventoryController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Items
router.get('/items', getItems);
router.post('/items', postItem);
router.get('/items/:id', getItem);
router.patch('/items/:id', patchItem);
router.delete('/items/:id', deleteItem);

// Lots
router.get('/items/:id/lots', getLots);
router.get('/lots', getLotsByExpiration);
router.get('/lots/:lotId', getLot);
router.post('/items/:id/lots', postLot);
router.patch('/lots/:lotId', patchLot);
router.delete('/lots/:lotId', deleteLot);

// Checkout
router.post('/checkout', postCheckout);
router.get('/checkout', getCheckouts);
router.get('/checkout/:id', getCheckout);
router.post('/checkout/:id/approve', postApproveCheckout);
router.post('/checkout/:id/reject', postRejectCheckout);
router.post('/checkout/:id/return', postReturn);
router.post('/checkout/:id/cancel', postCancel);

// Scan
router.post('/checkout/scan', postScan);
router.post('/scan', postScan);

export default router;
