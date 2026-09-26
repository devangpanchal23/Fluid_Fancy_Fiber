import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import FiberStrand from "./FiberStrand";

// Drag-to-rotate for the cluster: pointer down+move rotates the group
// (horizontal drag -> Y rotation, vertical drag -> clamped X rotation, so it
// can't be spun upside down), with a light damped spin before the first
// interaction so the cluster doesn't sit dead-still, and inertia that decays
// after release rather than stopping dead. Hand-rolled rather than pulling
// in @react-three/drei's OrbitControls for a handful of lines of pointer
// math on one small group.
function DragRotate({ children, autoSpin = 0.06 }) {
  const group = useRef(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const velocity = useRef({ x: 0, y: 0 });
  const interacted = useRef(false);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;

    if (!interacted.current) {
      g.rotation.y += autoSpin * delta;
      return;
    }

    if (!dragging.current) {
      g.rotation.y += velocity.current.x * delta;
      g.rotation.x += velocity.current.y * delta;
      velocity.current.x *= 0.92;
      velocity.current.y *= 0.92;
      g.rotation.x = Math.max(-0.9, Math.min(0.9, g.rotation.x));
    }
  });

  const onPointerDown = (ev) => {
    interacted.current = true;
    dragging.current = true;
    last.current = { x: ev.clientX, y: ev.clientY };
    ev.target.setPointerCapture?.(ev.pointerId);
  };
  const onPointerMove = (ev) => {
    if (!dragging.current) return;
    const dx = ev.clientX - last.current.x;
    const dy = ev.clientY - last.current.y;
    last.current = { x: ev.clientX, y: ev.clientY };
    const g = group.current;
    if (!g) return;
    g.rotation.y += dx * 0.006;
    g.rotation.x = Math.max(-0.9, Math.min(0.9, g.rotation.x + dy * 0.006));
    velocity.current = { x: dx * 0.12, y: dy * 0.12 };
  };
  const onPointerUp = () => {
    dragging.current = false;
  };

  return (
    <group
      ref={group}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerOut={onPointerUp}
    >
      {children}
    </group>
  );
}

export default function MaterialExplorerScene({ quality = "high" }) {
  const segments = quality === "low" ? 32 : quality === "medium" ? 48 : 64;
  const radialSegments = quality === "low" ? 5 : quality === "medium" ? 6 : 8;
  const dpr = quality === "low" ? [1, 1] : quality === "medium" ? [1, 1.5] : [1, 2];

  const strands = useMemo(
    () => [
      { seed: 101, position: [-0.4, 0.15, 0], rotation: [0.1, 0.3, 0], radius: 0.06 },
      { seed: 102, position: [0.35, -0.1, 0.2], rotation: [-0.15, -0.4, 0.2], radius: 0.05 },
      { seed: 103, position: [0, 0.05, -0.3], rotation: [0.25, 0.1, -0.15], radius: 0.045 }
    ],
    []
  );

  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 4.4], fov: 40, near: 0.1, far: 20 }}
      style={{ touchAction: "none", cursor: "grab" }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 4, 5]} intensity={0.85} color="#f4ead2" />
      <directionalLight position={[-3, -2, -3]} intensity={0.3} color="#8c7c5e" />

      <DragRotate>
        {strands.map((s) => (
          <FiberStrand
            key={s.seed}
            seed={s.seed}
            length={2.6}
            segments={segments}
            radialSegments={radialSegments}
            radius={s.radius}
            amp={0.1}
            flowSpeed={0.16}
            opacity={0.9}
            position={s.position}
            rotation={s.rotation}
            colorBase="#221d16"
            colorRim="#c9b58e"
          />
        ))}
      </DragRotate>
    </Canvas>
  );
}
