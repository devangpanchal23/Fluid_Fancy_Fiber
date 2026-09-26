// Vertex-displaced "flowing fiber" shader. A static tube mesh (built once,
// see FiberStrand.jsx) is displaced entirely on the GPU each frame — no
// CPU-side geometry rebuilding, which is what keeps many strands cheap.
//
// The noise function is the standard Ashima Arts / MSDN-published GLSL
// simplex noise (public domain), used here to drive a continuous, organic
// "flow field" deformation rather than a mechanical sine wave.

export const simplexNoiseGLSL = /* glsl */ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }
`;

export const fiberVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  uniform float uFlowSpeed;
  uniform float uSeed;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vFlow;

  ${simplexNoiseGLSL}

  void main() {
    // uv.x runs along the strand's length — used both to drive a travelling
    // flow wave and to fade the effect at the tips so the fiber's ends stay
    // anchored instead of whipping around.
    float tip = smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x);

    vec3 seeded = position * uFreq + vec3(uSeed);
    float n = snoise(seeded + vec3(0.0, 0.0, uTime * uFlowSpeed));
    float wave = sin(uv.x * 9.0 - uTime * (uFlowSpeed * 2.2) + uSeed * 6.283);

    float displacement = (n * 0.65 + wave * 0.35) * uAmp * tip;
    vec3 displaced = position + normal * displacement;

    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    vFlow = n * 0.5 + 0.5;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const fiberFragmentShader = /* glsl */ `
  uniform vec3 uColorBase;
  uniform vec3 uColorRim;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vFlow;

  void main() {
    float fresnel = pow(1.0 - clamp(dot(normalize(vViewDir), normalize(vNormal)), 0.0, 1.0), 2.1);
    vec3 color = mix(uColorBase, uColorRim, fresnel * 0.85 + vFlow * 0.15);
    float alpha = uOpacity * (0.28 + 0.72 * fresnel);
    gl_FragColor = vec4(color, alpha);
  }
`;
