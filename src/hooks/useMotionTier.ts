import { useEffect } from 'react';
import { useMotionStore } from '@/lib/motion-store';
import { pickTier, type Tier, type TierSignals } from '@/lib/tier';

type NavigatorExtras = Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };

function measureFrames(): Promise<number> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    let last = 0;
    let raf = 0;
    const timeout = setTimeout(() => {
      cancelAnimationFrame(raf);
      resolve(Infinity);
    }, 3000);
    const tick = (t: number) => {
      if (last) deltas.push(t - last);
      last = t;
      if (deltas.length >= 30) {
        clearTimeout(timeout);
        resolve(deltas.reduce((a, b) => a + b, 0) / deltas.length);
      } else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  });
}

async function detectTier(): Promise<Tier> {
  const nav = navigator as NavigatorExtras;
  const signals: TierSignals = {
    override: new URLSearchParams(location.search).get('tier'),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    saveData: !!nav.connection?.saveData,
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency || 8,
  };
  const tier = pickTier(signals);
  if (tier !== 'full') return tier;

  // A background tab must not be judged slow.
  if (document.hidden) {
    await new Promise<void>((resolve) => {
      const onVisible = () => {
        if (document.hidden) return;
        document.removeEventListener('visibilitychange', onVisible);
        resolve();
      };
      document.addEventListener('visibilitychange', onVisible);
    });
  }
  return pickTier({ ...signals, avgFrameMs: await measureFrames() });
}

export function useMotionTier(start = false) {
  const tier = useMotionStore((s) => s.tier);
  useEffect(() => {
    if (!start || useMotionStore.getState().tier) return;
    let cancelled = false;
    void detectTier().then((t) => {
      if (cancelled || useMotionStore.getState().tier) return;
      useMotionStore.setState({ tier: t });
      document.documentElement.dataset.tier = t;
    });
    return () => {
      cancelled = true;
    };
  }, [start]);
  return tier;
}
