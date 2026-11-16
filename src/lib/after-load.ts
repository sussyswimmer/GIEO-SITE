/** Runs `cb` after page load, plus `delay` ms, on an idle moment, so it never competes with LCP. */
export function afterLoad(cb: () => void, delay = 0) {
  let cancel = () => {};
  const idle = () => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(cb, { timeout: 1500 });
      cancel = () => window.cancelIdleCallback(id);
    } else {
      // Safari has no requestIdleCallback.
      const id = setTimeout(cb, 200);
      cancel = () => clearTimeout(id);
    }
  };
  const wait = () => {
    const id = setTimeout(idle, delay);
    cancel = () => clearTimeout(id);
  };
  if (document.readyState === 'complete') wait();
  else {
    window.addEventListener('load', wait, { once: true });
    cancel = () => window.removeEventListener('load', wait);
  }
  return () => cancel();
}
