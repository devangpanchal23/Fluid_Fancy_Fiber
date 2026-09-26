import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";
import { fiberVertexShader, fiberFragmentShader } from "./fiberShader";

// Deterministic PRNG (mulberry32) so a given `seed` always produces the same
// strand shape — reloading the page shouldn't reshuffle the whole hero.
function mulberry32(seed) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// One flowing filament: a gently curved tube whose waypoints come from a
// seeded 3D noise field (so strands read as organic material fibers, not
// straight rods or random zigzags), then displaced further per-frame on the
// GPU by fiberShader's own noise pass.
export default function FiberStrand({
  seed = 0,
  radius = 0.045,
  length = 5.2,
  segments = 64,
  radialSegments = 8,
  colorBase = "#17140f",
  colorRim = "#b9a684",
  amp = 0.16,
  freq = 0.6,
  flowSpeed = 0.18,
  opacity = 0.85,
  position = [0, 0, 0],
  rotation = [0, 0, 0]
}) {
  const materialRef = useRef(null);

  const geometry = useMemo(() => {
    const rand = mulberry32(seed * 7919 + 1);
    const noise3D = createNoise3D(rand);
    const waypoints = [];
    const count = 7;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = (t - 0.5) * length;
      const y = noise3D(t * 1.4, seed * 0.31, 0) * (length * 0.22);
      const z = noise3D(t * 1.4, seed * 0.31, 50) * (length * 0.16);
      waypoints.push(new THREE.Vector3(x, y, z));
    }
    const curve = new THREE.CatmullRomCurve3(waypoints, false, "catmullrom", 0.4);
    const geo = new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);
    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, length, radius, segments, radialSegments]);

  // PHASE 11 — memory: TubeGeometry is built manually (new THREE.TubeGeometry
  // in the useMemo above), not declared as JSX, so R3F's own automatic
  // disposal doesn't cover it. Dispose the GPU buffers explicitly whenever
  // this geometry is replaced (the useMemo deps above change) or the strand
  // unmounts (e.g. the material explorer's lazy-mounted canvas going in and
  // out of view under PHASE 11's frameloop gating) — otherwise every remount
  // leaks the previous geometry's buffers, which JS garbage collection alone
  // cannot free.
  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: amp },
      uFreq: { value: freq },
      uFlowSpeed: { value: flowSpeed },
      uSeed: { value: seed * 12.9 },
      uColorBase: { value: new THREE.Color(colorBase) },
      uColorRim: { value: new THREE.Color(colorRim) },
      uOpacity: { value: opacity }
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed]
  );

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh geometry={geometry} position={position} rotation={rotation}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={fiberVertexShader}
        fragmentShader={fiberFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
