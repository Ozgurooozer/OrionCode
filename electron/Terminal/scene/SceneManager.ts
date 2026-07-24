import {
  Engine,
  Scene,
  FreeCamera,
  HemisphericLight,
  PointLight,
  Vector3,
  Color3,
  Color4,
  MeshBuilder,
  StandardMaterial,
  GlowLayer,
} from "@babylonjs/core";

export class SceneManager {
  readonly engine: Engine;
  readonly scene:  Scene;

  // Hedef renk (smooth transition için)
  private _targetClear: Color4 | null = null;
  private _targetAccent: Color3 | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, {
      preserveDrawingBuffer: false,
      stencil: true,
      alpha: true,
    });

    const scene = new Scene(this.engine);
    this.scene  = scene;
    scene.clearColor = new Color4(0.020, 0.060, 0.130, 1.0);

    // ── Kamera ──────────────────────────────────────────────────────────
    const cam = new FreeCamera("cam", new Vector3(0, 2.5, -14), scene);
    cam.setTarget(new Vector3(0, 0, 0));

    // ── Işıklar ──────────────────────────────────────────────────────────
    const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.6;
    ambient.diffuse   = new Color3(0.6, 0.65, 1.0);

    const accent = new PointLight("accent", new Vector3(0, 4, -4), scene);
    accent.intensity = 2.8;
    accent.diffuse   = new Color3(0.00, 0.90, 1.0);

    // ── Glow katmanı ─────────────────────────────────────────────────────
    const glow = new GlowLayer("glow", scene);
    glow.intensity = 0.7;

    // ── Sahne geometrisi ─────────────────────────────────────────────────
    this._buildTestLevel(scene);

    // ── Render döngüsü + smooth renk geçişi ─────────────────────────────
    this.engine.runRenderLoop(() => {
      this._tickTransition();
      scene.render();
    });

    const onResize = () => this.engine.resize();
    window.addEventListener("resize", onResize);
    (this as unknown as { _onResize: () => void })._onResize = onResize;
  }

  // Her frame'de clearColor ve accent ışığını hedefe doğru lerp et
  private _tickTransition() {
    const speed = 0.04;
    if (this._targetClear) {
      const c = this.scene.clearColor;
      c.r += (this._targetClear.r - c.r) * speed;
      c.g += (this._targetClear.g - c.g) * speed;
      c.b += (this._targetClear.b - c.b) * speed;
      if (Math.abs(c.r - this._targetClear.r) < 0.001 &&
          Math.abs(c.g - this._targetClear.g) < 0.001 &&
          Math.abs(c.b - this._targetClear.b) < 0.001) {
        this.scene.clearColor = this._targetClear.clone();
        this._targetClear = null;
      }
    }
    if (this._targetAccent) {
      const light = this.scene.getLightByName("accent") as PointLight | null;
      if (light) {
        light.diffuse.r += (this._targetAccent.r - light.diffuse.r) * speed;
        light.diffuse.g += (this._targetAccent.g - light.diffuse.g) * speed;
        light.diffuse.b += (this._targetAccent.b - light.diffuse.b) * speed;
      }
    }
  }

  private _buildTestLevel(scene: Scene) {
    // ── Zemin — wireframe ızgara ─────────────────────────────────────────
    const ground = MeshBuilder.CreateGround("ground",
      { width: 60, height: 60, subdivisions: 30 }, scene);
    const gMat = new StandardMaterial("gMat", scene);
    gMat.emissiveColor = new Color3(0.08, 0.45, 0.85);
    gMat.wireframe = true;
    ground.material = gMat;
    ground.position.y = -3.5;

    // ── Arka zemin — solid, koyu ─────────────────────────────────────────
    const floor = MeshBuilder.CreateGround("floor",
      { width: 60, height: 60 }, scene);
    const fMat = new StandardMaterial("fMat", scene);
    fMat.emissiveColor = new Color3(0.015, 0.015, 0.04);
    fMat.backFaceCulling = false;
    floor.material = fMat;
    floor.position.y = -3.52;

    // ── Yüzen kristal küpler ─────────────────────────────────────────────
    const cubeConfig = [
      { pos: [-5.5,  0.2,  3], size: 0.55, speed: [0.007, 0.004, 0] },
      { pos: [ 5.0, -0.5,  4], size: 0.40, speed: [0.005, 0.008, 0] },
      { pos: [-2.5,  1.0,  6], size: 0.30, speed: [0.009, 0.003, 0] },
      { pos: [ 3.0,  0.8,  2], size: 0.65, speed: [0.004, 0.006, 0] },
      { pos: [ 0.5, -1.0,  8], size: 0.35, speed: [0.006, 0.009, 0] },
      { pos: [-4.0,  1.5,  5], size: 0.45, speed: [0.003, 0.005, 0] },
    ];

    cubeConfig.forEach(({ pos, size, speed }, i) => {
      const mesh = MeshBuilder.CreateBox(`cube${i}`, { size }, scene);
      mesh.position = new Vector3(pos[0], pos[1], pos[2]);
      const mat = new StandardMaterial(`cubeMat${i}`, scene);
      mat.emissiveColor = new Color3(0.1 + i * 0.04, 0.7 + i * 0.03, 1.0);
      mat.wireframe = true;
      mesh.material = mat;

      const originY = pos[1];
      let t = i * 1.2; // faz farkı
      scene.registerBeforeRender(() => {
        t += 0.016;
        mesh.rotation.y += speed[0];
        mesh.rotation.x += speed[1];
        mesh.position.y = originY + Math.sin(t * 0.6) * 0.35;
      });
    });

    // ── Uzak direkler — derinlik hissi ───────────────────────────────────
    [-8, -4, 0, 4, 8].forEach((x, i) => {
      const col = MeshBuilder.CreateCylinder(`col${i}`,
        { height: 8, diameterTop: 0.04, diameterBottom: 0.04, tessellation: 6 }, scene);
      col.position = new Vector3(x, 0.5, 14);
      const mat = new StandardMaterial(`colMat${i}`, scene);
      mat.emissiveColor = new Color3(0.0, 0.8, 1.0);
      col.material = mat;
    });

    // ── Zemin yatay çizgiler (ızgara efekti güçlendirme) ─────────────────
    for (let z = 0; z <= 20; z += 2) {
      const line = MeshBuilder.CreateBox(`hLine${z}`,
        { width: 40, height: 0.01, depth: 0.02 }, scene);
      line.position = new Vector3(0, -3.48, z - 6);
      const mat = new StandardMaterial(`hLineMat${z}`, scene);
      mat.emissiveColor = new Color3(0.0, 0.55, 0.95);
      line.material = mat;
    }
  }

  /** LevelManager'ın sahneyi animasyonlu geçişle yeniden konfigüre etmesi */
  setLevelVisuals(color: Color4, accentColor: Color3) {
    this._targetClear  = color;
    this._targetAccent = accentColor;
  }

  dispose() {
    const self = this as unknown as { _onResize?: () => void };
    if (self._onResize) window.removeEventListener("resize", self._onResize);
    this.engine.dispose();
  }
}
