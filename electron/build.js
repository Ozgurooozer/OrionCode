// electron/build.js — renderer'ı (src/index.jsx) tek dosyaya derler.
// Ağır bir bundler kurulumu yerine tek-dosya esbuild — molp'un "az bağımlılık"
// felsefesine uygun, config dosyası yok.
"use strict";
const esbuild = require("esbuild");

const watch = process.argv.includes("--watch");

const fs = require("fs");

const opts = {
  entryPoints: ["src/index.jsx"],
  bundle: true,
  outfile: "dist/renderer.js",
  platform: "browser",
  target: "chrome120",
  jsx: "automatic",
  loader: { ".js": "jsx", ".ts": "ts", ".tsx": "tsx" },
  logLevel: "info",
};

// xterm CSS → dist/ (Electron file:// protokolünde local asset gerekli)
function copyXtermCSS() {
  try {
    const src = require.resolve("@xterm/xterm/css/xterm.css");
    fs.mkdirSync("dist", { recursive: true });
    fs.copyFileSync(src, "dist/xterm.css");
  } catch { /* paket yüklü değilse sessizce atla */ }
}

copyXtermCSS();

if (watch) {
  esbuild.context(opts).then(ctx => ctx.watch());
} else {
  esbuild.build(opts).catch(() => process.exit(1));
}
