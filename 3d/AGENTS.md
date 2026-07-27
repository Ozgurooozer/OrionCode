# AGENTS.md — C:\3d ComfyUI Workbench

## What this is

A ComfyUI deployment workbench. The `ComfyUI/` subdirectory is the **untouched upstream repo** (`comfyanonymous/ComfyUI`). Do not modify files there unless the task explicitly targets upstream code. The existing `ComfyUI/AGENTS.md` governs upstream patches — read it if modifying core, ignore otherwise.

## Launch

```
start.bat
```
which runs: `C:\3d\venv\Scripts\python.exe main.py --windows-standalone-build` from `ComfyUI/`.

Default: port 8188, auto-opens browser.

## Python environment

- `C:\3d\venv\` — Python 3.14.6 (not the EZi embedded Python)
- Activate: `C:\3d\venv\Scripts\Activate.ps1` or `C:\3d\venv\Scripts\python.exe`
- Requirements defined upstream at `ComfyUI/requirements.txt`

## Model storage

All models are in `C:\3d\MODELLER\` (~43 GB total), linked via `ComfyUI/extra_model_paths.yaml`. Do NOT place models inside `ComfyUI/models/`.

| Path | Contents |
|------|----------|
| `checkpoints/` | SDXL, Illustrious, RevAnimated checkpoints |
| `diffusion_models/` | Anima base diffusion |
| `trellis2/` | 3D pipeline (encoders, DiTs, decoders) — requires Torch 2.8.0+cu128 |
| `facebook/dinov3-*/` | DINOv3 encoder for Trellis2 |
| `loras/` | Style LoRAs |
| `clip_vision/`, `ipadapter/`, `controlnet/`, `vae/`, `text_encoders/` | Standard ComfyUI extras |

See `MODELLER/KATALOG.md` for full catalog (Turkish).

## 3D pipeline (Pixal3D / Trellis2)

- Custom node: `ComfyUI/custom_nodes/Pixal3D-ComfyUI/`
- Workflows in `WORKFLOWS/`: `MeshWithTexturing_Pixal3D_*`, `MeshOnly_Pixal3D_*`
- **Torch 2.8.0+cu128 required** — the venv must match. See `WHEEL_URLS.md` for matching FlashAttention/SageAttention/Insightface wheels.
- Pipeline: Image → DINOv3 → Shape Encoder → Shape DiT → Decoder → Texture DiT → GLB
- VRAM: ~6–7 GB peak (RTX 4060 8GB)

## Workflows

All saved workflows are in `WORKFLOWS/` (12 files). Includes image gen (SDXL, anime), 3D (Pixal3D), and character consistency workflows.

## Attention backends

Pre-built wheels for Windows in `WHEEL_URLS.md`:
- FlashAttention: `pip install "triton-windows<3.5"` then the matching cu128 wheel
- SageAttention v2/v3: matching cu128 wheel
- Launch flags: `--use-flash-attention` or `--use-sage-attention`

## Performance context

- GPU: RTX 4060 8GB VRAM
- CUDA 12.8, Torch 2.8.0+cu128 (can be switched; Trellis2 is pinned)
- `--windows-standalone-build` flag enables auto-open and convenience features

## Files to know

| File | Purpose |
|------|---------|
| `start.bat` | Launch ComfyUI |
| `MIMARI.md` | Full system architecture analysis (Turkish) |
| `WHEEL_URLS.md` | Windows wheel URLs for attention/inference backends |
| `MODELLER/KATALOG.md` | Model catalog (Turkish) |
| `WORKFLOWS/*.json` | Loadable workflow graphs |

## What NOT to do

- Do not treat `ComfyUI/` as a local project — it is the upstream repo. Write changes there only when fixing core ComfyUI.
- Do not stash models in `ComfyUI/models/` — use `MODELLER/`.
- Do not modify `ComfyUI/AGENTS.md` — that file governs upstream PRs.
- No test suite or CI exists in this workspace.
