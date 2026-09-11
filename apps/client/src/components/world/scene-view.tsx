'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const WALK_SPEED = 2.6;
const EYE_HEIGHT = 1.6;

type Mode = 'orbit' | 'walk';

// сцена ивента: осмотреть со стороны или ходить внутри
export function SceneView({ src, title }: { src: string; title: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('orbit');
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    const box = holder.current;

    if (!box) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(box.clientWidth, box.clientHeight);
    box.append(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, box.clientWidth / box.clientHeight, 0.05, 500);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(4, 8, 5);
    scene.add(sun);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.screenSpacePanning = false;

    const walk = new PointerLockControls(camera, renderer.domElement);
    const pressed = new Set<string>();
    let floor = 0;

    const onKeyDown = (event: KeyboardEvent) => pressed.add(event.code);
    const onKeyUp = (event: KeyboardEvent) => pressed.delete(event.code);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const loader = new GLTFLoader();
    let disposed = false;

    loader.load(
      src,
      (gltf) => {
        if (disposed) {
          return;
        }

        scene.add(gltf.scene);

        const bounds = new THREE.Box3().setFromObject(gltf.scene);
        const size = bounds.getSize(new THREE.Vector3());
        const centre = bounds.getCenter(new THREE.Vector3());
        const reach = Math.max(size.x, size.y, size.z) || 1;

        floor = bounds.min.y;
        camera.position.set(centre.x + reach * 0.8, centre.y + reach * 0.5, centre.z + reach * 0.8);
        camera.far = reach * 20;
        camera.updateProjectionMatrix();
        orbit.target.copy(centre);
        orbit.update();

        setState('ready');
      },
      undefined,
      () => setState('failed'),
    );

    const clock = new THREE.Clock();
    let frame = 0;

    const step = () => {
      const delta = Math.min(clock.getDelta(), 0.05);

      if (walk.isLocked) {
        const distance = WALK_SPEED * delta;

        if (pressed.has('KeyW') || pressed.has('ArrowUp')) walk.moveForward(distance);
        if (pressed.has('KeyS') || pressed.has('ArrowDown')) walk.moveForward(-distance);
        if (pressed.has('KeyA') || pressed.has('ArrowLeft')) walk.moveRight(-distance);
        if (pressed.has('KeyD') || pressed.has('ArrowRight')) walk.moveRight(distance);

        camera.position.y = floor + EYE_HEIGHT;
      } else {
        orbit.update();
      }

      renderer.render(scene, camera);
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);

    const fit = () => {
      camera.aspect = box.clientWidth / box.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(box.clientWidth, box.clientHeight);
    };

    const watcher = new ResizeObserver(fit);
    watcher.observe(box);

    box.dataset.walk = 'off';

    const toggle = () => {
      if (box.dataset.walk === 'on') {
        orbit.enabled = false;
        walk.lock();
      } else {
        walk.unlock();
        orbit.enabled = true;
      }
    };

    box.addEventListener('walkmode', toggle);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      watcher.disconnect();
      box.removeEventListener('walkmode', toggle);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      orbit.dispose();
      walk.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src]);

  function switchTo(next: Mode): void {
    setMode(next);

    const box = holder.current;

    if (box) {
      box.dataset.walk = next === 'walk' ? 'on' : 'off';
      box.dispatchEvent(new Event('walkmode'));
    }
  }

  return (
    <div className="relative h-full w-full">
      <div ref={holder} className="h-full w-full" />

      <div className="absolute left-0 top-0 flex gap-1 p-1">
        <span className="frame px-1" style={{ background: '#fff' }}>
          {title}
        </span>
        <button
          type="button"
          onClick={() => switchTo('orbit')}
          aria-pressed={mode === 'orbit'}
          className="frame px-1"
          style={{ background: '#fff' }}
        >
          осмотреть
        </button>
        <button
          type="button"
          onClick={() => switchTo('walk')}
          aria-pressed={mode === 'walk'}
          className="frame px-1"
          style={{ background: '#fff' }}
        >
          ходить
        </button>
      </div>

      {state === 'loading' ? <p className="absolute bottom-1 left-1">сцена грузится</p> : null}
      {state === 'failed' ? <p className="absolute bottom-1 left-1">сцену не удалось открыть</p> : null}
      {mode === 'walk' ? <p className="absolute bottom-1 left-1">ходьба: WASD, мышь осматривается, Esc выйти</p> : null}
    </div>
  );
}
