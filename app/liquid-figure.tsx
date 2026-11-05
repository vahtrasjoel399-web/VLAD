'use client';
import { useEffect, useRef } from 'react';

// Liquid chrome figure beside the home title. One body made of drops. A slow
// cursor nearby draws a tendril toward it, a fast swipe splashes the drops
// apart, a click or tap bursts them, and they pull each other back into one
// blob. On its own it breathes and pulses now and then. The surface is ray-marched on the GPU in a small
// canvas over the .chrome image slot, so it stays light; the drop physics is
// a few lines of CPU work per frame.

const COUNT = 16;
// The last SATELLITES drops orbit on their own instead of joining the body.
const SATELLITES = 2;

const VERT = `#version 300 es
in vec2 pos;
void main() { gl_Position = vec4(pos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec4 uBalls[${COUNT}];
uniform vec4 uBound; // xyz centre, w radius of a sphere holding every drop
uniform mat3 uRot;
uniform float uTime;
uniform float uEnergy; // 0 calm .. 1 just splashed: surface ripples
out vec4 color;

const float K = 0.34; // how eagerly drops melt into each other
const vec3 RO = vec3(0.0, 0.0, 6.0);
const float FOCAL = 1.5;

float smin(float a, float b) {
  float h = max(K - abs(a - b), 0.0) / K;
  return min(a, b) - h * h * K * 0.25;
}
float blobs(vec3 p) {
  float d = 1e9;
  for (int i = 0; i < ${COUNT}; i++) d = smin(d, length(p - uBalls[i].xyz) - uBalls[i].w);
  return d;
}
// Liquid surface: a slow swell plus ripples that flare up after a splash.
float map(vec3 p) {
  float w = sin(p.x * 5.0 + uTime * 1.7) * sin(p.y * 4.3 - uTime * 1.3) * sin(p.z * 4.7 + uTime);
  float rip = sin(length(p.xy) * 18.0 - uTime * 9.0);
  return blobs(p) + w * 0.012 + rip * 0.009 * uEnergy;
}
vec3 normalAt(vec3 p) {
  const vec2 e = vec2(1.0, -1.0) * 0.0015;
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) +
                   e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}
// Studio for the chrome to reflect: dark floor, bright horizon band, dim
// sky, plus long strip lights (same set-up as the old 3D intro).
float strip(vec3 r, float az, float width, float y0, float y1, float power) {
  float a = atan(r.x, r.z);
  float d = abs(mod(a - az + 3.14159, 6.28318) - 3.14159);
  return power * exp(-pow(d / width, 2.0)) * smoothstep(y0 - 0.05, y0, r.y) * (1.0 - smoothstep(y1, y1 + 0.05, r.y));
}
vec3 env(vec3 r) {
  // The studio turns slowly, so highlights slide even at rest.
  float s = uTime * 0.07;
  r.xz = mat2(cos(s), -sin(s), sin(s), cos(s)) * r.xz;
  float y = r.y;
  float v = y < -0.04 ? mix(0.0, 0.12, smoothstep(-1.0, -0.04, y))
          : y < 0.0 ? mix(0.12, 1.6, smoothstep(-0.04, 0.0, y))
          : y < 0.05 ? mix(1.6, 0.16, smoothstep(0.0, 0.05, y))
          : y < 0.3 ? mix(0.16, 0.08, smoothstep(0.05, 0.3, y))
          : mix(0.08, 1.2, smoothstep(0.3, 1.0, y));
  v += strip(r, -1.05, 0.09, -0.3, 0.7, 5.0);
  v += strip(r, 1.85, 0.07, -0.25, 0.75, 6.0);
  v += strip(r, 0.0, 0.5, 0.75, 0.95, 2.5);
  v += strip(r, 2.9, 0.18, -0.1, 0.35, 3.0);
  v += strip(r, 0.52, 0.05, -0.55, 0.3, 2.5);
  return vec3(v, v, v * 1.02);
}
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 ro = uRot * RO;
  vec3 rd = uRot * normalize(vec3(uv, -FOCAL));
  // Skip rays that miss every drop.
  vec3 oc = ro - uBound.xyz;
  float b = dot(oc, rd);
  float h = b * b - dot(oc, oc) + uBound.w * uBound.w;
  if (h < 0.0) { color = vec4(0.0); return; }
  // (The bound includes a margin for the glow.)
  h = sqrt(h);
  float t = max(-b - h, 0.0);
  float tEnd = -b + h;
  float pix = 1.0 / (FOCAL * uRes.y);
  float best = 1e9;
  float bestT = t;
  bool hit = false;
  for (int i = 0; i < 90; i++) {
    float d = map(ro + rd * t);
    if (d < best) { best = d; bestT = t; }
    if (d < 0.0008 * t) { hit = true; break; }
    t += d * 0.9; // ripples bend the distance field a little: step short
    if (t > tEnd) break;
  }
  // Soft glow around the liquid, from how close the ray came.
  float glow = exp(-max(best, 0.0) * 7.0) * 0.22;
  // Soft, anti-aliased silhouette from the nearest approach.
  float edge = pix * bestT * 1.5;
  float alpha = hit ? 1.0 : 1.0 - smoothstep(0.0, edge, best);
  if (alpha <= 0.0) {
    color = vec4(vec3(glow), glow);
    return;
  }
  vec3 p = ro + rd * (hit ? t : bestT);
  vec3 n = normalAt(p);
  vec3 r = reflect(rd, n);
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 4.0);
  // Cheap occlusion: darker in the creases where drops merge.
  float ao = clamp(blobs(p + n * 0.14) / 0.14, 0.0, 1.0);
  vec3 c = env(r) * (0.8 + 0.35 * fres) * mix(0.45, 1.0, ao);
  // A hard key light for sparkling pin-point highlights.
  vec3 key = normalize(vec3(-0.5, 0.65, 0.55));
  c += vec3(pow(max(dot(r, key), 0.0), 380.0) * 6.0);
  c = pow(aces(c * 1.05), vec3(1.0 / 2.2));
  color = vec4(c * alpha + vec3(glow) * (1.0 - alpha), alpha + glow * (1.0 - alpha));
}`;

type Drop = {
  p: [number, number, number];
  v: [number, number, number];
  home: [number, number, number];
  r: number;
  phase: number;
  // 1 right after a splash: the drop flies free, then slowly sticks again.
  free: number;
};

export default function LiquidFigure() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const hero = canvas?.closest<HTMLElement>('.hero');
    if (!canvas || !hero) return;
    const slot = hero.querySelector<HTMLElement>('.chrome');
    hero.classList.add('has-figure');
    const fail = () => hero.classList.add('figure-off');

    const gl = canvas.getContext('webgl2', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
    if (!gl) {
      fail();
      return;
    }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      fail();
      return;
    }
    // oxlint-disable-next-line react/react-compiler -- WebGL call, not a React hook
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'pos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {
      res: gl.getUniformLocation(program, 'uRes'),
      balls: gl.getUniformLocation(program, 'uBalls'),
      bound: gl.getUniformLocation(program, 'uBound'),
      rot: gl.getUniformLocation(program, 'uRot'),
      time: gl.getUniformLocation(program, 'uTime'),
      energy: gl.getUniformLocation(program, 'uEnergy'),
    };

    // Drops in object space; the canvas shows about -2..2 vertically.
    const drops: Drop[] = Array.from({ length: COUNT }, (_, i) => {
      const a = (i / COUNT) * Math.PI * 2;
      const home: [number, number, number] = [
        Math.cos(a) * 0.48,
        Math.sin(a * 1.3) * 0.36,
        Math.sin(a) * 0.3,
      ];
      const r = i >= COUNT - SATELLITES ? 0.15 : i < 2 ? 0.5 : i < 8 ? 0.4 : 0.3;
      return { p: [...home], v: [0, 0, 0], home, r, phase: i * 1.9, free: 0 };
    });
    const ballData = new Float32Array(COUNT * 4);

    const state = {
      time: 0,
      visible: true,
      mx: 0,
      my: 0,
      tmx: 0,
      tmy: 0,
      // Cursor on the z = 0 plane in object space, and its speed.
      px: 0,
      py: 0,
      speed: 0,
      pointerAt: -1,
      lastPX: 0,
      lastPY: 0,
      lastMoveAt: 0,
      // Splash energy for the ripples, and the next idle pulse.
      energy: 0,
      nextPulse: 2.5,
      // Burst at a point (click/tap or idle pulse) waiting to be applied.
      burst: null as null | { x: number; y: number; power: number },
    };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const still = () => reduced.matches || Boolean(canvas.closest('.motion-paused'));

    // The canvas covers the slot's layout box (ignores CSS transforms),
    // padded so splashing drops are not clipped.
    const PAD = 0.2;
    const resize = () => {
      if (slot && slot.offsetHeight > 0) {
        const sw = slot.offsetWidth;
        const sh = slot.offsetHeight;
        const side = Math.min(sw, sh) * (1 + PAD * 2);
        canvas.style.left = `${slot.offsetLeft + sw / 2 - side / 2}px`;
        canvas.style.top = `${slot.offsetTop + sh / 2 - side / 2}px`;
        canvas.style.width = canvas.style.height = `${side}px`;
      }
      const dpr = Math.min(window.devicePixelRatio, 1.5);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.res, canvas.width, canvas.height);
    };

    // Screen point to object space on the z = 0 plane (camera at z 6, focal
    // 1.5: the plane spans -2..2 across the canvas height).
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        state.tmx = event.clientX / window.innerWidth - 0.5;
        state.tmy = event.clientY / window.innerHeight - 0.5;
      }
      const box = canvas.getBoundingClientRect();
      if (!box.height) return;
      const x = ((event.clientX - box.left - box.width / 2) / box.height) * 4;
      const y = (-(event.clientY - box.top - box.height / 2) / box.height) * 4;
      const now = performance.now();
      const dt = (now - state.lastMoveAt) / 1000;
      if (dt > 0 && dt < 0.2) {
        const v = Math.hypot(x - state.lastPX, y - state.lastPY) / dt;
        state.speed = Math.max(state.speed * 0.6, v);
      }
      state.lastPX = state.px = x;
      state.lastPY = state.py = y;
      state.lastMoveAt = state.pointerAt = now;
      wake();
    };
    const onLeave = () => {
      state.pointerAt = -1;
    };
    const onDown = (event: PointerEvent) => {
      onMove(event);
      const d = Math.hypot(state.px, state.py);
      if (d < 1.8) state.burst = { x: state.px, y: state.py, power: 1 };
    };

    let last = performance.now();
    let frame = 0;
    const WALL = [1.45, 1.45, 0.9];

    const step = (dt: number) => {
      const t = state.time;
      let cx = 0;
      let cy = 0;
      let cz = 0;
      for (const d of drops) {
        cx += d.p[0];
        cy += d.p[1];
        cz += d.p[2];
      }
      cx /= COUNT;
      cy /= COUNT;
      cz /= COUNT;
      const near = state.pointerAt > 0 && performance.now() - state.pointerAt < 600;
      // Idle pulse: every few seconds a soft burst from inside the body.
      if (t > state.nextPulse) {
        state.nextPulse = t + 6 + Math.random() * 4;
        if (performance.now() - state.pointerAt > 2500)
          state.burst = { x: cx, y: cy, power: 0.35 };
      }
      const burst = state.burst;
      state.burst = null;
      for (const [i, d] of drops.entries()) {
        const satellite = i >= COUNT - SATELLITES;
        // Home drifts so the body keeps churning; satellites orbit wide.
        const a = t * (satellite ? 0.5 + i * 0.07 : 0.35) + d.phase;
        const home = satellite
          ? [Math.cos(a) * 1.15, Math.sin(a * 1.2) * 0.95, Math.sin(a) * 0.5]
          : [
              d.home[0] * (1 + Math.sin(a) * 0.45),
              d.home[1] * (1 + Math.cos(a * 1.3) * 0.45),
              d.home[2] * (1 + Math.sin(a * 0.7) * 0.45),
            ];
        const centre = [cx, cy, cz];
        // Splashed drops fly free first, then pull back in.
        const grip = 1 - 0.92 * d.free;
        for (let k = 0; k < 3; k++) {
          // Pull home and toward the other drops: the "stick together" feel.
          const acc = (home[k] - d.p[k]) * 9 * grip + (satellite ? 0 : (centre[k] - d.p[k]) * 4 * grip);
          d.v[k] += acc * dt;
        }
        d.free *= Math.exp(-dt * 1.1);
        if (burst) {
          const dx = d.p[0] - burst.x;
          const dy = d.p[1] - burst.y;
          const dist = Math.hypot(dx, dy) || 1e-4;
          const ja = Math.random() * Math.PI * 2;
          const kick = burst.power * (3.2 + Math.random() * 2.4) * (satellite ? 0.3 : 1);
          d.v[0] += (dx / dist + Math.cos(ja) * 0.7) * kick;
          d.v[1] += (dy / dist + Math.sin(ja) * 0.7) * kick;
          d.v[2] += (Math.random() - 0.5) * kick;
          d.free = Math.max(d.free, burst.power);
          state.energy = Math.max(state.energy, burst.power);
        }
        // Slow cursor nearby: the closest drops reach toward it like a
        // tendril. Fast swipe: they splash out of its way.
        if (near && state.speed < 3 && !satellite) {
          const dx = state.px - d.p[0];
          const dy = state.py - d.p[1];
          const dist = Math.hypot(dx, dy);
          if (dist < 1.6 && dist > 0.15) {
            const pull = (1 - dist / 1.6) * (i % 3 === 0 ? 9 : 2.5);
            d.v[0] += (dx / dist) * pull * dt;
            d.v[1] += (dy / dist) * pull * dt;
          }
        }
        if (near && state.speed >= 3) {
          const dx = d.p[0] - state.px;
          const dy = d.p[1] - state.py;
          const dist = Math.hypot(dx, dy);
          const R = 1.0 + d.r;
          if (dist < R) {
            const force = (1 - dist / R) * (8 + Math.min(state.speed, 30) * 7);
            const nx = dist > 1e-4 ? dx / dist : Math.cos(d.phase);
            const ny = dist > 1e-4 ? dy / dist : Math.sin(d.phase);
            // Each drop also gets its own random kick, so the body breaks
            // into many drops instead of two halves.
            const ja = Math.random() * Math.PI * 2;
            const spread = 0.9;
            d.v[0] += (nx + Math.cos(ja) * spread) * force * dt;
            d.v[1] += (ny + Math.sin(ja) * spread) * force * dt;
            d.v[2] += (Math.random() - 0.5) * force * 1.2 * dt;
            d.free = Math.max(d.free, Math.min(1, state.speed / 8));
            state.energy = Math.max(state.energy, Math.min(1, state.speed / 10));
          }
        }
        const damp = Math.exp(-dt * (2.2 + (1 - d.free) * 1.4));
        for (let k = 0; k < 3; k++) {
          d.v[k] *= damp;
          d.p[k] += d.v[k] * dt;
          const lim = WALL[k] - d.r * 0.5;
          if (d.p[k] < -lim) {
            d.p[k] = -lim;
            d.v[k] *= -0.4;
          } else if (d.p[k] > lim) {
            d.p[k] = lim;
            d.v[k] *= -0.4;
          }
        }
      }
      state.speed *= Math.exp(-dt * 6);
      state.energy *= Math.exp(-dt * 1.4);
    };

    const draw = () => {
      let bx = 0;
      let by = 0;
      let bz = 0;
      drops.forEach((d, i) => {
        ballData.set([d.p[0], d.p[1], d.p[2], d.r], i * 4);
        bx += d.p[0];
        by += d.p[1];
        bz += d.p[2];
      });
      bx /= COUNT;
      by /= COUNT;
      bz /= COUNT;
      let br = 0;
      for (const d of drops)
        br = Math.max(br, Math.hypot(d.p[0] - bx, d.p[1] - by, d.p[2] - bz) + d.r);
      gl.uniform4fv(u.balls, ballData);
      gl.uniform4f(u.bound, bx, by, bz, br + 0.6);
      gl.uniform1f(u.time, state.time);
      gl.uniform1f(u.energy, state.energy);
      // Gentle tilt toward the mouse.
      const yaw = state.mx * 0.5;
      const pitch = state.my * 0.35;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      gl.uniformMatrix3fv(u.rot, false, [cy, 0, -sy, sy * sp, cp, cy * sp, sy * cp, -sp, cy * cp]);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const render = (now: number) => {
      frame = 0;
      const dt = Math.min(now - last, 50) / 1000;
      last = now;
      const calm = still();
      if (!calm) {
        state.time += dt;
        state.mx += (state.tmx - state.mx) * (1 - Math.exp(-dt * 4));
        state.my += (state.tmy - state.my) * (1 - Math.exp(-dt * 4));
        // Two half steps keep fast splashes stable.
        step(dt / 2);
        step(dt / 2);
      }
      draw();
      if (state.visible && !calm) frame = requestAnimationFrame(render);
    };
    const wake = () => {
      if (!frame && state.visible) {
        last = performance.now();
        frame = requestAnimationFrame(render);
      }
    };

    const watcher = new IntersectionObserver(([entry]) => {
      state.visible = entry.isIntersecting;
      if (state.visible) wake();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    watcher.observe(hero);
    const sizer = new ResizeObserver(() => {
      resize();
      wake();
    });
    sizer.observe(hero);
    const toggles = new MutationObserver(wake);
    const main = canvas.closest('main');
    if (main) toggles.observe(main, { attributeFilter: ['class'] });
    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('webglcontextlost', fail);

    resize();
    hero.classList.add('figure-ready');
    wake();

    return () => {
      cancelAnimationFrame(frame);
      watcher.disconnect();
      sizer.disconnect();
      toggles.disconnect();
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('webglcontextlost', fail);
      gl.deleteProgram(program);
      gl.deleteBuffer(buffer);
      hero.classList.remove('has-figure', 'figure-ready', 'figure-off');
    };
  }, []);
  return <canvas ref={ref} className="hero-figure" aria-hidden="true" />;
}
