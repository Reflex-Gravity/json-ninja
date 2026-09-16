import { diffLines } from 'diff';

export interface DiffRow {
  type: 'equal' | 'added' | 'removed';
  leftNum: number | null;
  leftLine: string | null;
  rightNum: number | null;
  rightLine: string | null;
}

export interface SideBySideDiff {
  rows: DiffRow[];
  added: number;
  removed: number;
}

function splitLines(value: string): string[] {
  const lines = value.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export function buildSideBySideDiff(leftText: string, rightText: string): SideBySideDiff {
  const parts = diffLines(leftText, rightText);
  const rows: DiffRow[] = [];
  let leftNum = 1;
  let rightNum = 1;
  let added = 0;
  let removed = 0;

  for (const part of parts) {
    const lines = splitLines(part.value);
    if (part.removed) {
      for (const line of lines) {
        rows.push({ type: 'removed', leftNum: leftNum++, leftLine: line, rightNum: null, rightLine: null });
        removed++;
      }
    } else if (part.added) {
      for (const line of lines) {
        rows.push({ type: 'added', leftNum: null, leftLine: null, rightNum: rightNum++, rightLine: line });
        added++;
      }
    } else {
      for (const line of lines) {
        rows.push({ type: 'equal', leftNum: leftNum++, leftLine: line, rightNum: rightNum++, rightLine: line });
      }
    }
  }

  return { rows, added, removed };
}
