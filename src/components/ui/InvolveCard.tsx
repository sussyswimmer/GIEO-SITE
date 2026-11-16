import { Link } from '@/i18n/navigation';
import { Todo } from './Todo';
import { Hairline } from './Typography';

/**
 * One way in (S6): a large index row, not a box, with a stitch above it. The hover fill is a ::before
 * that bleeds into the gutter; it is raised by `isolate` so it paints above the row's background and
 * under the label.
 */
export function InvolveCard({ href, label, todo }: { href: string; label: string; todo?: string }) {
  return (
    <li>
      <Hairline />
      <Link
        href={href}
        data-tilt
        className={[
          'group isolate relative block rounded-card py-4 lg:py-5',
          'transition-[scale] duration-(--dur-hover) ease-out active:scale-(--press-scale) active:duration-(--dur-press)',
          "before:absolute before:inset-[0_calc(-1*var(--space-4))] before:z-(--z-section-bg) before:content-['']",
          'before:rounded-card before:bg-(--petal-soft-a24) before:opacity-0 before:shadow-none',
          'before:transition-[opacity,box-shadow] before:duration-(--dur-hover) before:ease-out',
          'hover:before:opacity-100 hover:before:shadow-lift',
        ].join(' ')}
      >
        <span className="block font-serif text-h2 text-fg-heading transition-transform duration-(--dur-hover) ease-out group-hover:translate-x-(--space-2)">
          {label}
        </span>
        {todo && <Todo tag={todo} className="mt-2" />}
      </Link>
    </li>
  );
}
