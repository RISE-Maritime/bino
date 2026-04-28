import * as THREE from "three";

// Builds a renderer-agnostic test scene that satisfies the spike's
// "non-trivial scene" requirement: a few thousand triangles, one textured
// plane, basic lighting. Returns { scene, camera, animate(time) }.
//
// Triangle budget: torusKnot (~10k tris) + 200 instanced cubes (~2.4k tris)
// + a 256-segment plane (~131k tris). Total ~143k tris — well above the
// "few thousand" floor and enough to put real load on a renderer.
export function buildScene({ width, height }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e1a);

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
  camera.position.set(0, 6, 18);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const sun = new THREE.DirectionalLight(0xfff1d0, 1.2);
  sun.position.set(8, 12, 6);
  scene.add(sun);

  // Procedural texture so we don't need to load files. 256x256 checkerboard
  // with a radial gradient — gives the textured plane real fragment work.
  const tex = makeCheckerTexture(256);
  const planeGeom = new THREE.PlaneGeometry(60, 60, 256, 256);
  const planeMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.6,
    metalness: 0.05,
  });
  const plane = new THREE.Mesh(planeGeom, planeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -2;
  scene.add(plane);

  // Hero geometry — torus knot.
  const knotGeom = new THREE.TorusKnotGeometry(2.2, 0.65, 200, 28);
  const knotMat = new THREE.MeshStandardMaterial({
    color: 0xc06030,
    roughness: 0.35,
    metalness: 0.4,
  });
  const knot = new THREE.Mesh(knotGeom, knotMat);
  scene.add(knot);

  // Instanced cubes — orbiting field of small geometry to add object count.
  const cubeGeom = new THREE.BoxGeometry(0.35, 0.35, 0.35);
  const cubeMat = new THREE.MeshStandardMaterial({
    color: 0x4080c0,
    roughness: 0.5,
  });
  const COUNT = 200;
  const cubes = new THREE.InstancedMesh(cubeGeom, cubeMat, COUNT);
  scene.add(cubes);

  const cubeOffsets = new Array(COUNT).fill(0).map((_, i) => ({
    radius: 5 + (i % 7) * 0.8,
    speed: 0.2 + (i % 11) * 0.03,
    phase: (i / COUNT) * Math.PI * 2,
    yPhase: i * 0.31,
  }));

  const dummy = new THREE.Object3D();

  function animate(time) {
    knot.rotation.x = time * 0.4;
    knot.rotation.y = time * 0.55;
    for (let i = 0; i < COUNT; i++) {
      const o = cubeOffsets[i];
      const a = o.phase + time * o.speed;
      dummy.position.set(
        Math.cos(a) * o.radius,
        Math.sin(time * 0.6 + o.yPhase) * 1.5,
        Math.sin(a) * o.radius,
      );
      dummy.rotation.set(time + o.phase, time * 0.7 + o.phase, 0);
      dummy.updateMatrix();
      cubes.setMatrixAt(i, dummy.matrix);
    }
    cubes.instanceMatrix.needsUpdate = true;
  }

  return { scene, camera, animate };
}

function makeCheckerTexture(size) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const cell = (((x >> 4) ^ (y >> 4)) & 1) === 1;
      const dx = x - size / 2, dy = y - size / 2;
      const r = Math.sqrt(dx * dx + dy * dy) / (size / 2);
      const v = cell ? 200 : 60;
      const tint = Math.max(0, 1 - r) * 60;
      data[i + 0] = Math.min(255, v + tint);
      data[i + 1] = Math.min(255, v + tint * 0.7);
      data[i + 2] = Math.min(255, v + tint * 0.4);
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  return tex;
}
