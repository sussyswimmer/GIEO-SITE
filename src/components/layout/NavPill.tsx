'use client';

import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Link, usePathname } from '@/i18n/navigation';
import { cx } from '@/lib/cx';
import { NAV_LINKS } from '@/lib/site';
import { LanguageToggle } from './LanguageToggle';

const ALWAYS_SHOWN_ABOVE = 120; // px from the top: the pill never hides here
const SCROLL_DELTA = 6; // px of travel before hide/show reacts (ignores jitter)
const MENU_CLOSE_SCROLL = 24; // px of scroll that closes the open menu

// Desktop links: a 1px pink underline grows from the left on hover; the current page keeps a
// 1.5px PLUM underline so the state never depends on pink (DESIGN.md §5 NavPill).
const DESKTOP_LINK = cx(
  'relative inline-flex h-11 items-center rounded-pill px-4 text-ui font-medium text-plum-ink',
  'transition-[scale] duration-(--dur-press) ease-out active:scale-(--press-scale)',
  'after:absolute after:inset-x-4 after:bottom-3 after:h-px after:origin-left after:scale-x-0 after:bg-lotus-pink',
  'after:transition-[scale] after:duration-(--dur-hover) after:ease-out hover:after:scale-x-100',
  'aria-[current=page]:after:h-[1.5px] aria-[current=page]:after:scale-x-100 aria-[current=page]:after:bg-plum-ink',
);

const MENU_LINK = cx(
  'flex min-h-14 items-center py-2 font-serif text-h3 text-plum-ink',
  'underline-offset-[0.2em] hover:underline hover:decoration-lotus-pink hover:decoration-1',
  'aria-[current=page]:underline aria-[current=page]:decoration-plum-ink aria-[current=page]:decoration-[1.5px]',
);

export function NavPill({ nav, siteName }: { nav: Record<string, string>; siteName: string }) {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Hide on scroll down, return on scroll up. Passive listener, at most one read per frame.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lastY = window.scrollY;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y <= ALWAYS_SHOWN_ABOVE || reduce.matches) {
        lastY = y;
        setHidden(false);
        return;
      }
      if (Math.abs(y - lastY) <= SCROLL_DELTA) return; // let small moves accumulate
      setHidden(y > lastY);
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // The mobile menu is a disclosure, not a modal: it never locks scroll or traps focus.
  // It closes on Escape (focus returns to the button), outside press, focus leaving, or 24px of scroll.
  useEffect(() => {
    if (!open) return;
    const startY = window.scrollY;
    const isOutside = (target: EventTarget | null) =>
      !(target instanceof Node && headerRef.current?.contains(target));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      menuButtonRef.current?.focus();
    };
    const onPointer = (e: PointerEvent) => isOutside(e.target) && setOpen(false);
    const onFocus = (e: FocusEvent) => isOutside(e.target) && setOpen(false);
    const onScroll = () => Math.abs(window.scrollY - startY) > MENU_CLOSE_SCROLL && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('focusin', onFocus);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('focusin', onFocus);
      window.removeEventListener('scroll', onScroll);
    };
  }, [open]);

  const current = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) ? ('page' as const) : undefined;

  return (
    <header
      ref={headerRef}
      // Never hidden while the menu is open; CSS also keeps it shown while focus is inside.
      data-hidden={(hidden && !open) || undefined}
      className={cx(
        'fixed inset-x-(--gutter) top-(--nav-top) z-(--z-nav)',
        'lg:right-auto lg:left-1/2 lg:w-max lg:-translate-x-1/2',
        'transition-[translate] duration-(--dur-nav) ease-out',
        'data-hidden:not-focus-within:-translate-y-[calc(100%+var(--nav-top)+var(--space-2))]',
      )}
    >
      {/* ring, not border: a border would eat 2px of the 44px item height inside the 52px pill */}
      <nav className="flex h-(--nav-h) items-center gap-1 rounded-pill bg-(--cream-a86) p-1 shadow-nav ring-1 ring-blush-line backdrop-blur-[16px] backdrop-saturate-[1.2]">
        <Logo draw="load" className="px-4" siteName={siteName} homeLabel={nav.home} />

        <ul role="list" className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map(({ key, href }) => (
            <li key={key}>
              <Link href={href} aria-current={current(href)} className={DESKTOP_LINK}>
                {nav[key]}
              </Link>
            </li>
          ))}
        </ul>
        <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-blush-line lg:block" />

        <LanguageToggle className="ml-auto lg:ml-0" groupLabel={nav.language} switchLabel={nav.switchTo} />

        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={open}
          aria-controls="nav-menu"
          aria-label={open ? nav.closeMenu : nav.openMenu}
          onClick={() => setOpen((o) => !o)}
          className="relative grid size-11 place-items-center rounded-pill transition-[scale,background-color] duration-(--dur-press) ease-out hover:bg-(--petal-soft-a40) active:scale-(--press-scale) lg:hidden"
        >
          {/* two 1.5px lines that morph into an X */}
          <span
            aria-hidden="true"
            className={cx(
              'absolute h-[1.5px] w-5 bg-plum-ink transition-[translate,rotate] duration-(--dur-menu) ease-out',
              open ? 'rotate-45' : '-translate-y-1',
            )}
          />
          <span
            aria-hidden="true"
            className={cx(
              'absolute h-[1.5px] w-5 bg-plum-ink transition-[translate,rotate] duration-(--dur-menu) ease-out',
              open ? '-rotate-45' : 'translate-y-1',
            )}
          />
        </button>

        <div
          id="nav-menu"
          hidden={!open}
          className="absolute inset-x-0 top-[calc(100%+var(--space-2))] rounded-card border border-blush-line bg-cream p-6 shadow-nav transition-[opacity,translate] duration-(--dur-menu) ease-out starting:-translate-y-2 starting:opacity-0 lg:hidden"
        >
          <ul role="list" className="divide-y divide-blush-line">
            {NAV_LINKS.map(({ key, href }) => (
              <li key={key}>
                <Link href={href} aria-current={current(href)} onClick={() => setOpen(false)} className={MENU_LINK}>
                  {nav[key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
