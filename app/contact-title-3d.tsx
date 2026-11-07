'use client';
import { useEffect, useRef } from 'react';
import type { BufferGeometry, Mesh, Vector3 } from 'three';

// LET'S TALK on the contacts page as 3D letters of liquid chrome. The real
// heading stays in the page (layout, search, screen readers) but turns
// transparent. Puffy extruded letters, finely tessellated and bent on the
// GPU: the surface ripples like liquid metal, the chrome stretches
// toward the cursor like a thick liquid, and a click sends a ripple through
// the whole word. Normals are rebuilt from the bent surface, so the
// reflections flow with it.

type Spring = { z: number; vz: number; r: number; vr: number; s: number; vs: number };

export default function ContactTitle3D() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const heading = canvas?.closest<HTMLElement>('.contact-heading');
    const h1 = heading?.querySelector('h1');
    if (!canvas || !heading || !h1) return;
    let disposed = false;
    let cleanup = () => {};

    void (async () => {
      const THREE = await import('three');
      const { FontLoader } = await import('three/examples/jsm/loaders/FontLoader.js');
      const { TextGeometry } = await import('three/examples/jsm/geometries/TextGeometry.js');
      const { mergeVertices } = await import('three/examples/jsm/utils/BufferGeometryUtils.js');
      const { TessellateModifier } = await import('three/examples/jsm/modifiers/TessellateModifier.js');
      const font = await new FontLoader().loadAsync('/fonts/rubik-800.typeface.json');
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
      renderer.setClearColor(0x000000, 0);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 2, 0.1, 100);

      // Studio for the reflections: the same light set as the liquid drop on
      // the home page (dark floor, bright horizon, strip lights), painted on
      // the inside of a big sphere and baked into an env map once.
      const studio = new THREE.Scene();
      studio.add(
        new THREE.Mesh(
          new THREE.SphereGeometry(50, 64, 32),
          new THREE.ShaderMaterial({
            side: THREE.BackSide,
            vertexShader: `varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
            fragmentShader: `varying vec3 vDir;
              float strip(vec3 r, float az, float width, float y0, float y1, float power) {
                float a = atan(r.x, r.z);
                float d = abs(mod(a - az + 3.14159, 6.28318) - 3.14159);
                return power * exp(-pow(d / width, 2.0)) * smoothstep(y0 - 0.05, y0, r.y) * (1.0 - smoothstep(y1, y1 + 0.05, r.y));
              }
              void main() {
                vec3 r = normalize(vDir);
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
                gl_FragColor = vec4(v, v, v * 1.02, 1.0);
              }`,
          }),
        ),
      );
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envMap = pmrem.fromScene(studio, 0.02).texture;
      scene.environment = envMap;

      const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 1,
        roughness: 0.07,
        envMapIntensity: 1.25,
        clearcoat: 0.4,
        clearcoatRoughness: 0.05,
      });

      const liquid = {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector3(99, 99, 0) },
        uHover: { value: 0 },
        uRipple: { value: new THREE.Vector4(0, 0, 0, 99) },
      };
      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, liquid);
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
            uniform float uTime;
            uniform vec3 uMouse;
            uniform float uHover;
            uniform vec4 uRipple;
            // How far a point of the surface moves (world space).
            vec3 liquidOffset(vec3 p) {
              vec3 d = vec3(
                sin(p.y * 3.1 + uTime * 1.7) * sin(p.z * 4.0 + uTime),
                sin(p.x * 2.6 - uTime * 1.3) * cos(p.z * 3.0 + uTime * 0.8),
                sin(p.x * 3.3 + p.y * 2.1 + uTime * 1.1)) * 0.04;
              // Thick liquid pulled toward the cursor and a little forward.
              vec2 m = uMouse.xy - p.xy;
              float f = exp(-dot(m, m) / 0.45) * uHover;
              d += vec3(m * 0.75, 0.55) * f;
              // Click ripple running out across the word.
              float r = length(p.xy - uRipple.xy);
              float age = uRipple.w;
              d.z += sin(r * 8.0 - age * 11.0) * exp(-r * 0.6) * exp(-age * 1.4) * 0.16 * step(age, 3.5);
              return d;
            }`,
          )
          .replace(
            '#include <normal_vertex>',
            `vec4 liquidWorld = modelMatrix * vec4(position, 1.0);
            vec3 liquidN = normalize(mat3(modelMatrix) * objectNormal);
            vec3 liquidT = normalize(cross(liquidN, abs(liquidN.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
            vec3 liquidB = cross(liquidN, liquidT);
            vec3 lp0 = liquidWorld.xyz + liquidOffset(liquidWorld.xyz);
            vec3 lp1 = liquidWorld.xyz + liquidT * 0.01 + liquidOffset(liquidWorld.xyz + liquidT * 0.01);
            vec3 lp2 = liquidWorld.xyz + liquidB * 0.01 + liquidOffset(liquidWorld.xyz + liquidB * 0.01);
            vec3 liquidNew = normalize(cross(lp1 - lp0, lp2 - lp0));
            if (dot(liquidNew, liquidN) < 0.0) liquidNew = -liquidNew;
            transformedNormal = normalize(mat3(viewMatrix) * liquidNew);
            #include <normal_vertex>`,
          )
          .replace(
            '#include <project_vertex>',
            `vec4 mvPosition = viewMatrix * vec4(lp0, 1.0);
            gl_Position = projectionMatrix * mvPosition;`,
          );
      };

      const SIZE = 1;
      const geometries: BufferGeometry[] = [];
      const letters: { mesh: Mesh; home: Vector3; phase: number; spring: Spring }[] = [];
      const word = new THREE.Group();
      scene.add(word);

      // Detail level: enough triangles for the surface to bend smoothly,
      // fewer on phones. (The first version took 1–2 s per word to build.)
      const light = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
      const cache = new Map<string, { g: BufferGeometry; centre: Vector3 }>();
      const makeLetter = (ch: string) => {
        const cached = cache.get(ch);
        if (cached) return cached;
        let g: BufferGeometry = new TextGeometry(ch, {
          font,
          size: SIZE,
          depth: SIZE * 0.04,
          curveSegments: light ? 10 : 12,
          bevelEnabled: true,
          // Deep, round bevel growing outward: puffy edges. (An inward
          // offset broke the front faces at inner corners.)
          bevelThickness: SIZE * 0.15,
          bevelSize: SIZE * 0.055,
          bevelSegments: light ? 6 : 8,
        });
        // Small triangles everywhere, so even the flat faces can bend.
        g = new TessellateModifier(SIZE * (light ? 0.08 : 0.06), 10).modify(g);
        // Merge the extruded faces and smooth the normals: rounded, puffy.
        g.deleteAttribute('normal');
        g.deleteAttribute('uv');
        g = mergeVertices(g, 1e-4);
        g.computeVertexNormals();
        g.computeBoundingBox();
        // Keep the flat front and back faces flat: smoothing them into the
        // bevel left diagonal shading streaks across long triangles.
        const zMax = g.boundingBox!.max.z;
        const zMin = g.boundingBox!.min.z;
        const pos = g.getAttribute('position');
        const nor = g.getAttribute('normal');
        for (let i = 0; i < pos.count; i++) {
          const z = pos.getZ(i);
          if (Math.abs(z - zMax) < 1e-4) nor.setXYZ(i, 0, 0, 1);
          else if (Math.abs(z - zMin) < 1e-4) nor.setXYZ(i, 0, 0, -1);
        }
        nor.needsUpdate = true;
        const centre = new THREE.Vector3();
        g.boundingBox!.getCenter(centre);
        g.translate(-centre.x, -centre.y, -centre.z);
        geometries.push(g);
        const letter = { g, centre };
        cache.set(ch, letter);
        return letter;
      };

      const build = () => {
        for (const l of letters) word.remove(l.mesh);
        letters.length = 0;
        const spans = [...h1.querySelectorAll<HTMLElement>('.title-mask > span')];
        const lines = spans.map((s) => (s.textContent || '').toUpperCase().replace(/’/g, "'"));
        // Where each line sits in the page (left, right or between), so the
        // 3D word follows the heading's layout.
        const rects = spans.map((s) => {
          const range = document.createRange();
          range.selectNodeContents(s);
          return range.getBoundingClientRect();
        });
        const blockL = Math.min(...rects.map((r) => r.left));
        const blockR = Math.max(...rects.map((r) => r.right));
        const glyphs = (font.data as { glyphs: Record<string, { ha: number }>; resolution: number }).glyphs;
        const res = (font.data as { resolution: number }).resolution;
        const LINE = SIZE * 0.98;
        const rows: { list: typeof letters; width: number; place: number }[] = [];
        lines.forEach((text, row) => {
          let x = 0;
          const list: typeof letters = [];
          for (const ch of text) {
            const glyph = glyphs[ch] || glyphs['?'];
            const advance = ((glyph?.ha ?? 600) / res) * SIZE;
            if (ch.trim()) {
              const { g, centre } = makeLetter(ch);
              const mesh = new THREE.Mesh(g, material);
              const home = new THREE.Vector3(x + centre.x, -row * LINE + centre.y, centre.z);
              mesh.position.copy(home);
              word.add(mesh);
              const letter = { mesh, home, phase: Math.random() * Math.PI * 2, spring: { z: 0, vz: 0, r: 0, vr: 0, s: 1, vs: 0 } };
              letters.push(letter);
              list.push(letter);
            }
            x += advance * 1.03;
          }
          const r = rects[row];
          const free = blockR - blockL - r.width;
          rows.push({ list, width: x, place: free > 1 ? (r.left - blockL) / free : 0 });
        });
        const widest = Math.max(...rows.map((r) => r.width));
        for (const row of rows)
          for (const l of row.list) l.home.x += row.place * (widest - row.width);
        // Centre the block; the camera is fitted to it in layout().
        const box = new THREE.Box3().setFromObject(word);
        const c = new THREE.Vector3();
        box.getCenter(c);
        for (const l of letters) l.home.sub(new THREE.Vector3(c.x, c.y, 0));
        for (const l of letters) l.mesh.position.copy(l.home);
        size3.w = box.max.x - box.min.x;
        size3.h = box.max.y - box.min.y;
      };
      const size3 = { w: 1, h: 1 };

      // Canvas covers the heading's lines (plus room for tilt and wobble);
      // the camera distance makes the word fill that box.
      const layout = () => {
        const base = heading.getBoundingClientRect();
        // The text's own box (the h1 element itself is full width).
        let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
        for (const line of h1.querySelectorAll<HTMLElement>('.title-mask > span')) {
          const range = document.createRange();
          range.selectNodeContents(line);
          const b = range.getBoundingClientRect();
          left = Math.min(left, b.left); top = Math.min(top, b.top);
          right = Math.max(right, b.right); bottom = Math.max(bottom, b.bottom);
        }
        const r = { left, top, width: right - left, height: bottom - top };
        const padX = r.height * 0.18;
        const padY = r.height * 0.22;
        const w = r.width + padX * 2;
        const h = r.height + padY * 2;
        Object.assign(canvas.style, {
          left: `${r.left - base.left - padX}px`,
          top: `${r.top - base.top - padY}px`,
          width: `${w}px`,
          height: `${h}px`,
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // Word fills the heading's own box (not the padding).
        const fitW = (size3.w / (r.width / w)) / 2 / Math.tan((camera.fov * Math.PI) / 360) / camera.aspect;
        const fitH = (size3.h / (r.height / h)) / 2 / Math.tan((camera.fov * Math.PI) / 360);
        camera.position.set(0, 0, Math.max(fitW, fitH));
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
      };

      // Build the letters while the heading's entrance animation runs, one
      // per task so the page never freezes.
      const chars = new Set(
        (h1.textContent || '').toUpperCase().replace(/’/g, "'").replace(/\s/g, ''),
      );
      for (const ch of chars) {
        if (disposed) return;
        makeLetter(ch);
        await new Promise((r) => setTimeout(r));
      }
      if (disposed) return;
      // Measure where the heading ends up without waiting for its entrance
      // animation: jump the animation to its end, measure, jump back.
      const atRest = (measure: () => void) => {
        const running = h1
          .getAnimations({ subtree: true })
          .filter((a) => a.effect?.getTiming().iterations !== Infinity);
        const times = running.map((a) => a.currentTime);
        for (const a of running) a.currentTime = a.effect?.getComputedTiming().endTime ?? 0;
        measure();
        running.forEach((a, i) => (a.currentTime = times[i]));
      };
      atRest(() => {
        build();
        layout();
      });
      heading.classList.add('has-3d-title');

      const state = { mx: 0, my: 0, tx: 0, ty: 0, px: -10, py: -10, near: false, visible: true };
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const ndc = new THREE.Vector3();
      const ray = new THREE.Raycaster();
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.1);
      const hit = new THREE.Vector3();
      const toWorld = (x: number, y: number) => {
        ray.setFromCamera(new THREE.Vector2(x, y), camera);
        return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
      };
      let hover = 0;
      const onMove = (e: PointerEvent) => {
        state.tx = (e.clientX / innerWidth - 0.5) * 2;
        state.ty = (e.clientY / innerHeight - 0.5) * 2;
        const box = canvas.getBoundingClientRect();
        state.px = ((e.clientX - box.left) / box.width) * 2 - 1;
        state.py = -((e.clientY - box.top) / box.height) * 2 + 1;
        state.near = Math.abs(state.px) < 1.1 && Math.abs(state.py) < 1.2;
        wake();
      };
      const onDown = (e: PointerEvent) => {
        onMove(e);
        if (!state.near) return;
        const at = toWorld(state.px, state.py);
        if (at) liquid.uRipple.value.set(at.x, at.y, 0, 0);
        for (const l of letters) {
          ndc.copy(l.mesh.position).applyMatrix4(word.matrixWorld).project(camera);
          const d = Math.hypot(ndc.x - state.px, (ndc.y - state.py) * 0.6);
          // Wave: nearer letters kick first and harder.
          setTimeout(() => {
            l.spring.vz += 5 * Math.exp(-d * 1.2);
            l.spring.vr += (Math.random() - 0.5) * 6;
            l.spring.vs += 2.5 * Math.exp(-d);
          }, d * 220);
        }
      };

      let frame = 0;
      let last = performance.now();
      let time = 0;
      const render = (now: number) => {
        frame = 0;
        const dt = Math.min(now - last, 50) / 1000;
        last = now;
        time += dt;
        const k = 1 - Math.exp(-dt * 3.5);
        state.mx += (state.tx - state.mx) * k;
        state.my += (state.ty - state.my) * k;
        word.rotation.y = state.mx * 0.32;
        word.rotation.x = state.my * 0.18;
        word.updateMatrixWorld();
        liquid.uTime.value = time;
        liquid.uRipple.value.w += dt;
        hover += ((state.near ? 1 : 0) - hover) * (1 - Math.exp(-dt * 3));
        liquid.uHover.value = hover;
        const at = state.near ? toWorld(state.px, state.py) : null;
        if (at) {
          // The pull point trails the cursor a little: it feels viscous.
          liquid.uMouse.value.lerp(at, 1 - Math.exp(-dt * 6));
        }
        for (const l of letters) {
          ndc.copy(l.home).applyMatrix4(word.matrixWorld).project(camera);
          const d = Math.hypot(ndc.x - state.px, (ndc.y - state.py) * 0.6);
          const pull = state.near ? Math.exp(-(d * d) / 0.05) : 0;
          const sp = l.spring;
          // Springs toward a target: forward and bigger under the cursor.
          sp.vz += ((pull * 0.45 - sp.z) * 60 - sp.vz * 7) * dt;
          sp.vr += ((pull * (ndc.x - state.px) * -0.6 - sp.r) * 50 - sp.vr * 6) * dt;
          sp.vs += ((1 + pull * 0.12 - sp.s) * 70 - sp.vs * 8) * dt;
          sp.z += sp.vz * dt;
          sp.r += sp.vr * dt;
          sp.s += sp.vs * dt;
          const bob = Math.sin(time * 1.3 + l.phase) * 0.025;
          l.mesh.position.set(l.home.x, l.home.y + bob, l.home.z + sp.z);
          l.mesh.rotation.set(Math.sin(time * 0.9 + l.phase) * 0.04, sp.r + Math.sin(time * 0.7 + l.phase) * 0.05, sp.r * 0.3);
          l.mesh.scale.setScalar(sp.s);
        }
        renderer.render(scene, camera);
        if (state.visible && !reduced) frame = requestAnimationFrame(render);
      };
      const wake = () => {
        if (!frame && state.visible && !reduced) {
          last = performance.now();
          frame = requestAnimationFrame(render);
        }
      };
      renderer.render(scene, camera);
      wake();

      const sizer = new ResizeObserver(() => {
        atRest(layout);
        if (reduced) renderer.render(scene, camera);
      });
      sizer.observe(heading);
      // Language switch changes the heading text: rebuild the letters.
      let text = h1.textContent;
      const retext = new MutationObserver(() => {
        if (h1.textContent === text) return;
        text = h1.textContent;
        atRest(() => {
          build();
          layout();
        });
        if (reduced) renderer.render(scene, camera);
      });
      retext.observe(h1, { childList: true, subtree: true, characterData: true });
      const watcher = new IntersectionObserver(([entry]) => {
        state.visible = entry.isIntersecting;
        if (state.visible) wake();
        else if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      });
      watcher.observe(heading);
      addEventListener('pointermove', onMove, { passive: true });
      addEventListener('pointerdown', onDown, { passive: true });

      cleanup = () => {
        cancelAnimationFrame(frame);
        sizer.disconnect();
        retext.disconnect();
        watcher.disconnect();
        removeEventListener('pointermove', onMove);
        removeEventListener('pointerdown', onDown);
        heading.classList.remove('has-3d-title');
        for (const g of geometries) g.dispose();
        material.dispose();
        envMap.dispose();
        pmrem.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  return <canvas ref={ref} className="contact-title-3d" aria-hidden="true" />;

}
