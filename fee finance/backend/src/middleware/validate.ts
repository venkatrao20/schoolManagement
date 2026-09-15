import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        res.status(400).json({
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: issues,
          },
        });
        return;
      }
      next(error);
    }
  };
}

export function validateBody(schema: ZodSchema<any>) {
  return validate({ body: schema });
}

export function validateParams(schema: ZodSchema<any>) {
  return validate({ params: schema });
}

export function validateQuery(schema: ZodSchema<any>) {
  return validate({ query: schema });
}
