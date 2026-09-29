import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Side = 'top' | 'bottom' | 'left' | 'right';

interface Tip {
  text: string;
  rect: DOMRect;
  side: Side;
}

const SHOW_DELAY = 350;
const GAP = 6;
const MARGIN = 8;

// Native `title` tooltips appear late (or never, e.g. over the JSON editor or on some platforms)
// and can't be styled, so this renders every `title` / `data-tooltip` in the app as a styled tooltip.
// The `title` is moved to `data-tooltip` on first hover so the browser's own tooltip doesn't also show.
// `data-tooltip-side` picks the preferred side (default: bottom, flipping when there's no room).
function adoptTitle(el: HTMLElement) {
  const title = el.getAttribute('title');
  if (title === null) return;
  el.removeAttribute('title');
  if (title.trim()) {
    el.dataset.tooltip = title;
    // The title was also the accessible name of icon-only buttons.
    if (!el.hasAttribute('aria-label') && !el.textContent?.trim()) el.setAttribute('aria-label', title);
  } else {
    delete el.dataset.tooltip;
  }
}

function tooltipTarget(node: EventTarget | null): HTMLElement | null {
  if (!(node instanceof Element)) return null;
  const el = node.closest<HTMLElement>('[title], [data-tooltip]');
  if (!el) return null;
  adoptTitle(el);
  return el.dataset.tooltip ? el : null;
}

function fits(side: Side, rect: DOMRect, width: number, height: number): boolean {
  switch (side) {
    case 'top':
      return rect.top - GAP - height >= MARGIN;
    case 'bottom':
      return rect.bottom + GAP + height <= window.innerHeight - MARGIN;
    case 'left':
      return rect.left - GAP - width >= MARGIN;
    case 'right':
      return rect.right + GAP + width <= window.innerWidth - MARGIN;
  }
}

const OPPOSITE: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

function position(tip: Tip, width: number, height: number): { left: number; top: number } {
  const { rect } = tip;
  const side = fits(tip.side, rect, width, height) ? tip.side : OPPOSITE[tip.side];
  let left: number;
  let top: number;
  if (side === 'top' || side === 'bottom') {
    left = rect.left + rect.width / 2 - width / 2;
    top = side === 'top' ? rect.top - GAP - height : rect.bottom + GAP;
  } else {
    left = side === 'left' ? rect.left - GAP - width : rect.right + GAP;
    top = rect.top + rect.height / 2 - height / 2;
  }
  const clamp = (value: number, max: number) => Math.max(MARGIN, Math.min(value, max - MARGIN));
  return { left: clamp(left, window.innerWidth - width), top: clamp(top, window.innerHeight - height) };
}

export default function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let current: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let tipShown = false;

    const hide = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      current = null;
      tipShown = false;
      setTip(null);
    };

    const handleOver = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const el = tooltipTarget(e.target);
      if (el === current) return;
      hide();
      if (!el) return;
      current = el;
      timer = setTimeout(() => {
        if (!current?.isConnected || !current.dataset.tooltip) return;
        tipShown = true;
        setTip({
          text: current.dataset.tooltip,
          rect: current.getBoundingClientRect(),
          side: (current.dataset.tooltipSide as Side | undefined) ?? 'bottom',
        });
      }, SHOW_DELAY);
    };

    const handleOut = (e: PointerEvent) => {
      if (current && !(e.relatedTarget instanceof Node && current.contains(e.relatedTarget))) hide();
    };

    // React re-sets `title` when its value changes (e.g. "Copy" -> "Copied!"); adopt it right away.
    const observer = new MutationObserver((records) => {
      for (const { target } of records) {
        if (!(target instanceof HTMLElement) || !target.hasAttribute('title')) continue;
        adoptTitle(target);
        if (target === current && tipShown) {
          const text = target.dataset.tooltip;
          setTip((prev) => (prev && text ? { ...prev, text } : null));
        }
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['title'], subtree: true });

    document.addEventListener('pointerover', handleOver, true);
    document.addEventListener('pointerout', handleOut, true);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('keydown', hide, true);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    return () => {
      hide();
      observer.disconnect();
      document.removeEventListener('pointerover', handleOver, true);
      document.removeEventListener('pointerout', handleOut, true);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('keydown', hide, true);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
    };
  }, []);

  // Measure after render so the tooltip can be placed (and flipped/clamped) by its real size.
  useLayoutEffect(() => {
    if (!tip || !tipRef.current) {
      setCoords(null);
      return;
    }
    const { offsetWidth, offsetHeight } = tipRef.current;
    setCoords(position(tip, offsetWidth, offsetHeight));
  }, [tip]);

  if (!tip) return null;

  return (
    <div
      ref={tipRef}
      role="tooltip"
      style={coords ?? { left: 0, top: 0, visibility: 'hidden' }}
      className="pointer-events-none fixed z-[100] max-w-xs whitespace-pre-line break-words rounded-md bg-gray-900 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-white shadow-lg"
    >
      {tip.text}
    </div>
  );
}
