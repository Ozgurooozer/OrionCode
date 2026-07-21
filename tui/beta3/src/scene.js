// scene.js — Babylon.js scene code
// This runs INSIDE the headless browser via Puppeteer
// Exposed as a string template to be injected

const SCENE_CODE = `
// Babylon.js scene setup
(function() {
  const canvas = document.getElementById('renderCanvas');
  if (!canvas) return;

  // Engine
  window.b3engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
  });

  // Scene
  const scene = new BABYLON.Scene(window.b3engine);
  scene.clearColor = new BABYLON.Color3(0.043, 0.055, 0.078);

  // Camera
  const camera = new BABYLON.ArcRotateCamera(
    'camera', 0, 0.6, 4,
    BABYLON.Vector3.Zero(), scene
  );
  camera.lowerRadiusLimit = 2;
  camera.upperRadiusLimit = 10;
  camera.attachControl(true);

  // Lights
  const hemi = new BABYLON.HemisphericLight(
    'hemi', new BABYLON.Vector3(0, 1, 0), scene
  );
  hemi.intensity = 0.6;

  const dirLight = new BABYLON.DirectionalLight(
    'dir', new BABYLON.Vector3(-0.5, -1, -0.3), scene
  );
  dirLight.intensity = 0.8;

  // Ground plane (grid)
  const ground = BABYLON.MeshBuilder.CreateGround(
    'ground', { width: 6, height: 6, subdivisions: 2 }, scene
  );
  ground.position.y = -0.8;

  const gridMat = new BABYLON.StandardMaterial('gridMat', scene);
  gridMat.diffuseColor = new BABYLON.Color3(0.15, 0.18, 0.28);
  gridMat.specularColor = BABYLON.Color3.Black();
  gridMat.alpha = 0.6;
  ground.material = gridMat;

  // Torus knot (centerpiece)
  const torus = BABYLON.MeshBuilder.CreateTorusKnot(
    'torus', { radius: 0.7, tube: 0.25, radialSegments: 64, tubularSegments: 32 }, scene
  );
  torus.position.y = 0.2;

  const torusMat = new BABYLON.StandardMaterial('torusMat', scene);
  torusMat.diffuseColor = new BABYLON.Color3(0.376, 0.455, 0.545);
  torusMat.emissiveColor = new BABYLON.Color3(0.376, 0.455, 0.545);
  torusMat.emissiveIntensity = 0.15;
  torusMat.specularColor = new BABYLON.Color3(0.6, 0.7, 0.9);
  torusMat.specularPower = 64;
  torus.material = torusMat;

  // Ring of small spheres (orbit)
  const orbitSpheres = [];
  for (let i = 0; i < 8; i++) {
    const sphere = BABYLON.MeshBuilder.CreateSphere(
      'orbit_' + i, { diameter: 0.08 }, scene
    );
    const hue = i / 8;
    const mat = new BABYLON.StandardMaterial('orbitMat_' + i, scene);
    mat.diffuseColor = new BABYLON.Color3(
      0.3 + 0.5 * Math.sin(hue * Math.PI * 2),
      0.3 + 0.5 * Math.sin((hue + 0.33) * Math.PI * 2),
      0.3 + 0.5 * Math.sin((hue + 0.66) * Math.PI * 2)
    );
    mat.emissiveColor = mat.diffuseColor;
    mat.emissiveIntensity = 0.5;
    sphere.material = mat;
    orbitSpheres.push(sphere);
  }

  // State
  window.b3scene = scene;
  window.b3camera = camera;
  window.b3torus = torus;
  window.b3orbitSpheres = orbitSpheres;
  window.b3time = 0;

  console.log('Babylon.js scene initialized');
})();
`;

module.exports = { SCENE_CODE };
