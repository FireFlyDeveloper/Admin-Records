import { Router } from 'express';
import {
  updateUserActivity,
  getUserStatus,
  getAllUsersStatus,
  verifyUserSession,
  logoutSession,
  getNotifications,
  getNotificationCountsEndpoint,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotificationEndpoint
} from '../controllers/userStatusController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// --- User Status Routes ---
router.post('/activity', updateUserActivity); // Update user activity
router.get('/status', getUserStatus); // Get current user status
router.get('/status/all', getAllUsersStatus); // Get all users status (admin only)
router.post('/session/verify', verifyUserSession); // Verify user session
router.post('/session/logout', logoutSession); // Logout specific session

// --- Notification Routes ---
router.get('/notifications', getNotifications); // Get user notifications
router.get('/notifications/counts', getNotificationCountsEndpoint); // Get notification counts
router.post('/notifications/:id/read', markNotificationRead); // Mark notification as read
router.post('/notifications/read-all', markAllNotificationsRead); // Mark all notifications as read
router.delete('/notifications/:id', deleteNotificationEndpoint); // Delete notification

export default router;