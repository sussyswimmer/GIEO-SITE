import { cx } from '@/lib/cx';

/**
 * Dev-only marker for content or assets GIEO has not supplied yet (tags: docs/00-open-questions.md).
 * Renders nothing in production builds. Never fill a TODO with a guess.
 */
export function Todo({ tag, block, className }: { tag: string; block?: boolean; className?: string }) {
  if (process.env.NODE_ENV === 'production') return null;
  return (
    <span
      data-todo={tag}
      className={cx(
        'items-center rounded-field border border-dashed border-plum-ink bg-peach-glow px-2 py-1 font-sans text-caption text-ink',
        block ? 'flex min-h-24 w-full justify-center' : 'inline-flex',
        className,
      )}
    >
      TODO({tag})
    </span>
  );
}
