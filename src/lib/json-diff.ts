export interface JsonChange {
  type: 'added' | 'removed' | 'changed';
  path: string;
  left?: unknown;
  right?: unknown;
}

export interface JsonDiffOptions {
  // Treat arrays as multisets: elements are matched by value regardless of position.
  ignoreArrayOrder?: boolean;
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function childPath(parent: string, key: string | number): string {
  if (typeof key === 'number') return `${parent}[${key}]`;
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`;
}

// Key-order-independent serialization, used to compare values and match array elements.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (isObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function walk(
  left: unknown,
  right: unknown,
  path: string,
  options: JsonDiffOptions,
  changes: JsonChange[]
) {
  if (isObject(left) && isObject(right)) {
    const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)])).sort();
    for (const key of keys) {
      const p = childPath(path, key);
      if (!(key in right)) changes.push({ type: 'removed', path: p, left: left[key] });
      else if (!(key in left)) changes.push({ type: 'added', path: p, right: right[key] });
      else walk(left[key], right[key], p, options, changes);
    }
    return;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (options.ignoreArrayOrder) {
      const unmatched = new Map<string, number[]>();
      right.forEach((item, i) => {
        const key = canonical(item);
        unmatched.set(key, [...(unmatched.get(key) ?? []), i]);
      });
      left.forEach((item, i) => {
        const indices = unmatched.get(canonical(item));
        if (indices && indices.length > 0) indices.shift();
        else changes.push({ type: 'removed', path: childPath(path, i), left: item });
      });
      const added = Array.from(unmatched.values()).flat().sort((a, b) => a - b);
      for (const i of added) changes.push({ type: 'added', path: childPath(path, i), right: right[i] });
      return;
    }
    for (let i = 0; i < Math.max(left.length, right.length); i++) {
      const p = childPath(path, i);
      if (i >= right.length) changes.push({ type: 'removed', path: p, left: left[i] });
      else if (i >= left.length) changes.push({ type: 'added', path: p, right: right[i] });
      else walk(left[i], right[i], p, options, changes);
    }
    return;
  }

  if (canonical(left) !== canonical(right)) {
    changes.push({ type: 'changed', path, left, right });
  }
}

// Structural diff of two parsed JSON values: key order and formatting never count as changes.
export function diffJson(left: unknown, right: unknown, options: JsonDiffOptions = {}): JsonChange[] {
  const changes: JsonChange[] = [];
  walk(left, right, '$', options, changes);
  return changes;
}
