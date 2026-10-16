'use client';
import { useEffect, useRef } from 'react';

// One canvas pixel per halftone cell; CSS scales it up and punches the dots.
const CELL = 6;

const VERTEX = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Smooth gradient noise folded into bands, like the earlier SVG turbulence look.
const FRAGMENT = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
uniform float u_hover;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 grad(vec2 i) {
  float a = hash(i) * 6.2831853;
  return vec2(cos(a), sin(a));
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = dot(grad(i), f);
  float b = dot(grad(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
  float c = dot(grad(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
  float d = dot(grad(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
  return 0.5 + 0.7 * mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 d = uv - u_mouse;
  d.x *= aspect;
  float pull = exp(-dot(d, d) * 4.0) * u_hover;
  float t = u_time;
  // Fixed frequency per halftone cell keeps the pattern the same at any size.
  vec2 p = gl_FragCoord.xy * vec2(0.021, 0.046);
  p -= d * pull * 0.9;
  p += (u_mouse - 0.5) * vec2(0.9, 0.6) * u_hover;
  float n = 0.66 * noise(p + vec2(t * 0.045, t * 0.02))
          + 0.34 * noise(p * 2.0 + vec2(-t * 0.03, t * 0.05) + 7.3);
  float v = 0.5 + 0.5 * sin(n * 31.0 + t * 0.45 + pull * 4.0);
  v = smoothstep(0.08, 0.92, v) + pull * 0.35;
  gl_FragColor = vec4(vec3(clamp(v, 0.0, 1.0)), 1.0);
}
`;

function shader(gl: WebGLRenderingContext, type: number, source: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, source);
  gl.compileShader(s);
  return s;
}

export default function LiquidCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.closest<HTMLElement>('[data-liquid]');
    const gl = canvas?.getContext('webgl', {
      antialias: false,
      depth: false,
      powerPreference: 'low-power',
    });
    if (!canvas || !host || !gl) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    // WebGL's useProgram, not a React hook.
    // oxlint-disable-next-line react/react-compiler
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const pos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(program, 'u_res');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uMouse = gl.getUniformLocation(program, 'u_mouse');
    const uHover = gl.getUniformLocation(program, 'u_hover');

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, hover: 0, th: 0 };
    let visible = false;
    let frame = 0;
    let time = 8;
    let last = performance.now();

    const still = () =>
      reduced.matches || Boolean(canvas.closest('.motion-paused'));
    const draw = () => {
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uHover, mouse.hover);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const tick = (now: number) => {
      frame = 0;
      const dt = Math.min(now - last, 50) / 1000;
      last = now;
      const ease = 1 - Math.pow(0.002, dt);
      mouse.x += (mouse.tx - mouse.x) * ease;
      mouse.y += (mouse.ty - mouse.y) * ease;
      mouse.hover += (mouse.th - mouse.hover) * ease;
      time += dt;
      draw();
      if (visible && !still()) frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame || !visible) return;
      if (still()) return draw();
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      const box = canvas.parentElement!.getBoundingClientRect();
      canvas.width = Math.max(1, Math.ceil(box.width / CELL));
      canvas.height = Math.max(1, Math.ceil(box.height / CELL));
      canvas.style.width = `${canvas.width * CELL}px`;
      canvas.style.height = `${canvas.height * CELL}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      draw();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const box = host.getBoundingClientRect();
      mouse.tx = (event.clientX - box.left) / box.width;
      mouse.ty = 1 - (event.clientY - box.top) / box.height;
      mouse.th = 1;
      start();
    };
    const leave = () => {
      mouse.th = 0;
      start();
    };
    const sizer = new ResizeObserver(resize);
    sizer.observe(canvas.parentElement!);
    const watcher = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    watcher.observe(canvas);
    // Resume when the visitor turns motion back on.
    const toggles = new MutationObserver(start);
    const main = canvas.closest('main');
    if (main) toggles.observe(main, { attributeFilter: ['class'] });
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    resize();
    return () => {
      cancelAnimationFrame(frame);
      sizer.disconnect();
      watcher.disconnect();
      toggles.disconnect();
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
    };
  }, []);
  return <canvas ref={ref} className="liquid-canvas" aria-hidden="true" />;
}
