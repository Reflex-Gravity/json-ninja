import { diffLines, diffWordsWithSpace } from 'diff';

export interface DiffRow {
  // 'modified' pairs a removed line with the added line that replaced it, so both sides share a row.
  type: 'equal' | 'added' | 'removed' | 'modified';
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

export interface DiffOptions {
  ignoreWhitespace?: boolean;
  ignoreCase?: boolean;
}

export interface InlineSegment {
  value: string;
  changed: boolean;
}

function splitLines(value: string): string[] {
  const lines = value.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function normalizeForDiff(lines: string[], options: DiffOptions): string {
  return lines
    .map((line) => {
      let value = line;
      if (options.ignoreWhitespace) value = value.replace(/\s+/g, ' ').trim();
      if (options.ignoreCase) value = value.toLowerCase();
      return `${value}\n`;
    })
    .join('');
}

export function buildSideBySideDiff(
  leftText: string,
  rightText: string,
  options: DiffOptions = {}
): SideBySideDiff {
  const leftLines = splitLines(leftText.replace(/\r\n/g, '\n'));
  const rightLines = splitLines(rightText.replace(/\r\n/g, '\n'));
  // The ignore* options are applied by diffing normalized copies line-for-line; the displayed
  // lines are always read back from the original inputs by line number.
  const parts = diffLines(
    normalizeForDiff(leftLines, options),
    normalizeForDiff(rightLines, options)
  );
  const rows: DiffRow[] = [];
  let leftNum = 1;
  let rightNum = 1;
  let added = 0;
  let removed = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const count = splitLines(part.value).length;

    if (part.removed) {
      const next = parts[i + 1];
      const addedCount = next?.added ? splitLines(next.value).length : 0;
      if (addedCount > 0) i++;
      for (let j = 0; j < Math.max(count, addedCount); j++) {
        const hasLeft = j < count;
        const hasRight = j < addedCount;
        rows.push({
          type: hasLeft && hasRight ? 'modified' : hasLeft ? 'removed' : 'added',
          leftNum: hasLeft ? leftNum : null,
          leftLine: hasLeft ? leftLines[leftNum - 1] ?? '' : null,
          rightNum: hasRight ? rightNum : null,
          rightLine: hasRight ? rightLines[rightNum - 1] ?? '' : null,
        });
        if (hasLeft) leftNum++;
        if (hasRight) rightNum++;
      }
      removed += count;
      added += addedCount;
    } else if (part.added) {
      for (let j = 0; j < count; j++) {
        rows.push({
          type: 'added',
          leftNum: null,
          leftLine: null,
          rightNum: rightNum,
          rightLine: rightLines[rightNum - 1] ?? '',
        });
        rightNum++;
      }
      added += count;
    } else {
      for (let j = 0; j < count; j++) {
        rows.push({
          type: 'equal',
          leftNum: leftNum,
          leftLine: leftLines[leftNum - 1] ?? '',
          rightNum: rightNum,
          rightLine: rightLines[rightNum - 1] ?? '',
        });
        leftNum++;
        rightNum++;
      }
    }
  }

  return { rows, added, removed };
}

// Word-level segments for a modified row, so the exact changed spans can be highlighted on each side.
export function buildInlineDiff(
  leftLine: string,
  rightLine: string,
  options: DiffOptions = {}
): { left: InlineSegment[]; right: InlineSegment[] } {
  const parts = diffWordsWithSpace(leftLine, rightLine, { ignoreCase: options.ignoreCase });
  const left: InlineSegment[] = [];
  const right: InlineSegment[] = [];
  let leftPos = 0;
  let rightPos = 0;

  for (const part of parts) {
    const len = part.value.length;
    if (part.removed) {
      left.push({ value: leftLine.slice(leftPos, leftPos + len), changed: true });
      leftPos += len;
    } else if (part.added) {
      right.push({ value: rightLine.slice(rightPos, rightPos + len), changed: true });
      rightPos += len;
    } else {
      left.push({ value: leftLine.slice(leftPos, leftPos + len), changed: false });
      right.push({ value: rightLine.slice(rightPos, rightPos + len), changed: false });
      leftPos += len;
      rightPos += len;
    }
  }

  return { left, right };
}
