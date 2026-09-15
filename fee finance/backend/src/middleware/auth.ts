import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { prisma } from '../config/prisma';

export interface AuthRequest extends Request {
  user?: TokenPayload & { isActive?: boolean };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        message: 'Authentication token missing or invalid',
        code: 'UNAUTHORIZED',
      },
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    // Check if user is still active in DB
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, name: true, isActive: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        error: {
          message: 'Account is deactivated or does not exist',
          code: 'ACCOUNT_INACTIVE',
        },
      });
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      isActive: user.isActive,
    };
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      res.status(401).json({
        error: {
          message: 'Access token expired',
          code: 'TOKEN_EXPIRED',
        },
      });
      return;
    }
    res.status(401).json({
      error: {
        message: 'Invalid access token',
        code: 'INVALID_TOKEN',
      },
    });
  }
}
