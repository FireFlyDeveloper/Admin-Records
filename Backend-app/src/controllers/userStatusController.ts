import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  createOrUpdateUserSession,
  getUserOnlineStatus,
  getAllUserStatuses,
  getUserSession,
  logoutUserSession
} from '../services/userSessionService';
import {
  getUserNotifications,
  getNotificationCounts,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../services/notificationService';
import { ValidationError } from '../utils/errors';

// --- User Status Endpoints ---

export async function updateUserActivity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      throw new ValidationError('User not authenticated');
    }
    
    const sessionToken = req.body.session_token;
    if (!sessionToken) {
      throw new ValidationError('session_token is required');
    }
    
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');
    
    await createOrUpdateUserSession(
      user.id,
      sessionToken,
      ipAddress,
      userAgent
    );
    
    res.json({ success: true, message: 'Activity updated' });
  } catch (err) {
    next(err);
  }
}

export async function getUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      throw new ValidationError('User not authenticated');
    }
    
    const status = await getUserOnlineStatus(user.id);
    
    res.json({ 
      status,
      user_id: user.id,
      display_name: user.display_name,
      email: user.email,
      is_active: user.is_active
    });
  } catch (err) {
    next(err);
  }
}

export async function getAllUsersStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      throw new ValidationError('User not authenticated');
    }
    
    // Only admins can see all user statuses
    if (!user.roles.includes('admin')) {
      throw new ValidationError('Admin access required');
    }
    
    const statuses = await getAllUserStatuses();
    
    res.json({ statuses });
  } catch (err) {
    next(err);
  }
}

export async function verifyUserSession(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      throw new ValidationError('User not authenticated');
    }
    
    const sessionToken = req.body.session_token;
    if (!sessionToken) {
      throw new ValidationError('session_token is required');
    }
    
    const session = await getUserSession(user.id, sessionToken);
    
    res.json({ 
      valid: !!session,
      session
    });
  } catch (err) {
    next(err);
  }
}

export async function logoutSession(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      throw new ValidationError('User not authenticated');
    }
    
    const sessionToken = req.body.session_token;
    if (!sessionToken) {
      throw new ValidationError('session_token is required');
    }
    
    await logoutUserSession(sessionToken);
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// --- Notification Endpoints ---

export async function getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      throw new ValidationError('User not authenticated');
    }
    
    const { unread, type, limit = 50, offset = 0 } = req.query;
    
    const result = await getUserNotifications(user.id, {
      unreadOnly: unread === 'true',
      type: type as any,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    });
    
    res.json({
      notifications: result.notifications,
      total: result.total,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    });
  } catch (err) {
    next(err);
  }
}

export async function getNotificationCountsEndpoint(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      throw new ValidationError('User not authenticated');
    }
    
    const counts = await getNotificationCounts(user.id);
    
    res.json(counts);
  } catch (err) {
    next(err);
  }
}

export async function markNotificationRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      throw new ValidationError('User not authenticated');
    }
    
    const notificationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!notificationId) {
      throw new ValidationError('Notification ID is required');
    }
    
    await markNotificationAsRead(notificationId);
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function markAllNotificationsRead(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      throw new ValidationError('User not authenticated');
    }
    
    await markAllNotificationsAsRead(user.id);
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

export async function deleteNotificationEndpoint(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = req.user;
    if (!user) {
      throw new ValidationError('User not authenticated');
    }
    
    const notificationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!notificationId) {
      throw new ValidationError('Notification ID is required');
    }
    
    await deleteNotification(notificationId);
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
}