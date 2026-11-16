'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, lazy, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useMotionStore } from '@/lib/motion-store';

const FOV = 35;
const DIST = 10;

const LotusScene = lazy(() => import('./LotusScene'));
const SeedScene = lazy(() => import('./SeedScene'));
const WeaveScene = lazy(() => import('./WeaveScene'));

// Mounted only once the lotus section is near, so the GLB and its loaders stay out of the first load.
function Lotus() {
  const near = useMotionStore((s) => s.near.lotus);
  return near ? (
    <Suspense fallback={null}>
      <LotusScene />
    </Suspense>
  ) : null;
}

// Mounted once the craft section is near (1.5 viewports early), so its GLB and texture are in before it is seen.
function Weave() {
  const near = useMotionStore((s) => s.near.weave);
  return near ? (
    <Suspense fallback={null}>
      <WeaveScene />
    </Suspense>
  ) : null;
}

// Mounted once the hero is near (at mount, on the full tier), so the loaders stay out of the first load.
function Seed() {
  const near = useMotionStore((s) => s.near.seed);
  return near ? (
    <Suspense fallback={null}>
      <SeedScene />
    </Suspense>
  ) : null;
}

// Shared by every scene and always mounted, so no program recompiles when a scene arrives.
function Lights() {
  const [cream, petal] = useMemo(() => {
    const t = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    return [t('--cream'), t('--petal-soft')];
  }, []);
  return (
    <>
      <hemisphereLight args={[cream, petal, 2.4]} />
      <directionalLight position={[-3, 4, 3]} color={cream} intensity={1.3} />
      <directionalLight position={[1.5, 2, -4]} color={petal} intensity={1.2} />
    </>
  );
}

function Bridge() {
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const marked = useRef(false);

  useEffect(() => {
    useMotionStore.setState({ requestRender: invalidate });
    invalidate();
    return () => {
      useMotionStore.setState({ requestRender: () => {} });
      delete document.documentElement.dataset.canvas;
    };
  }, [invalidate]);

  useEffect(() => {
    // QA hook; production readers never pass ?tier.
    if (location.search.includes('tier=')) Object.assign(window, { __gieoGL: gl });
    gl.compile(scene, camera);
  }, [gl, scene, camera]);

  useFrame(() => {
    if (marked.current) return;
    marked.current = true;
    document.documentElement.dataset.canvas = 'ready';
  });

  return null;
}

// A context can still fail after the tier probe; the page must keep its copy and stills.
class CanvasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function SceneCanvas() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-(--z-canvas)">
      <CanvasBoundary>
      <Canvas
        // R3F's own wrapper defaults to pointer-events:auto, which would undo the parent's none.
        style={{ pointerEvents: 'none' }}
        flat
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: 'high-performance', alpha: true }}
        camera={{ fov: FOV, position: [0, 0, DIST] }}
      >
        <Lights />
        <Weave />
        <Seed />
        <Lotus />
        <Bridge />
      </Canvas>
      </CanvasBoundary>
    </div>
  );
}
