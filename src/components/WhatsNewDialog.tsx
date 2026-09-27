import { useEffect } from 'react';
import { Sparkles, X, ArrowRight, Dot } from 'lucide-react';
import type { ToolId } from '@/types';
import { RELEASES, compareVersions } from '@/lib/changelog';
import { TOOLS } from '@/lib/tools';

interface Props {
  open: boolean;
  // Releases newer than this are badged "New"; null means everything has been seen.
  lastSeenVersion: string | null;
  onClose: () => void;
  onOpenTool: (tool: ToolId) => void;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function WhatsNewDialog({ open, lastSeenVersion, onClose, onOpenTool }: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-labelledby="whats-new-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 id="whats-new-title" className="text-sm font-bold text-gray-800 dark:text-gray-100">
              What's new in GravityTools
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {RELEASES.map((release) => {
            const isNew = lastSeenVersion !== null && compareVersions(release.version, lastSeenVersion) > 0;
            return (
              <section key={release.version}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-100">v{release.version}</span>
                  <Dot className="w-3 h-3 text-gray-400" />
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {dateFormat.format(new Date(`${release.date}T00:00:00`))}
                  </span>
                  {isNew && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      New
                    </span>
                  )}
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>
                <ul className="space-y-3">
                  {release.items.map((item) => {
                    const tool = item.tool ? TOOLS.find((t) => t.id === item.tool) : undefined;
                    const Icon = item.icon ?? tool?.icon ?? Sparkles;
                    return (
                      <li key={item.title} className="flex gap-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">
                              {item.title}
                            </span>
                            {tool && (
                              <button
                                onClick={() => onOpenTool(tool.id)}
                                className="flex items-center gap-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                Open
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="flex justify-end px-5 py-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
