"""
probe_hooks.py — HuggingFace hooks ile katman aktivasyonlarını yakala.

TransformerLens gerektirmez (B şıkkı — logit-lens yaklaşımı).
Her girdi için:
  - Son token pozisyonunda her transformer bloğunun hidden state'ini kaydet
  - İlk üretilen token(lar)ı kaydet → JSON mu, doğal dil mi?

UYARI: qwen2.5-coder:7b fp16'da ~14GB RAM, int8'de ~7GB gerektirir.
  CPU'da çok yavaş (örnek başına dakikalar). GPU/Metal ile kullanın.
  Küçük model ile hızlı test: MODEL_ID = "Qwen/Qwen2.5-Coder-0.5B-Instruct"

Çıktı:
  activations.npz  — shape: (n_samples, n_layers, hidden_dim)
  labels.json      — her örnek için {input, label, first_tokens}
"""

import json
import pathlib
import sys
import os
import numpy as np

SCRIPT_DIR = pathlib.Path(__file__).parent

# ── Model seçimi ──────────────────────────────────────────────────────────────
# 7B için: "Qwen/Qwen2.5-Coder-7B-Instruct"
# Hızlı test için: "Qwen/Qwen2.5-Coder-0.5B-Instruct"
MODEL_ID = os.environ.get("PRIZMA_MODEL", "Qwen/Qwen2.5-Coder-0.5B-Instruct")
N_GEN    = 30  # ilk kaç token üret (JSON mi doğal dil mi anlamak için yeterli)

SYSTEM_PROMPT = """Sen Meissa'sın — Orion'un görev sınıflandırıcısı.
Kullanıcı mesajını analiz et. YALNIZCA şu JSON'ı döndür, başka hiçbir şey yazma:
{
  "kategoriler": [<"resim"|"yazı"|"kod"|"analiz"|"sohbet"|"ses"|"3d"|"animasyon">, ...],
  "karmasiklik": <1|2|3>,
  "rota": <"skill"|"sohbet"|"orchestration">,
  "skill": <"image"|"voice"|"animation"|"code"|null>,
  "skills": <["image","voice"] veya null>,
  "tahmini_butce": 150
}
YALNIZCA JSON döndür. Başka hiçbir şey yazma."""

# ── Model yükle ───────────────────────────────────────────────────────────────

def load_model():
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM
    except ImportError:
        print("[probe_hooks] transformers/torch kurulu değil.")
        sys.exit(1)

    print(f"[probe_hooks] Model yükleniyor: {MODEL_ID}")
    print("  (ilk çalıştırmada HuggingFace'ten indirme gerekebilir)")

    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)

    # 8-bit quantization varsa kullan (GPU gerektirir)
    try:
        import bitsandbytes  # noqa: F401
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID, load_in_8bit=True, device_map="auto"
        )
        print("  → 8-bit quantization aktif")
    except (ImportError, Exception):
        model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID, torch_dtype="auto", device_map="cpu"
        )
        print("  → CPU modu (yavaş olabilir)")

    model.eval()
    return tokenizer, model

# ── Hook kayıt + aktivasyon yakalama ─────────────────────────────────────────

def capture_activations(tokenizer, model, user_msg: str):
    """
    Son token pozisyonundaki her katman hidden state'ini döner.
    Şekil: (n_layers, hidden_dim)
    """
    import torch

    layer_outputs = []
    hooks = []

    # Qwen2 mimarisi: model.model.layers[i]
    # Her bloğun çıktısı tuple → ilk eleman hidden state
    layers = model.model.layers

    def make_hook(idx):
        def hook(module, input, output):
            # output: (hidden_state, ...) veya sadece hidden_state
            hs = output[0] if isinstance(output, tuple) else output
            # Son token pozisyonu, batch=0
            vec = hs[0, -1, :].detach().cpu().float().numpy()
            layer_outputs.append((idx, vec))
        return hook

    for i, layer in enumerate(layers):
        h = layer.register_forward_hook(make_hook(i))
        hooks.append(h)

    # Sohbet formatında tokenize
    messages = [
        {"role": "system",  "content": SYSTEM_PROMPT},
        {"role": "user",    "content": user_msg},
    ]
    text = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    ids = tokenizer(text, return_tensors="pt").to(model.device)

    with torch.no_grad():
        # Önce sadece forward pass (aktivasyonlar için)
        _ = model(**ids)

    for h in hooks:
        h.remove()

    # Sırala ve stack et
    layer_outputs.sort(key=lambda x: x[0])
    activations = np.stack([vec for _, vec in layer_outputs])  # (n_layers, hidden_dim)

    # İlk N token üret → JSON mi?
    with torch.no_grad():
        gen = model.generate(
            **ids,
            max_new_tokens=N_GEN,
            do_sample=False,  # greedy — deterministik
            temperature=None,
            top_p=None,
        )
    first_tokens = tokenizer.decode(
        gen[0][ids["input_ids"].shape[1]:], skip_special_tokens=True
    )

    return activations, first_tokens

# ── JSON testi ────────────────────────────────────────────────────────────────

def _is_json(raw: str) -> bool:
    raw = raw.strip()
    return raw.startswith("{")

# ── Ana akış ──────────────────────────────────────────────────────────────────

def main():
    corpus_file = SCRIPT_DIR / "full_corpus.jsonl"
    if not corpus_file.exists():
        print("[probe_hooks] Corpus bulunamadı. Önce: python corpus.py")
        sys.exit(1)

    entries = []
    with open(corpus_file, encoding="utf-8") as f:
        for line in f:
            if line.strip():
                entries.append(json.loads(line))

    print(f"[probe_hooks] {len(entries)} girdi yüklenecek")
    tokenizer, model = load_model()

    all_activations = []
    labels = []

    for idx, entry in enumerate(entries, 1):
        msg      = entry["input"]
        expected = entry.get("label", "?")
        print(f"\n[{idx:2d}/{len(entries)}] '{msg}'", flush=True)

        try:
            acts, first_tokens = capture_activations(tokenizer, model, msg)
            observed = "drift" if not _is_json(first_tokens) else "json"
            print(f"  → katmanlar={acts.shape[0]} hidden={acts.shape[1]}")
            print(f"  → ilk tokenlar: {repr(first_tokens[:80])}")
            print(f"  → gözlemlenen={observed}  beklenen={expected}")

            all_activations.append(acts)
            labels.append({
                "input":          msg,
                "expected_label": expected,
                "observed_label": observed,
                "first_tokens":   first_tokens[:200],
                "match":          observed == expected,
                "source":         entry.get("source", "?"),
                "note":           entry.get("note", ""),
            })
        except Exception as e:
            print(f"  → HATA: {e}")
            continue

    if not all_activations:
        print("\n[probe_hooks] Hiç aktivasyon yakalanamadı.")
        sys.exit(1)

    # Kaydet
    acts_arr = np.stack(all_activations)  # (n_samples, n_layers, hidden_dim)
    out_npz  = SCRIPT_DIR / "activations.npz"
    out_lbl  = SCRIPT_DIR / "activation_labels.json"

    np.savez_compressed(out_npz, activations=acts_arr)
    with open(out_lbl, "w", encoding="utf-8") as f:
        json.dump(labels, f, ensure_ascii=False, indent=2)

    print(f"\n[probe_hooks] Tamamlandı")
    print(f"  activations.npz  → {acts_arr.shape}")
    print(f"  activation_labels.json → {len(labels)} örnek")
    print(f"\nSonraki adım: python analyze.py --mode hooks")

if __name__ == "__main__":
    main()
