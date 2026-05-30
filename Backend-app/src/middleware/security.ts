import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { ValidationError, UnauthorizedError } from '../utils/errors';

/**
 * Enhanced input sanitization middleware
 * Sanitizes common XSS vectors and SQL injection patterns
 */
export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/[<>\"']/g, (char) => {
        switch (char) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '"': return '&quot;';
          case "'": return '&#x27;';
          default: return char;
        }
      })
      .replace(/[;\(\)|&$]/g, (char) => {
        switch (char) {
          case ';': return '';
          case '(': return '';
          case ')': return '';
          case '|': return '';
          case '&': return '&amp;';
          case '$': return '';
          default: return char;
        }
      });
  };

  const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return sanitizeString(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) req.body = sanitizeObject(req.body);
  
  // req.query and req.params are read-only in Express, create sanitized copies
  if (req.query && Object.keys(req.query).length > 0) {
    // Create a new object with sanitized values and assign to req.query (works as a setter)
    const sanitizedQuery = sanitizeObject(req.query);
    // Copy sanitized values back to req.query by setting each property
    Object.keys(sanitizedQuery).forEach(key => {
      (req as any).query[key] = sanitizedQuery[key];
    });
  }
  
  if (req.params && Object.keys(req.params).length > 0) {
    const sanitizedParams = sanitizeObject(req.params);
    Object.keys(sanitizedParams).forEach(key => {
      (req as any).params[key] = sanitizedParams[key];
    });
  }

  next();
}

/**
 * Rate limiting configuration
 */
export const rateLimiters = {
  // Strict rate limiting for auth endpoints (login, register, etc.)
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window per IP
    message: {
      error: 'Too many authentication attempts. Please try again in 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.ip === '::1' || req.ip === '127.0.0.1', // Skip localhost
  }),

  // Moderate rate limiting for general API endpoints
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window per IP
    message: {
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.ip === '::1' || req.ip === '127.0.0.1',
  }),

  // Lenient rate limiting for public endpoints
  public: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // 300 requests per window per IP
    message: {
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

/**
 * Password strength validation
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Check for common passwords
  const commonPasswords = [
    'password', '12345678', 'qwerty', 'abc123', 'letmein', 'welcome',
    'admin', 'root', 'dragon', 'master', 'sunshine', 'iloveyou',
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }

  // Check for sequential characters
  if (/(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)/i.test(password)) {
    errors.push('Password must not contain sequential characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Email validation
 */
export function validateEmail(email: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!email) {
    errors.push('Email is required');
    return { isValid: false, errors };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    errors.push('Invalid email format');
  }

  if (email.length > 254) {
    errors.push('Email must not exceed 254 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Security logging middleware
 * Logs security-relevant events for audit trail
 */
export function securityLogger(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  const startTime = Date.now();
  
  res.json = function(body: any): Response {
    const duration = Date.now() - startTime;
    
    // Log security-relevant events
    if (shouldLogEvent(req, res, body)) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        statusCode: res.statusCode,
        duration,
        userId: (req as any).user?.id,
        eventType: getEventType(req),
        auditData: getAuditData(req, body),
      };
      
      console.log('[SECURITY_AUDIT]', JSON.stringify(logEntry));
    }
    
    return originalJson(body);
  };

  next();
}

function shouldLogEvent(req: Request, res: Response, body: any): boolean {
  // Log all auth attempts
  if (req.path.includes('/auth')) return true;
  
  // Log failed requests
  if (res.statusCode >= 400) return true;
  
  // Log admin actions
  if (req.path.includes('/admin')) return true;
  
  // Log POST/PUT/DELETE operations
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) return true;
  
  // Log requests with authentication
  if ((req as any).user) return true;
  
  return false;
}

function getEventType(req: Request): string {
  if (req.path.includes('/auth/login')) return 'LOGIN_ATTEMPT';
  if (req.path.includes('/auth/logout')) return 'LOGOUT';
  if (req.path.includes('/users')) return 'USER_MANAGEMENT';
  if (req.path.includes('/admin')) return 'ADMIN_ACTION';
  if (req.method === 'POST') return 'CREATE';
  if (req.method === 'PUT' || req.method === 'PATCH') return 'UPDATE';
  if (req.method === 'DELETE') return 'DELETE';
  return 'REQUEST';
}

function getAuditData(req: Request, body: any): Record<string, any> {
  const data: Record<string, any> = {};
  
  // Log relevant request data (excluding sensitive info)
  if (req.params.id) data.id = req.params.id;
  if (body?.id) data.id = body.id;
  if (body?.email) data.email = body.email;
  
  return data;
}

/**
 * Account lockout mechanism
 * Tracks failed login attempts and locks accounts after threshold
 */
const failedLoginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

export function recordFailedLogin(identifier: string): void {
  const key = identifier.toLowerCase();
  const now = Date.now();
  const record = failedLoginAttempts.get(key) || { count: 0, lastAttempt: now };
  
  record.count += 1;
  record.lastAttempt = now;
  
  // Lock account after 5 failed attempts for 15 minutes
  if (record.count >= 5) {
    record.lockedUntil = now + (15 * 60 * 1000);
    console.log(`[SECURITY] Account locked due to too many failed attempts: ${identifier}`);
  }
  
  failedLoginAttempts.set(key, record);
  
  // Cleanup old entries
  if (failedLoginAttempts.size > 1000) {
    cleanupFailedAttempts();
  }
}

export function recordSuccessfulLogin(identifier: string): void {
  const key = identifier.toLowerCase();
  failedLoginAttempts.delete(key);
}

export function isAccountLocked(identifier: string): { locked: boolean; retryAfter?: number } {
  const key = identifier.toLowerCase();
  const record = failedLoginAttempts.get(key);
  
  if (!record || !record.lockedUntil) {
    return { locked: false };
  }
  
  const now = Date.now();
  if (record.lockedUntil > now) {
    return { locked: true, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  }
  
  // Lock expired, reset counter
  failedLoginAttempts.delete(key);
  return { locked: false };
}

function cleanupFailedAttempts(): void {
  const now = Date.now();
  for (const [key, record] of failedLoginAttempts.entries()) {
    // Remove entries older than 24 hours
    if (now - record.lastAttempt > 24 * 60 * 60 * 1000) {
      failedLoginAttempts.delete(key);
    }
    // Reset counters for unlocked accounts
    else if (record.lockedUntil && record.lockedUntil < now) {
      failedLoginAttempts.delete(key);
    }
  }
}

/**
 * Security headers middleware (enhanced helmet configuration)
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // CSP for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https:; " +
      "frame-ancestors 'none'; "
    );
  }
  
  next();
}
