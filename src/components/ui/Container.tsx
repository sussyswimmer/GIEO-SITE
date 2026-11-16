import type { ComponentProps } from 'react';
import { cx } from '@/lib/cx';

/** Page width: 1440 content plus fluid gutters, centred. Text never ignores it. */
export function Container({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cx('mx-auto w-full max-w-[calc(var(--wrap-max)+2*var(--gutter))] px-gutter', className)}
      {...props}
    />
  );
}

/** The page grid: 4 / 8 / 12 columns. Placements ("cols a–b") are in PLAN.md. */
export function Grid({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cx('grid grid-cols-4 gap-x-gap md:grid-cols-8 lg:grid-cols-12', className)} {...props} />;
}
