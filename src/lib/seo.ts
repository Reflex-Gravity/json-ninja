import type { ToolId } from '@/types';
import { TOOLS, getPathForTool } from '@/lib/tools';

const SITE_ORIGIN = 'https://gravitytools.joeldsouza.me';

function setMeta(selector: string, content: string) {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute('content', content);
}

// Keeps <title>, meta description, canonical, and social tags in sync with the active tool's route.
export function applyToolSeo(toolId: ToolId) {
  const tool = TOOLS.find((t) => t.id === toolId) ?? TOOLS[0];
  const url = `${SITE_ORIGIN}${getPathForTool(toolId)}`;

  document.title = tool.title;
  setMeta('meta[name="description"]', tool.description);
  setMeta('meta[property="og:title"]', tool.title);
  setMeta('meta[property="og:description"]', tool.description);
  setMeta('meta[property="og:url"]', url);
  setMeta('meta[name="twitter:title"]', tool.title);
  setMeta('meta[name="twitter:description"]', tool.description);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = url;
}
