'use client';
import { useEffect, useRef } from 'react';

// Scroll-driven intro: two chrome halves meet, then the knot settles beside
// the title and keeps turning. Positions are computed every frame, so the
// motion is continuous at any scroll speed.
const JOIN = 0.5; // progress at which the halves touch
const SETTLE = 0.62; // progress after which the knot drifts to its spot

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
const span = (p: number, a: number, b: number) => clamp((p - a) / (b - a));

export default function IntroKnot() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const intro = canvas?.closest<HTMLElement>('.intro');
    if (!canvas || !intro) return;
    let disposed = false;
    let cleanup = () => {};

    import('three')
      .then((THREE) => {
        if (disposed) return;
        let renderer: InstanceType<typeof THREE.WebGLRenderer>;
        try {
          renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: window.devicePixelRatio < 2,
            powerPreference: 'high-performance',
          });
        } catch {
          intro.classList.add('intro-off');
          return;
        }
        renderer.setClearColor(0x000000, 0);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;

        // Studio for the chrome to reflect: a graded dome with a bright horizon
        // band, plus strip lights that read as long highlights.
        const studio = new THREE.Scene();
        const domeGeo = new THREE.SphereGeometry(20, 48, 64);
        const ramp: [number, number][] = [
          [-1, 0.0],
          [-0.25, 0.03],
          [-0.04, 0.12],
          [0.0, 1.6],
          [0.05, 0.16],
          [0.3, 0.08],
          [0.6, 0.45],
          [1, 1.2],
        ];
        const shade = (y: number) => {
          for (let i = 1; i < ramp.length; i++) {
            const [y1, v1] = ramp[i];
            const [y0, v0] = ramp[i - 1];
            if (y <= y1) return v0 + ((y - y0) / (y1 - y0)) * (v1 - v0);
          }
          return ramp[ramp.length - 1][1];
        };
        const domePos = domeGeo.attributes.position;
        const colors = new Float32Array(domePos.count * 3);
        for (let i = 0; i < domePos.count; i++) {
          const v = shade(domePos.getY(i) / 20);
          colors.set([v, v, v * 1.02], i * 3);
        }
        domeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        studio.add(
          new THREE.Mesh(
            domeGeo,
            new THREE.MeshBasicMaterial({
              vertexColors: true,
              side: THREE.BackSide,
            }),
          ),
        );
        const glow = (value: number) =>
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(value, value, value),
            side: THREE.DoubleSide,
          });
        const strip = (
          w: number,
          h: number,
          value: number,
          pos: [number, number, number],
        ) => {
          const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            glow(value),
          );
          mesh.position.set(...pos);
          mesh.lookAt(0, 0, 0);
          studio.add(mesh);
        };
        strip(1.6, 10, 5, [-7, 1, 4]);
        strip(1.2, 10, 7, [7, 1.5, -2]);
        strip(8, 2.5, 3, [0, 8, 2]);
        strip(3, 3, 4, [-2, 1, -7]);
        strip(0.8, 7, 3, [4, -2, 7]);
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envMap = pmrem.fromScene(studio, 0.02).texture;

        const scene = new THREE.Scene();
        scene.environment = envMap;
        const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        camera.position.set(0, 0, 10);

        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          metalness: 1,
          roughness: 0.07,
          envMapIntensity: 1,
        });

        // Trefoil torus knot, split at its leftmost and rightmost points. Each
        // half arrives as a straight rod from its side, then coils into place.
        const knot = (t: number) => {
          const a = t * Math.PI * 2;
          const r = 1 + 0.42 * Math.cos(3 * a);
          return new THREE.Vector3(
            r * Math.cos(2 * a),
            r * Math.sin(2 * a),
            0.42 * Math.sin(3 * a),
          );
        };
        const RADIUS = 0.2;
        const RINGS = 220;
        const SIDES = 28;

        let tLeft = 0;
        let tRight = 0;
        for (let i = 0, minX = Infinity, maxX = -Infinity; i < 2000; i++) {
          const x = knot(i / 2000).x;
          if (x < minX) [minX, tLeft] = [x, i / 2000];
          if (x > maxX) [maxX, tRight] = [x, i / 2000];
        }

        // RINGS + 1 points spaced evenly by arc length along part of the knot.
        const knotPart = (from: number, to: number) => {
          const dense = Array.from({ length: 2001 }, (_, i) =>
            knot(from + ((to - from) * i) / 2000),
          );
          const cum = [0];
          for (let k = 1; k < dense.length; k++)
            cum.push(cum[k - 1] + dense[k].distanceTo(dense[k - 1]));
          const length = cum[cum.length - 1];
          const pts: InstanceType<typeof THREE.Vector3>[] = [];
          for (let n = 0, k = 0; n <= RINGS; n++) {
            const target = (length * n) / RINGS;
            while (k < dense.length - 2 && cum[k + 1] < target) k++;
            const w = clamp((target - cum[k]) / (cum[k + 1] - cum[k] || 1));
            pts.push(dense[k].clone().lerp(dense[k + 1], w));
          }
          return { pts, length };
        };

        const assembly = new THREE.Group();
        scene.add(assembly);
        const cap = new THREE.SphereGeometry(1, 32, 16);
        // side: -1 comes from the left, 1 from the right.
        const makeRod = (part: ReturnType<typeof knotPart>, side: number) => {
          const count = (RINGS + 1) * (SIDES + 1);
          const position = new Float32Array(count * 3);
          const normals = new Float32Array(count * 3);
          const index: number[] = [];
          for (let i = 0; i < RINGS; i++)
            for (let j = 0; j < SIDES; j++) {
              const a = i * (SIDES + 1) + j;
              const b = a + SIDES + 1;
              index.push(a, b, a + 1, b, b + 1, a + 1);
            }
          const geo = new THREE.BufferGeometry();
          const posAttr = new THREE.BufferAttribute(position, 3).setUsage(
            THREE.DynamicDrawUsage,
          );
          const norAttr = new THREE.BufferAttribute(normals, 3).setUsage(
            THREE.DynamicDrawUsage,
          );
          geo.setAttribute('position', posAttr);
          geo.setAttribute('normal', norAttr);
          geo.setIndex(index);
          const mesh = new THREE.Mesh(geo, material);
          mesh.frustumCulled = false;
          const tail = new THREE.Mesh(cap, material);
          const head = new THREE.Mesh(cap, material);
          assembly.add(mesh, tail, head);

          const line = Array.from(
            { length: RINGS + 1 },
            () => new THREE.Vector3(),
          );
          const t = new THREE.Vector3();
          const n = new THREE.Vector3();
          const b = new THREE.Vector3();
          const straight = new THREE.Vector3();
          let last = '';
          // headX: where the straight rod's head is; coil: 0 straight .. 1 knotted.
          return (headX: number, coil: number) => {
            const key = `${headX.toFixed(5)}:${coil.toFixed(5)}`;
            if (key === last) return;
            last = key;
            for (let i = 0; i <= RINGS; i++) {
              const u = i / RINGS;
              straight.set(
                headX + side * part.length * (1 - u),
                side * -0.22,
                0,
              );
              // The head coils first and the rest of the rod follows it in.
              const k = clamp(coil * 1.8 - (1 - u) * 0.8);
              const blend = k * k * (3 - 2 * k);
              const pt = line[i].copy(straight).lerp(part.pts[i], blend);
              // Corkscrew twist while the rod is between straight and knotted.
              const twist = Math.sin(Math.PI * blend) * 1.4 * side;
              const cy = pt.y;
              const cz = pt.z;
              pt.y = cy * Math.cos(twist) - cz * Math.sin(twist);
              pt.z = cy * Math.sin(twist) + cz * Math.cos(twist);
            }
            // Parallel-transport frames along the current centre line.
            n.set(0, 0, 1);
            const taper = 1 - coil * coil * coil;
            for (let i = 0; i <= RINGS; i++) {
              t.copy(line[Math.min(i + 1, RINGS)])
                .sub(line[Math.max(i - 1, 0)])
                .normalize();
              n.addScaledVector(t, -n.dot(t));
              if (n.lengthSq() < 1e-8) n.set(0, 1, 0).addScaledVector(t, -t.y);
              n.normalize();
              b.crossVectors(t, n);
              const r = RADIUS;
              const pt = line[i];
              for (let j = 0; j <= SIDES; j++) {
                const th = (j / SIDES) * Math.PI * 2;
                const c = Math.cos(th);
                const sn = Math.sin(th);
                const dx = c * n.x + sn * b.x;
                const dy = c * n.y + sn * b.y;
                const dz = c * n.z + sn * b.z;
                const o = (i * (SIDES + 1) + j) * 3;
                normals[o] = dx;
                normals[o + 1] = dy;
                normals[o + 2] = dz;
                position[o] = pt.x + dx * r;
                position[o + 1] = pt.y + dy * r;
                position[o + 2] = pt.z + dz * r;
              }
              // Round tips while apart; they sink into the tube as the ends meet.
              const tip = r * Math.min(1, taper * 6);
              if (i === 0) {
                tail.position.copy(pt);
                tail.scale.setScalar(tip);
              }
              if (i === RINGS) {
                head.position.copy(pt);
                head.scale.setScalar(tip);
              }
            }
            posAttr.needsUpdate = true;
            norAttr.needsUpdate = true;
          };
        };
        const leftRod = makeRod(
          knotPart(tLeft, tRight > tLeft ? tRight : tRight + 1),
          -1,
        );
        const rightRod = makeRod(
          knotPart(tRight, tLeft > tRight ? tLeft : tLeft + 1),
          1,
        );

        const state = {
          progress: 0,
          target: 0,
          mx: 0,
          my: 0,
          tmx: 0,
          tmy: 0,
          flash: 0,
          joined: false,
          visible: true,
          spin: 0,
        };
        const reduced = matchMedia('(prefers-reduced-motion: reduce)');
        const still = () =>
          reduced.matches || Boolean(canvas.closest('.motion-paused'));

        const measure = () => {
          const box = intro.getBoundingClientRect();
          const travel = intro.offsetHeight - window.innerHeight;
          state.target = travel > 0 ? clamp(-box.top / travel) : 1;
        };
        const resize = () => {
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          const mobile = w < 700;
          renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, mobile ? 1.5 : 1.75),
          );
          renderer.setSize(w, h, false);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        };

        // Screen point (0..1) to world position on the z = 0 plane.
        const toWorld = (sx: number, sy: number) => {
          const v = new THREE.Vector3(sx * 2 - 1, -(sy * 2 - 1), 0.5);
          v.unproject(camera);
          const dir = v.sub(camera.position).normalize();
          const dist = -camera.position.z / dir.z;
          return camera.position.clone().add(dir.multiplyScalar(dist));
        };

        const spinQ = new THREE.Quaternion();
        const spinAxis = new THREE.Vector3(0.3, 1, 0.15).normalize();
        const tilt = new THREE.Euler();
        const tiltQ = new THREE.Quaternion();
        let last = performance.now();
        let frame = 0;

        const render = (now: number) => {
          frame = 0;
          const dt = Math.min(now - last, 60) / 1000;
          last = now;
          const calm = still();
          if (calm) state.target = 1;
          // Ease toward the scroll position instead of snapping to it.
          const k = 1 - Math.exp(-dt * (calm ? 60 : 7));
          state.progress += (state.target - state.progress) * k;
          state.mx += (state.tmx - state.mx) * (1 - Math.exp(-dt * 4));
          state.my += (state.tmy - state.my) * (1 - Math.exp(-dt * 4));

          const p = state.progress;
          // Rods slide in straight first, then coil into the knot.
          const slide = ease(span(p, 0, 0.2));
          const coilRaw = span(p, 0.14, JOIN);
          const join = coilRaw * coilRaw * (3 - 2 * coilRaw);
          // The knot only starts turning once the worms have closed it.
          if (!calm) state.spin += dt * 0.35 * Math.pow(join, 6);
          const settle = ease(span(p, SETTLE, 1));
          const mobile = canvas.clientWidth < 700;

          // Centre while assembling, then beside the title.
          const centre = toWorld(0.5, 0.5);
          const spot = mobile ? toWorld(0.66, 0.3) : toWorld(0.74, 0.42);
          const pos = centre.lerp(spot, settle);
          const scale =
            (mobile ? 0.72 : 1) * (1 - settle * (mobile ? 0.42 : 0.3));

          tilt.set(state.my * 0.35, state.mx * 0.5, 0);
          tiltQ.setFromEuler(tilt);
          spinQ.setFromAxisAngle(spinAxis, state.spin);
          assembly.quaternion.copy(tiltQ.multiply(spinQ));
          assembly.position.set(pos.x, pos.y, 0);
          assembly.scale.setScalar(scale);

          // Heads start just inside the screen edges and stop near the centre.
          const edge = (toWorld(1, 0.5).x - centre.x) / scale;
          const reach = edge - 0.6 + (0.3 - edge + 0.6) * slide;
          leftRod(-reach, join);
          rightRod(reach, join);

          // A burst of light along the seam when the halves meet.
          if (join > 0.995 && !state.joined) {
            state.joined = true;
            state.flash = 1;
            intro.classList.add('is-joined');
          } else if (join < 0.9 && state.joined) {
            state.joined = false;
            intro.classList.remove('is-joined');
          }
          state.flash *= Math.exp(-dt * 2.6);
          material.envMapIntensity = 1 + state.flash * 1.8;
          intro.classList.toggle('is-settled', settle > 0.35);

          renderer.render(scene, camera);
          const moving =
            Math.abs(state.target - state.progress) > 0.0005 ||
            state.flash > 0.01 ||
            !calm;
          if (state.visible && moving) frame = requestAnimationFrame(render);
        };
        const wake = () => {
          if (!frame && state.visible) {
            last = performance.now();
            frame = requestAnimationFrame(render);
          }
        };

        const onScroll = () => {
          measure();
          wake();
        };
        const onMove = (event: PointerEvent) => {
          if (event.pointerType !== 'mouse') return;
          state.tmx = event.clientX / window.innerWidth - 0.5;
          state.tmy = event.clientY / window.innerHeight - 0.5;
          wake();
        };
        const watcher = new IntersectionObserver(([entry]) => {
          state.visible = entry.isIntersecting;
          if (state.visible) wake();
          else if (frame) {
            cancelAnimationFrame(frame);
            frame = 0;
          }
        });
        watcher.observe(canvas);
        const sizer = new ResizeObserver(() => {
          resize();
          measure();
          wake();
        });
        sizer.observe(canvas);
        const toggles = new MutationObserver(wake);
        const main = canvas.closest('main');
        if (main) toggles.observe(main, { attributeFilter: ['class'] });
        addEventListener('scroll', onScroll, { passive: true });
        addEventListener('pointermove', onMove, { passive: true });

        resize();
        measure();
        state.progress = state.target;
        // Compile shaders before the first visible frame to avoid a hitch.
        renderer.compile(scene, camera);
        intro.classList.add('intro-ready');
        wake();

        cleanup = () => {
          cancelAnimationFrame(frame);
          watcher.disconnect();
          sizer.disconnect();
          toggles.disconnect();
          removeEventListener('scroll', onScroll);
          removeEventListener('pointermove', onMove);
          scene.traverse((o) => {
            if (o instanceof THREE.Mesh) o.geometry.dispose();
          });
          material.dispose();
          envMap.dispose();
          pmrem.dispose();
          renderer.dispose();
        };
      })
      // If three.js fails to load, fall back to the static hero.
      .catch(() => intro.classList.add('intro-off'));

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return <canvas ref={ref} className="intro-canvas" aria-hidden="true" />;
}
