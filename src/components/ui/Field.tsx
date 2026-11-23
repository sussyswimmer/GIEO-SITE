import type { ComponentProps } from 'react';
import { cx } from '@/lib/cx';

// The label wraps its control, so no ids are needed. No placeholders, no floating labels (DESIGN.md §5).
const LABEL = 'flex flex-col gap-2 text-ui font-medium text-ink';

const CONTROL = cx(
  'w-full rounded-field border border-ink-soft bg-cream px-4 py-3 text-body text-ink',
  'hover:border-plum-ink focus-visible:border-plum-ink focus-visible:outline-offset-2 disabled:opacity-45',
  'aria-invalid:border-2 aria-invalid:border-plum-ink',
  'autofill:shadow-[inset_0_0_0_100px_var(--cream)]',
);

/** `error` is set only after a submit attempt; it sits outside the label so it is not read twice. */
type FieldProps = { label: string; error?: string };

function Message({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className="mt-2 text-caption text-ink">
      {error}
    </p>
  ) : null;
}

export function TextField({ label, error, className, ...props }: ComponentProps<'input'> & FieldProps) {
  const id = `${props.name}-error`;
  return (
    <div>
      <label className={LABEL}>
        <span>{label}</span>
        <input
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? id : undefined}
          className={cx(CONTROL, 'min-h-12', className)}
          {...props}
        />
      </label>
      <Message id={id} error={error} />
    </div>
  );
}

export function TextArea({ label, error, className, ...props }: ComponentProps<'textarea'> & FieldProps) {
  const id = `${props.name}-error`;
  return (
    <div>
      <label className={LABEL}>
        <span>{label}</span>
        {/* data-lenis-prevent: Lenis would otherwise take the wheel away from a long message */}
        <textarea
          data-lenis-prevent
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? id : undefined}
          className={cx(CONTROL, 'min-h-40 resize-y', className)}
          {...props}
        />
      </label>
      <Message id={id} error={error} />
    </div>
  );
}
