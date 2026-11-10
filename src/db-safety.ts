export async function readRows<T>(result: AsyncIterable<T>): Promise<T[]> {
  const rows: T[] = [];
  for await (const row of result) rows.push(row);
  return rows;
}

export async function safeDbQuery<T>(label: string, work: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await work();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    const sanitized = String(message)
      .replace(/DATABASE_URL[^\n\r]*/gi, "DATABASE_URL=[REDACTED]")
      .replace(/postgres(?:ql)?:\/\/[^\s@]+@/gi, "postgresql://[REDACTED]@")
      .replace(/(?<=password=)[^\s;]+/gi, "[REDACTED]")
      .replace(/(?<=:\/\/)[^@]+(?=@)/gi, "[REDACTED]");

    console.error(`[crm-db] ${label} failed: ${sanitized}`);
    return fallback;
  }
}
