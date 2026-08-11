function redactSensitiveText(value: string) {
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/DATABASE_URL=(?:"[^"]+"|'[^']+'|[^\s]+)/gi, "DATABASE_URL=[REDACTED]");
}

export function logApiError(context: string, error: unknown) {
  if (error instanceof Error) {
    console.error(context, {
      name: error.name,
      message: redactSensitiveText(error.message),
      stack: error.stack ? redactSensitiveText(error.stack) : undefined
    });
    return;
  }

  console.error(context, redactSensitiveText(String(error)));
}
