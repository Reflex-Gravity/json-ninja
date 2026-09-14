export function formatJson(content: string): string {
  const parsed = JSON.parse(content);
  return JSON.stringify(parsed, null, 2);
}

export function compactJson(content: string): string {
  const parsed = JSON.parse(content);
  return JSON.stringify(parsed);
}

export function sortJsonKeys(content: string): string {
  const parsed = JSON.parse(content);
  const sorted = sortRecursive(parsed);
  return JSON.stringify(sorted, null, 2);
}

function sortRecursive(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortRecursive);
  }
  if (value !== null && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(value as Record<string, unknown>).sort();
    for (const key of keys) {
      sorted[key] = sortRecursive((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export function tryParseJson(content: string): { ok: boolean; error?: string } {
  if (content.trim() === '') return { ok: true };
  try {
    JSON.parse(content);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export function repairJson(content: string): string {
  if (content.trim() === '') return content;
  try {
    JSON.parse(content);
    return content;
  } catch {
    // attempt common fixes
    let fixed = content
      .replace(/'/g, '"')
      .replace(/,\s*([}\]])/g, '$1')
      .replace(/([,{]\s*)(\w+)\s*:/g, '$1"$2":');

    try {
      const parsed = JSON.parse(fixed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // try wrapping in braces if it starts without them
      const trimmed = content.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(`{${trimmed}}`);
          return JSON.stringify(parsed, null, 2);
        } catch {
          // fall through
        }
      }
      return fixed;
    }
  }
}

export function countItems(content: string): { keys: number; values: number } {
  if (content.trim() === '') return { keys: 0, values: 0 };
  try {
    const parsed = JSON.parse(content);
    return countRecursive(parsed);
  } catch {
    return { keys: 0, values: 0 };
  }
}

function countRecursive(
  value: unknown,
  acc = { keys: 0, values: 0 }
): { keys: number; values: number } {
  if (Array.isArray(value)) {
    for (const item of value) countRecursive(item, acc);
  } else if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      acc.keys++;
      countRecursive(obj[key], acc);
    }
  } else if (value !== undefined) {
    acc.values++;
  }
  return acc;
}

export function byteSize(content: string): string {
  const bytes = new Blob([content]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
