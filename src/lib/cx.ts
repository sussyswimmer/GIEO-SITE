/**
 * Joins class names and drops falsy ones.
 * shortcut: no tailwind-merge, so a caller's class cannot override a component default on the
 * same property (CSS order decides). Components therefore keep their defaults minimal; add
 * tailwind-merge if overrides become common.
 */
export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
