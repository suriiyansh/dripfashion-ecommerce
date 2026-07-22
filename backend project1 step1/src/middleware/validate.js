import { ZodError } from 'zod';

export function validate(schema, target = 'body') {
  return (req, res, next) => {
    try {
      const data = schema.parse(req[target]);
      if (target === 'body') req.validatedBody = data;
      if (target === 'query') req.validatedQuery = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(err);
    }
  };
}

export const validateBody = (schema) => validate(schema, 'body');
export const validateQuery = (schema) => validate(schema, 'query');