function validate(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return { value: result.data };

  const message = result.error.issues
    .map(issue => `${issue.path.join('.') || 'request'}: ${issue.message}`)
    .join('; ');
  return { error: message || 'Invalid request payload.' };
}

module.exports = { validate };
