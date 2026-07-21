// browser.js — Puppeteer headless browser wrapper
"use strict";

const puppeteer = require("puppeteer");
const path = require("path");
const { SCENE_CODE } = require("./scene.js");

const BABYLON_BUNDLE = path.resolve(__dirname, "..", "bundle", "babylon.js");

class HeadlessBrowser {
  constructor() {
    this._browser = null;
    this._page = null;
    this._width = 640;
    this._height = 200;
  }

  async start(width, height) {
    this._width = width;
    this._height = height;

    this._browser = await puppeteer.launch({
      headless: true,
      args: ["--use-gl=angle", "--no-sandbox", "--disable-gpu-compositing"],
    });

    this._page = await this._browser.newPage();
    await this._page.setViewport({ width, height });

    // Minimal HTML with canvas
    await this._page.setContent(
      `<!DOCTYPE html>
<html><body style="margin:0;background:#000;overflow:hidden">
<canvas id="renderCanvas"></canvas>
</body></html>`
    );

    // Set canvas dimensions
    await this._page.evaluate((w, h) => {
      const c = document.getElementById("renderCanvas");
      c.width = w;
      c.height = h;
      c.style.width = w + "px";
      c.style.height = h + "px";
    }, width, height);

    // Load Babylon.js bundle
    await this._page.addScriptTag({ path: BABYLON_BUNDLE });

    // Initialize scene
    await this._page.evaluate(SCENE_CODE);

    // Verify scene loaded
    const ready = await this._page.evaluate(() => !!window.b3engine);
    if (!ready) throw new Error("Babylon.js scene failed to initialize");
  }

  async renderFrame(deltaMs) {
    return await this._page.evaluate((dt) => {
      const scene = window.b3scene;
      const camera = window.b3camera;
      const torus = window.b3torus;
      const spheres = window.b3orbitSpheres;
      const time = (window.b3time || 0) + (dt || 16);

      // Animate camera orbit
      camera.alpha = time * 0.0003;
      camera.beta = 0.5 + 0.2 * Math.sin(time * 0.0001);

      // Animate torus rotation
      torus.rotation.x = time * 0.0005;
      torus.rotation.y = time * 0.0008;
      torus.rotation.z = time * 0.0003;

      // Animate orbit spheres
      for (let i = 0; i < spheres.length; i++) {
        const angle = (i / spheres.length) * Math.PI * 2 + time * 0.0004;
        spheres[i].position.x = 1.3 * Math.cos(angle);
        spheres[i].position.z = 1.3 * Math.sin(angle);
        spheres[i].position.y = 0.3 * Math.sin(angle * 2 + time * 0.0006);
      }

      // Render
      scene.render();

      // Read pixels
      const gl = window.b3engine._gl;
      const w = window.b3engine.getRenderWidth();
      const h = window.b3engine.getRenderHeight();
      const pixels = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      window.b3time = time;

      return {
        pixels: Array.from(pixels),
        width: w,
        height: h,
      };
    }, deltaMs);
  }

  async resize(width, height) {
    this._width = width;
    this._height = height;
    await this._page.setViewport({ width, height });
    await this._page.evaluate((w, h) => {
      const c = document.getElementById("renderCanvas");
      c.width = w;
      c.height = h;
      c.style.width = w + "px";
      c.style.height = h + "px";
      window.b3engine.resize();
    }, width, height);
  }

  async stop() {
    if (this._browser) {
      await this._browser.close();
      this._browser = null;
      this._page = null;
    }
  }
}

module.exports = { HeadlessBrowser };
