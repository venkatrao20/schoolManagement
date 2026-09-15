import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Error Handler]', err);

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || (status === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');

  res.status(status).json({
    error: {
      message,
      code,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
}
