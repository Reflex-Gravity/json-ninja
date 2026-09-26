import { buildInlineDiff, type DiffOptions, type DiffRow, type InlineSegment } from '@/lib/diff-utils';

interface Props {
  rows: DiffRow[];
  options?: DiffOptions;
}

const REMOVED_BG = 'bg-red-50 dark:bg-red-950/40';
const ADDED_BG = 'bg-green-50 dark:bg-green-950/40';
const REMOVED_MARK = 'bg-red-200 dark:bg-red-800/60 rounded-sm';
const ADDED_MARK = 'bg-green-200 dark:bg-green-800/60 rounded-sm';

function Segments({ segments, markClass }: { segments: InlineSegment[]; markClass: string }) {
  return (
    <>
      {segments.map((s, i) =>
        s.changed ? (
          <span key={i} className={markClass}>
            {s.value}
          </span>
        ) : (
          <span key={i}>{s.value}</span>
        )
      )}
    </>
  );
}

export default function DiffView({ rows, options }: Props) {
  return (
    <table className="w-full border-collapse font-mono text-xs">
      <tbody>
        {rows.map((row, i) => {
          const leftChanged = row.type === 'removed' || row.type === 'modified';
          const rightChanged = row.type === 'added' || row.type === 'modified';
          const inline =
            row.type === 'modified' && row.leftLine !== null && row.rightLine !== null
              ? buildInlineDiff(row.leftLine, row.rightLine, options)
              : null;
          return (
            <tr key={i}>
              <td
                className={`w-10 text-right pr-2 select-none align-top text-gray-400 dark:text-gray-500 ${
                  leftChanged ? REMOVED_BG : ''
                }`}
              >
                {row.leftNum ?? ''}
              </td>
              <td
                className={`w-1/2 whitespace-pre-wrap break-all px-2 align-top text-gray-700 dark:text-gray-200 ${
                  leftChanged ? REMOVED_BG : ''
                }`}
              >
                {inline ? <Segments segments={inline.left} markClass={REMOVED_MARK} /> : row.leftLine ?? ''}
              </td>
              <td
                className={`w-10 text-right pr-2 select-none align-top text-gray-400 dark:text-gray-500 border-l border-gray-100 dark:border-gray-700 ${
                  rightChanged ? ADDED_BG : ''
                }`}
              >
                {row.rightNum ?? ''}
              </td>
              <td
                className={`w-1/2 whitespace-pre-wrap break-all px-2 align-top text-gray-700 dark:text-gray-200 ${
                  rightChanged ? ADDED_BG : ''
                }`}
              >
                {inline ? <Segments segments={inline.right} markClass={ADDED_MARK} /> : row.rightLine ?? ''}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
