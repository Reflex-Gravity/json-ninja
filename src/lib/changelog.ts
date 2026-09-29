import {
  Command,
  Share2,
  PanelTop,
  Columns2,
  FolderOpen,
  Link as LinkIcon,
  GripVertical,
  Wrench,
  GitCompare,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import type { ToolId } from '@/types';

export interface ReleaseItem {
  title: string;
  description: string;
  // Items about a tool link to it and borrow its icon unless one is given.
  tool?: ToolId;
  icon?: LucideIcon;
}

export interface Release {
  version: string;
  date: string;
  items: ReleaseItem[];
}

// Newest first. Add a release at the top to have it shown to returning users.
export const RELEASES: Release[] = [
  {
    version: '1.4.0',
    date: '2026-09-29',
    items: [
      {
        title: 'JSON compare moved into the JSON Editor',
        description:
          'Compare any two open documents by structure or as text from the new Compare button, or from any panel. Text Compare is now a plain text diff.',
        tool: 'json',
        icon: GitCompare,
      },
      {
        title: 'JSON → Yup',
        description: 'JSON to Types can now generate Yup schemas with inferred types, alongside TypeScript and Zod.',
        tool: 'types',
      },
      {
        title: 'Tooltips everywhere',
        description: 'Every icon button now shows a quick, readable tooltip on hover.',
        icon: MessageSquare,
      },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-09-27',
    items: [
      {
        title: 'Regex Tester & Builder',
        description:
          'Live match highlighting, capture groups, replace preview, a token palette, common presets and a plain-English explanation.',
        tool: 'regex',
      },
      {
        title: 'JSON → TypeScript / Zod',
        description:
          'Generate interfaces, types or Zod schemas from sample JSON, with optional fields inferred across array items.',
        tool: 'types',
      },
      {
        title: 'Markdown preview',
        description: 'GitHub-flavoured Markdown with live preview, Copy HTML and export to .html.',
        tool: 'markdown',
      },
      {
        title: 'Structural JSON diff',
        description:
          'Compare JSON by structure, ignoring key order and whitespace, with an option to ignore array order.',
        tool: 'json',
        icon: GitCompare,
      },
      {
        title: 'Share via URL',
        description:
          'Copy a link that carries your content in the URL itself. Nothing is uploaded to a server.',
        icon: Share2,
      },
      {
        title: 'Command palette',
        description: 'Press ⌘K / Ctrl K to jump between tools and run actions like format, sort or repair.',
        icon: Command,
      },
      {
        title: 'Roomier panel toolbar',
        description: 'Panel actions are shown as icons when there is space, instead of hiding in a menu.',
        icon: PanelTop,
      },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-09-26',
    items: [
      {
        title: 'Text Compare',
        description: 'Side-by-side diff of two texts, with options to ignore whitespace and case.',
        tool: 'compare',
      },
      {
        title: 'JSON Stringify & cURL',
        description: 'Convert JSON to and from string literals and cURL commands.',
        tool: 'stringify',
      },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-09-16',
    items: [
      {
        title: 'SVG preview',
        description: 'Paste SVG markup and see it rendered live.',
        tool: 'svg',
      },
      {
        title: 'HTML preview',
        description: 'Render HTML in a sandboxed frame, with scripts off by default.',
        tool: 'html',
      },
      {
        title: 'Base64 encode / decode',
        description: 'Convert text to and from Base64.',
        tool: 'base64',
      },
      {
        title: 'Draggable tabs',
        description: 'Reorder JSON editor tabs and move them between panels by dragging.',
        icon: GripVertical,
      },
      {
        title: 'Smarter JSON repair',
        description: 'Fixes more broken JSON, such as trailing commas, single quotes and unquoted keys.',
        icon: Wrench,
      },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-14',
    items: [
      {
        title: 'JSON editor',
        description: 'Format, validate and explore JSON in tree, code or table view.',
        tool: 'json',
      },
      {
        title: 'Multi-panel layouts',
        description: 'Work on up to four documents at once, side-by-side, stacked or in a grid.',
        icon: Columns2,
      },
      {
        title: 'Saved documents',
        description: 'Save documents in your browser and reopen them later.',
        icon: FolderOpen,
      },
      {
        title: 'Import from URL',
        description: 'Fetch JSON straight from an endpoint into a panel.',
        icon: LinkIcon,
      },
    ],
  },
];

export const CURRENT_VERSION = RELEASES[0].version;

// Users with saved preferences from before this changelog existed had already seen this release.
export const PRE_CHANGELOG_VERSION = '1.2.0';

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
