import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está configurado. Define una clave segura en variables de entorno.');
}

export interface AuthRequest extends Request {
  userId?: number;
}

const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }

  const cookieToken = req.cookies?.auth_token;
  if (typeof cookieToken === 'string' && cookieToken.trim().length > 0) {
    return cookieToken.trim();
  }

  return null;
};

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      res.status(401).json({ error: 'Token no proporcionado' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
