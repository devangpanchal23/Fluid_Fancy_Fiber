import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import FiberStrand from "./FiberStrand";

const QUALITY_PRESETS = {
  high: { count: 11, segments: 72, radialSegments: 8, dpr: [1, 2] },
  medium: { count: 7, segments: 48, radialSegments: 6, dpr: [1, 1.5] },
  low: { count: 4, segments: 28, radialSegments: 5, dpr: [1, 1] }
};

// Slowly, continuously rotates the whole fiber bundle, adds a damped tilt
// toward the pointer (mouse/touch position, skipped on touch pointers), and
// a very small offset from page scroll — never scroll-jacked, just a subtle
// drift so the hero feels connected to the rest of the page.
function FiberGroup({ scrollProgress, children }) {
  const group = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const { pointer } = useThree();

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    target.current.x = pointer.y * 0.18;
    target.current.y = pointer.x * 0.28;

    g.rotation.x += (target.current.x - g.rotation.x) * Math.min(1, delta * 2.2);
    g.rotation.y += (target.current.y + state.clock.elapsedTime * 0.045 - g.rotation.y) * Math.min(1, delta * 2.2);
    g.rotation.z = scrollProgress * 0.12;
  });

  return <group ref={group}>{children}</group>;
}

export default function FiberScene({ scrollProgress = 0, quality = "high", reducedInteraction = false }) {
  const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.medium;

  const strands = useMemo(() => {
    const arr = [];
    for (let i = 0; i < preset.count; i++) {
      const t = preset.count <= 1 ? 0.5 : i / (preset.count - 1);
      arr.push({
        seed: i + 1,
        position: [(t - 0.5) * 1.6, (Math.sin(i * 2.4) * 1.1), (Math.cos(i * 1.7) - 0.5) * 1.4],
        rotation: [Math.sin(i) * 0.3, Math.cos(i * 0.7) * 0.5, i * 0.18],
        radius: 0.032 + (i % 3) * 0.01,
        amp: 0.12 + (i % 4) * 0.03,
        flowSpeed: 0.14 + (i % 3) * 0.05,
        opacity: 0.55 + (i % 3) * 0.14
      });
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.count]);

  return (
    <Canvas
      dpr={preset.dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 6.4], fov: 42, near: 0.1, far: 30 }}
      style={{ pointerEvents: reducedInteraction ? "none" : "auto" }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={0.8} color="#f4ead2" />
      <directionalLight position={[-4, -2, -3]} intensity={0.35} color="#8c7c5e" />

      <FiberGroup scrollProgress={scrollProgress}>
        {strands.map((s) => (
          <FiberStrand
            key={s.seed}
            seed={s.seed}
            length={4.4}
            segments={preset.segments}
            radialSegments={preset.radialSegments}
            radius={s.radius}
            amp={s.amp}
            flowSpeed={s.flowSpeed}
            opacity={s.opacity}
            position={s.position}
            rotation={s.rotation}
            colorBase="#221d16"
            colorRim="#c9b58e"
          />
        ))}
      </FiberGroup>
    </Canvas>
  );
}
