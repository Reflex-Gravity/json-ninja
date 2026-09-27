import type { TypesOutputFormat } from '@/types';

type Primitive = 'string' | 'number' | 'boolean' | 'null';

// Everything observed at one position in the JSON, merged across all samples (e.g. array items).
interface TypeInfo {
  primitives: Set<Primitive>;
  object: ObjectInfo | null;
  array: TypeInfo | null;
}

interface ObjectInfo {
  fields: Map<string, { type: TypeInfo; count: number }>;
  samples: number;
}

export interface GenerateTypesOptions {
  rootName: string;
  format: TypesOutputFormat;
  declaration: 'interface' | 'type';
}

function emptyInfo(): TypeInfo {
  return { primitives: new Set(), object: null, array: null };
}

function mergeObjects(a: ObjectInfo, b: ObjectInfo): ObjectInfo {
  const fields = new Map(a.fields);
  for (const [key, field] of b.fields) {
    const existing = fields.get(key);
    fields.set(
      key,
      existing
        ? { type: merge(existing.type, field.type), count: existing.count + field.count }
        : field
    );
  }
  return { fields, samples: a.samples + b.samples };
}

function merge(a: TypeInfo, b: TypeInfo): TypeInfo {
  return {
    primitives: new Set([...a.primitives, ...b.primitives]),
    object: a.object && b.object ? mergeObjects(a.object, b.object) : a.object ?? b.object,
    array: a.array && b.array ? merge(a.array, b.array) : a.array ?? b.array,
  };
}

function infer(value: unknown): TypeInfo {
  const info = emptyInfo();
  if (value === null) info.primitives.add('null');
  else if (Array.isArray(value)) info.array = value.map(infer).reduce(merge, emptyInfo());
  else if (typeof value === 'object') {
    const fields = new Map<string, { type: TypeInfo; count: number }>();
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      fields.set(key, { type: infer(v), count: 1 });
    }
    info.object = { fields, samples: 1 };
  } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    info.primitives.add(typeof value as Primitive);
  }
  return info;
}

function toPascalCase(value: string): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
  const name = words.map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  if (!name) return 'Type';
  return /^[0-9]/.test(name) ? `T${name}` : name;
}

function singularize(name: string): string {
  if (/ies$/.test(name)) return name.replace(/ies$/, 'y');
  if (/(ss|us)$/.test(name)) return name;
  if (/s$/.test(name)) return name.slice(0, -1);
  return name;
}

function itemName(parent: string): string {
  const singular = singularize(parent);
  return singular !== parent ? singular : `${parent}Item`;
}

function propertyKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

interface Declaration {
  name: string;
  body: string;
}

// Walks the merged TypeInfo tree, naming each object shape and reusing names for identical shapes.
class Emitter {
  private decls: (Declaration | null)[] = [];
  private usedNames = new Set<string>();
  private byBody = new Map<string, string>();

  constructor(private readonly options: GenerateTypesOptions) {}

  get zod() {
    return this.options.format === 'zod';
  }

  private reserveName(hint: string): string {
    const base = toPascalCase(hint);
    let name = base;
    for (let i = 2; this.usedNames.has(name); i++) name = `${base}${i}`;
    this.usedNames.add(name);
    return name;
  }

  private refName(name: string): string {
    return this.zod ? `${name}Schema` : name;
  }

  private declareObject(obj: ObjectInfo, hint: string): string {
    const name = this.reserveName(hint);
    // TypeScript reads best parent-first; Zod consts must be declared before they are used.
    const slot = this.zod ? -1 : this.decls.push(null) - 1;

    const lines = Array.from(obj.fields, ([key, field]) => {
      const optional = field.count < obj.samples;
      const type = this.render(field.type, key);
      if (this.zod) return `  ${propertyKey(key)}: ${type}${optional ? '.optional()' : ''},`;
      return `  ${propertyKey(key)}${optional ? '?' : ''}: ${type};`;
    });
    const body = lines.length ? `{\n${lines.join('\n')}\n}` : '{}';

    const existing = this.byBody.get(body);
    if (existing) {
      this.usedNames.delete(name);
      return this.refName(existing);
    }
    this.byBody.set(body, name);
    if (slot >= 0) this.decls[slot] = { name, body };
    else this.decls.push({ name, body });
    return this.refName(name);
  }

  render(info: TypeInfo, hint: string): string {
    const parts: string[] = [];
    if (info.object) parts.push(this.declareObject(info.object, hint));
    if (info.array) {
      const element = this.render(info.array, itemName(toPascalCase(hint)));
      if (this.zod) parts.push(`z.array(${element})`);
      else parts.push(element.includes(' | ') ? `(${element})[]` : `${element}[]`);
    }
    const nullable = info.primitives.has('null');
    for (const p of ['string', 'number', 'boolean'] as const) {
      if (info.primitives.has(p)) parts.push(this.zod ? `z.${p}()` : p);
    }

    if (this.zod) {
      if (parts.length === 0) return nullable ? 'z.null()' : 'z.unknown()';
      const base = parts.length === 1 ? parts[0] : `z.union([${parts.join(', ')}])`;
      return nullable ? `${base}.nullable()` : base;
    }
    if (nullable) parts.push('null');
    return parts.length ? parts.join(' | ') : 'unknown';
  }

  output(rootType: string, rootName: string): string {
    const blocks = this.decls
      .filter((d): d is Declaration => d !== null)
      .map(({ name, body }) => {
        if (this.zod) return `export const ${name}Schema = z.object(${body});`;
        return this.options.declaration === 'interface'
          ? `export interface ${name} ${body}`
          : `export type ${name} = ${body};`;
      });

    // A root that isn't a single object shape (e.g. an array) still gets a named export.
    const rootIsDeclared = rootType === this.refName(rootName);
    if (this.zod) {
      if (!rootIsDeclared) blocks.push(`export const ${rootName}Schema = ${rootType};`);
      blocks.unshift("import { z } from 'zod';");
      const names = this.decls.filter((d): d is Declaration => d !== null).map((d) => d.name);
      if (!rootIsDeclared) names.push(rootName);
      blocks.push(names.map((name) => `export type ${name} = z.infer<typeof ${name}Schema>;`).join('\n'));
    } else if (!rootIsDeclared) {
      blocks.unshift(`export type ${rootName} = ${rootType};`);
    }
    return blocks.join('\n\n') + '\n';
  }
}

export function generateTypes(json: string, options: GenerateTypesOptions): string {
  const info = infer(JSON.parse(json));
  const rootName = toPascalCase(options.rootName || 'Root');
  const emitter = new Emitter(options);
  const rootType = emitter.render(info, rootName);
  return emitter.output(rootType, rootName);
}
