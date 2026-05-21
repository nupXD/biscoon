import type { ZodSchema } from 'zod';

interface ValidateResult<T> {
  value?: T;
  error?: string;
}

function validate<T>(schema: ZodSchema<T>, value: unknown): ValidateResult<T> {
  const result = schema.safeParse(value);
  if (result.success) return { value: result.data };

  const message = result.error.issues
    .map(issue => `${issue.path.join('.') || 'request'}: ${issue.message}`)
    .join('; ');
  return { error: message || 'Invalid request payload.' };
}

export { validate };
