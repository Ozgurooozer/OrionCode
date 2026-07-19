# Orion Aethelred v5 — Durum Raporu
> Tarih: 2026-07-18 · Test: 320/320 · Kod: ~13 500 satır

---

## Genel Tablo

| Katman | Durum | Not |
|---|---|---|
| CLI (orion.js) | ✅ Aktif | Sticky input, tab complete, /gecmis |
| HTTP Server (orion-server.js) | ✅ Aktif | SSE /events endpoint |
| Backends | ✅ 5 built-in + BYOK | anthropic, ollama, openrouter, openai, huggingface |
| Tools | ✅ 31 araç | builtin (1+think), fs (17), shell (1), git (7), memory (2), vault (3), web (1) |
| MCP | ✅ Client + Server | stdio + HTTP, autoConnect |
| Vault (bellek) | ✅ 4 katman | working / episodic / semantic / personalized |
| TUI | ✅ Yenilendi | Sticky input, input box, * tool format, → result |
| Test | ✅ 283/283 | 36 test dosyası |

---

## Mimari

```
orion.js (CLI)          orion-server.js (HTTP)
      │                         │
      └──────── core/session.js ──────────── (tier1 + tier2 loop)
                     │
        ┌────────────┼──────────────────────┐
        │            │                      │
   backends/     core/router.js       core/tools.js
   (5 built-in   (Thompson +          (fs, memory,
   + custom.js)   FEP gölge)           vault, shell)
        │
   core/speculex.js   core/daemon.js
   (tier2 beklerken   (vault yazımı,
    read-only prefetch) digest, weakness)
```

---

## Sistemler

### Çekirdek

| Sistem | Dosya | Durum |
|---|---|---|
| Session yönetimi | `core/session.js` (754 satır) | Anthropic / OpenAI-family / Ollama / React loop |
| BYOK Router | `core/router.js` + `core/thompson.js` | Beta dağılımı öğrenen router |
| Spekülatif önbellek | `core/speculex.js` | TTL=30s, SAFE_TOOLS whitelist, 50KB cap |
| FEP gölge modu | `core/freeenergy.js` | lambda=0 varsayılan, sadece telemetry loglar |
| MCP | `core/mcp.js` | stdio + HTTP, tool expose/consume |
| Checkpoint | `core/checkpoint.js` | Yazım öncesi otomatik snapshot |
| Diagnostics | `core/diagnostics.js` | Dosya yazımı sonrası JS/TS hata tespiti |
| Diff | `core/diff.js` | Unified diff + renkli print |

### Bellek / Vault

| Katman | Dosya | Açıklama |
|---|---|---|
| Working (anlık) | `core/session.js` | `session.msgs` — aktif context |
| Episodic | `core/daemon.js` → `core/extract.js` | Tool çağrıları dahil konuşma özeti |
| Semantic | `core/vault.js` + `core/embed.js` | `~/.orion/vault/` HTML + vektörler |
| Personalized | `~/.orion/config.json` | Kullanıcı ayarları, tier2Backend |
| Shannon filtresi | `core/daemon.js checkNovelty()` | Benzerlik >0.82 → kaydetme |
| Lovelace digest | `core/vault.js writeDigest()` | 30dk idle → haftalık özet |
| VaultMap | `core/vaultmap.js` | PCA + k-means SVG harita |
| Hebbian | `core/vault.js decayActivations()` | Uyku-konsolidasyon |

### TUI

| Bileşen | Dosya | Açıklama |
|---|---|---|
| Tema + render | `tui/index.js` (379 satır) | Truecolor, markdown renderer |
| Sticky input | `tui/index.js` → `stickySetup/Refresh/MoveToContent` | Scroll region, altta sabit |
| Input bloğu | `inputBoxTop` + `makeInputPrompt` + `refreshInputFill` + `finishUserTurn` | Dolgulu blok: bant + canlı zeminli satır, Enter'da kalıcı çizim; asenkron mesajlar `notifyAbove` ile bandın üstüne |
| Masked input | `tui/masked-input.js` | API key girişi, echo yok |
| Select input | `tui/select-input.js` | Arrow-key seçim, clack bağımlılığı yok |
| Fuzzy picker | `tui/fuzzy-picker.js` + `tui/fuzzy.js` | Yazarak-filtrele model seçici + typo-toleranslı eşleştirici |
| Tool format | `print.tool / print.result` | `* ToolName "arg"` / `→ result` |

### Backends

| Backend | Dosya | Auth |
|---|---|---|
| Anthropic | `backends/anthropic.js` | `ANTHROPIC_API_KEY` (credentials.json) |
| Ollama | `backends/ollama.js` | Yerel, anahtar gerekmez |
| OpenRouter | `backends/openrouter.js` | `OPENROUTER_API_KEY` |
| OpenAI | `backends/openai.js` | `OPENAI_API_KEY` |
| HuggingFace | `backends/huggingface.js` | `HF_TOKEN` |
| Custom (BYOK) | `backends/custom.js` | `~/.orion/providers.json` |

BYOK key kaydetme akışı: `maskedInput` → `process.env[keyEnv]` (bu oturum) + `credentials.json` (kalıcı).

### Araçlar (AI'ın kullanabildiği)

| Araç | Dosya | İşlev |
|---|---|---|
| read_file, write_file, edit_file | `tools/fs.js` | Dosya okuma/yazma/düzenleme (CRLF normalize, diff + checkpoint) |
| multi_edit | `tools/fs.js` | Tek dosyada birden fazla değişikliği atomik uygula |
| apply_patch | `tools/fs.js` | Unified diff (patch) formatını uygula (çoklu hunk, fuzzy) |
| insert_at_line | `tools/fs.js` | Belirli satıra içerik ekle (string eşleşmesi gerekmez) |
| replace_in_files | `tools/fs.js` | Çoklu dosyada arama+değiştirme (proje-geneli refactoring) |
| file_outline | `tools/fs.js` | Dosya yapısını hızla göster (fn/class/import, satır numarasıyla) |
| list_files, glob_files, search, file_info, create_dir, delete_file, move_file | `tools/fs.js` | Dosya sistemi gezinme ve arama |
| run_command | `tools/shell.js` | Shell komutu (workspace trust / ORION_ALLOW_COMMANDS ile oto-onay) |
| git_status, git_diff, git_log, git_add, git_commit | `tools/git.js` | Git entegrasyonu |
| git_show | `tools/git.js` | Belirli commit'in diff+metadata'sını göster (HEAD, hash, HEAD~N) |
| git_blame | `tools/git.js` | Satır bazlı blame — kim/ne zaman/hangi commit, satır aralığı desteği |
| memory_read, memory_append | `tools/memory.js` | Kalıcı metin belleği |
| vault_search, vault_recent, vault_read | `tools/vault.js` | Vault arama/okuma |
| web_fetch | `tools/web.js` | Web içeriği getir (SSRF korumalı, HTML→metin) |
| MCP araçları | `core/mcp.js` | `mcp__serverName__toolName` |

### Komutlar

**Session:** `/gecmis` `/sessions` `/load` `/delete` `/dal` `/tree` `/checkpoint`  
**Model/Provider:** `/model` `/provider` `/provider presets` `/provider add` `/provider key`  
**MCP:** `/mcp` `/mcp connect` `/mcp tools` `/mcp add` `/mcp disconnect`  
**Bellek:** `/memory` `/skill` `/skill mine` `/vault` `/vault map` `/vault digest`  
**Analiz:** `/stats` `/budget` `/router` `/weakness` `/entropy`  
**Araçlar:** `/read` `/search` `/diff` `/subagent` `/coordinator`  
**Ayar:** `/settings` `/language` `/mode` `/plugin`

---

## Testler

| Dosya | Kapsam |
|---|---|
| `budget.test.js` | Maliyet hesaplama |
| `router.test.js` | Thompson + routing mantığı |
| `tools.test.js` | Tool dispatch |
| `checkpoint.test.js` | Snapshot oluştur/geri al |
| `diagnostics.test.js` | JS/TS hata tespiti |
| `openai-compat.test.js` | OpenAI-uyumlu API |
| `plugins.test.js` | Plugin yükleme |
| `vault.test.js` | Vault yazma/okuma/Shannon |
| `diff.test.js` | Unified diff |
| `cache.test.js` | KV prefix cache |
| `events.test.js` | SSE olay protokolü |
| `provider.test.js` | BYOK key yönetimi |
| `weakness.test.js` | Weakness mining |
| `freeenergy.test.js` | FEP scoreOption |
| `speculex.test.js` | Spekülatif önbellek |
| `fs.test.js` | Dosya sistemi araçları |
| `select-input.test.js` | Arrow-key select |
| `tui.test.js` | TUI bileşenleri |
| `slashmenu.test.js` | "/" komut açılır menüsü |
| `fuzzy.test.js` | Typo-toleranslı fuzzy eşleştirici (jcode portu) |
| `fuzzy-picker.test.js` | Yazarak-filtrele model seçici |
| `web.test.js` | web_fetch: HTML→metin, SSRF koruması |
| `turnmemory.test.js` | Oturum-içi turn belleği |
| `accounts.test.js` | Çoklu hesap profilleri |
| `harness-import.test.js` | Claude Code oturum devralma |
| `selfdev.test.js` | Self-dev + komut hot-reload |
| `skills-lazy.test.js` | Tembel skill eşleştirme |
| `lmstudio.test.js` | LM Studio backend |
| `fs-sandbox.test.js` | fs araçları workspace sandbox sınırı |
| `extract.test.js` | Model fallback embedding filtresi + `stripThinking` (2026-07-13) |
| `speculex-integration.test.js` | Spekülatif prefetch ↔ session.js entegrasyonu, KATI SINIR kanıtı (2026-07-13) |
| `freeenergy-shadow.test.js` | FEP gölge kararı ↔ gerçek router kararı, sapma raporu (2026-07-13) |
| `silent-catch.test.js` | `silent_catch_hit` görünürlük kanalı (2026-07-13) |
| `git.test.js` | git_show / git_blame araçları (8 test) |
| `coordinator.test.js` | Multi-agent koordinatör: plan/execute/review, parallel fix (22 test) |
| **Toplam** | **320 / 320 ✅** |

---

## Son Oturumda Yapılanlar (2026-07-18-F) — opencode/jcode/kilocode araştırması + Artifact Index

### Artifact Index — `core/session.js`

**Eklenen:** `this._touchedFiles = new Set()` — her başarılı yazma araç çağrısından sonra (`write_file`, `edit_file`, `multi_edit`, `apply_patch`, `insert_at_line`, `replace_in_files`, `delete_file`, `move_file`, `create_dir`) dosya yollarını otomatik kaydeder. `_callToolCached()` 6. parametresi `touchedFiles = null` — backward compatible. Tüm 4 backend loop çağrısı `this._touchedFiles` geçiyor.

**compact() iyileştirmesi:** Özet prompt'una "machine-tracked" dosya listesi eklendi — LLM hangi dosyaların değiştirildiğini artık iletmek zorunda değil. Compact sonrası `[Artifact index (...)]` summary mesajına append edilir — sıkıştırılmış bağlamda bile güvenilir dosya listesi kalır.

### Tur sayacı TUI başlığında — `tui/index.js` + `core/session.js`

**Eklenen:** `aiTurnStart(mode, backend, turnInfo = null)` — üçüncü parametre tur numarasını gösterir. Her backend loop başında `[${this._turnCount + 1}]` etiketi geçiyor. Kullanıcı kaçıncı turda olduğunu görür (`agent · anthropic [3]`).

### Araştırma: opencode / jcode / kilocode GitHub

Araştırma ajanı opencode/jcode/kilocode mimarilerini inceledi. Ana bulgular ve Orion'a uyumu:
- **Streaming-first** — ZATEN VAR (onToken callback + SSE events)
- **Surgical edits** — ZATEN VAR (edit_file, insert_at_line, apply_patch)
- **Artifact index** — ŞİMDİ UYGULANDI (bu oturum)
- **Subagent scoping** — ZATEN VAR (coordinator roles)
- **Token transparency** — ZATEN VAR (statusline ctx%)
- **Steer interrupt** — ertelenmiş (readline entegrasyonu karmaşık)

---

## Son Oturumda Yapılanlar (2026-07-18-E) — Code Agent Sağlamlaştırma (Faz 6)

### `_ollamaReactLoop` telemetri bug düzeltildi — `core/session.js:1050`

**Bug:** `_ollamaReactLoop` içindeki araç çağrısı `tools.callTool()` kullanıyordu — `_callToolCached()` yerine. Bu demekti ki: Ollama ReAct modunda araç çağrıları telemetry'ye kaydedilmiyordu, spekülatif cache isabet kontrolü yapılmıyordu ve `/log` komutu bu çağrıları hiç göstermiyordu.

**Düzeltme:** `tools.callTool(call.name, call.input ?? {}, this.id)` → `_callToolCached(this._specCache, call.name, call.input ?? {}, this.id, this.telemetry)`. Artık diğer üç loop ile tutarlı.

### Koordinatör rol bazlı timeout — `core/coordinator.js`

**Sorun:** Tüm roller (researcher, coder, reviewer) için subagent.run() varsayılan 300s (5 dk) kullanılıyordu. Coder'ın testleri çalıştırıp düzeltmesi için 5 dk yeterli değil; researcher için ise gereksiz uzun.

**Düzeltme:** `ROLE_TIMEOUT_MS = { researcher: 120_000, coder: 600_000, reviewer: 180_000 }` sabiti eklendi. `runOne()` bu değeri `subagent.run()` çağrısına geçiriyor.

### Koordinatör PLAN_PROMPT'a workspace bağlamı — `core/coordinator.js`

**Sorun:** Planlayıcı LLM, workspace'deki dosyaların listesini göremiyordu. "Önce dosyaları bul" gibi genel subtasklar üretiyordu. Spesifik dosya yolları girmeden plan yazmak mümkün değildi.

**Düzeltme:** `_workspaceTree(workspace)` helper'ı eklendi — üst düzey dizin listesi + package.json scriptleri. PLAN_PROMPT'a enjekte ediliyor. Hata durumunda sessizce boş string döner.

### Reviewer başarısızlık → coder otomatik yeniden deneme — `core/coordinator.js`

**Sorun:** Reviewer "2 tests failed" veya "FAIL" rapor ettiğinde koordinatör bunu görmezden gelip sonucu kabul ediyordu. Kullanıcı bunu manuel olarak /swarm ile yeniden başlatmak zorundaydı.

**Düzeltme:** `_reviewFailed(text)` fonksiyonu eklendi — muhafazakar regex (FAIL büyük harf, sayı+test+failed, compilation failed vb.). `runCoordination()` ilk review sonrası bu kontrol yapar; başarısızlık tespit edilir ve plan coder subtask içeriyorsa bu subtasklar reviewer feedback'i ile birlikte bir kez daha çalıştırılır. Ardından re-synthesis yapılır.

**Test eklendi:** `tests/coordinator.test.js` — "reviewer failure triggers coder retry" (23. test, artık 320/320 ✅).

### `_trim()` kod bağlamı koruması — `core/session.js`

**Sorun:** `_trim()` 60 mesaj limitini aşınca eski mesajları 200 karakter kısayarak özetliyordu. Araç sonuçları (kod, test çıktısı, diff) çoğunlukla bu sınırın içine sığmıyordu.

**Düzeltme:** Mesaj tipi bazlı adaptif kısaltma:
- Araç sonuçları (<<<RESULT>>> veya [Tool: başlıklı): baş 200 + kuyruk 300 (head+tail, toplam 500)
- Diğer mesajlar: 200 → 400 karakter

---

## Son Oturumda Yapılanlar (2026-07-18-C) — Code Agent Sağlamlaştırma (Faz 5)

### Coordinator tier1 fallback — `core/coordinator.js`

**Önceki bug:** `runOne()` tier1 rolleri (researcher, reviewer) için her zaman `backend="ollama"` hardcode etti. Ollama çalışmıyorsa subagent `process.exit(1)` ile ölüyor, coordinator boş çıktı alıyor ve sonucu garbage oluyor.

**Düzeltme 1:** `runOne()` opsiyonel `forceTier` parametresi aldı. Retry döngüsü artık tüm roller için (sadece coder değil) ilk başarısızlıkta tier2 ile yeniden dener.

**Düzeltme 2:** `cfg.tier1Backend` config alanı eklendi (default `"ollama"`) — `core/router.js` DEFAULTS'a eklendi. Coordinator bu alanı kullanıyor.

**Düzeltme 3:** researcher/reviewer de Ollama yoksa artık tier2 backend'e (anthropic/openrouter vb.) geçiyor — daha önce sessizce başarısız oluyordu.

### Budget limiti aktif edildi — `core/session.js`

**Önceki bug:** `BudgetTracker.isExceeded()` hiç çağrılmıyordu — `$` limiti statusline'da gösteriliyordu ama hiç uygulanmıyordu.

**Düzeltme 1:** `send()` başında `budget.isExceeded()` kontrolü eklendi — limit aşıldıysa hata fırlatır, kullanıcıya `/budget` veya `/reset` önerilir.

**Düzeltme 2:** Session constructor'da `new BudgetTracker(1.0)` → `new BudgetTracker(router.loadConfig().sessionBudgetUSD ?? 1.0)` — `/settings budget <usd>` ile kaydedilen değer artık oturumda geçerli.

---

## Son Oturumda Yapılanlar (2026-07-18-B) — Code Agent Sağlamlaştırma (Faz 4)

### Paralel araç çalıştırma — `core/session.js`

Anthropic, OpenAI ailesi ve Ollama native loops'ta: aynı round'da birden fazla **salt-okunur** araç (`PARALLEL_SAFE` kümesi: `think`, `read_file`, `file_outline`, `read_many_files`, `list_files`, `glob_files`, `search`, `file_info`, `git_*`, `memory_read`, `vault_*`, `web_fetch`) varsa `Promise.all` ile paralel çalıştırılır. Görsel çıktı sıra korunarak basılır. Telemetry'de `parallel_tools` olayı kaydedilir.

Sistem promptuna eklendi (TR + EN): "Keşif yaparken tek yanıtta birden fazla salt-okunur araç çağır — otomatik paralel çalışır."

### Renkli diff görselleştirme — `orion.js` + `core/session.js`

`edit_file` / `write_file` sonrası ```diff blokları artık CLI'da renkli gösterilir:
- `session.js`: `_emitDiff` çağrısı `print.result(out)` SONRASINA taşındı (tüm 4 loop: `_anthropicLoop`, `_openaiFamilyLoop`, `_ollamaLoop`, `_ollamaReactLoop`)
- `orion.js`: `diff` event listener eklendi (`!isHeadless`) → `print.diff(payload.diff)` çağrır

---

## Son Oturumda Yapılanlar (2026-07-18) — Code Agent Sağlamlaştırma (Faz 3)

### `git_show` + `git_blame` araçları — `tools/git.js`

- **`git_show <ref>`**: commit hash, `HEAD~N`, tag veya `HEAD` için tam diff+metadata. 8000 karakter kırpma. SAFE_TOOLS ve plan mod `onlyTools` listesine eklendi.
- **`git_blame <path> [from/to]`**: `--line-porcelain` çıktısını insan okunabilir `satır hash tarih yazar | içerik` formatına dönüştürür. Satır aralığı desteği.
- Sistem promptuna her iki araç için rehber eklendi (TR + EN).
- 8 yeni test: her araç için 4 (HEAD, ref, geçersiz ref, kırpma).

### Workspace güven mekanizması düzeltildi — `orion.js`

**Önceki bug:** `--trust` flag ve `ORION_WORKSPACE` env trust gate'i atlıyordu ama `ws.trustDir()` çağırmıyordu → her `run_command` yine onay istiyordu (terminal kırıktı).

**Düzeltme:** Tüm üç yol (interaktif onay, `--trust` flag, `ORION_WORKSPACE` env) artık `ws.trustDir()` çağırıyor → çalışma alanı `~/.orion/config.json`'a kalıcı kaydediliyor → `run_command` otomatik onaylanıyor.

### Multi-agent parallel bug düzeltildi — `core/coordinator.js`

**Önceki bug:** `subtasks.map(runOne)` çağrısı dizin sırasını (`0, 1, 2...`) `previousOutputs` argümanı olarak geçiriyordu (Array.prototype.map üç argüman iletir: item, index, array) → blackboard bağlamı hiç enjekte edilmiyordu.

**Düzeltme:** `subtasks.map(s => runOne(s, []))` — boş dizi açıkça geçirilir. Ayrıca `streamToParent: !process.argv.includes("--headless")` eklendi; koordinatör ilerlemesi ebeveyn terminale satır satır yansır.

### Tool result 50KB kap — `core/tools.js`

`TOOL_RESULT_CAP = 50_000` sabitlenmiş boyut sınırı. Baş kısım (1/4) + kuyruk ağırlıklı (3/4) kırpma. Tüm araç yürütme yollarına uygulanır (dinamik, registry, builtin).

### MAX_ITERS 25 → 40 — `core/session.js`

Karmaşık çok-dosya görevlerde erken kesilmeyi önler. Döngü koruması (aynı araç+argüman tespiti) zaten aktif — sonsuz döngüye girmez.

### Hata kurtarma rehberi — `core/session.js` sistem promptu

`## Error Recovery` bölümü (TR + EN): `edit_file` `old_str not found`, `N occurrences`, `run_command` exit non-zero, syntax error, `apply_patch` başarısızlık ve döngüde kalma için kesin adımlar.

### Büyük dosya okuma rehberi — `core/session.js` sistem promptu

`- Büyük dosyalar için: read_file'da offset+limit kullan` ve `- Önce file_outline ile yapıyı gör` rehberleri TR + EN sistem promptuna eklendi.

---

## Son Oturumda Yapılanlar (2026-07-15-B) — Entropy + Search Filter + Model stdin Düzeltmesi

### `/entropy` komutu (yeni) — `core/commands/entropy.js`

Statik karmaşıklık analizi; harici bağımlılık yok (regex + brace-matching):
- **Döngüsel karmaşıklık (CC)** — fonksiyon başına McCabe; `if/while/for/catch/case/&&/||/??` sayımı
- **LOC** — yorum/boş satır filtrelenmiş
- **Maksimum nesting derinliği** — brace sayacı
- **Maintainability Index** — basitleştirilmiş MS MI (Halstead Volume olmadan)
- Eşikler config'den: `entropy.ccWarn` (≥15 ⚠), `entropy.locWarn` (≥300 ⚠), `entropy.nestWarn` (≥6 ⚠)
- Terminal tablosu + `~/.orion/reports/entropy-<tarih>.md` markdown raporu
- `--explain` bayrağı: ham metrik tablosunu yerel Ollama modeline verip 2-3 cümlelik özet ister
- Alias: `/architect-entropy`, `/ae`

**Gerçek session.js çıktısı:**
```
core/session.js      LOC=704  CC=33  Nest=7  MI=33.4  ⚠ yüksek karmaşıklık
  → send() fonksiyonu CC=33 (en karmaşık)
```

### `search` ignore filtresi — `tools/fs.js`

Varsayılan olarak atlanan dizinler: `node_modules`, `.git`, `dist`, `build`, `coverage`, `.next`, `.cache`
- **rg**: `--glob=!node_modules/**` vb. parametreler
- **grep**: `--exclude-dir=node_modules` vb.
- **Node.js fallback**: SKIP set genişletildi (önceki `dist/build` vardı, `.next/.cache/coverage` eklendi)
- `includeIgnored: true` ile devre dışı bırakılabilir — mevcut çağıranlar etkilenmez

**Önce/sonra timing (bu repoda, rg ile):**

| Mod | Süre | Sonuç satırı |
|---|---|---|
| Varsayılan (ignore=on) | 153ms | 32 |
| includeIgnored=true | 10.094ms | 47 |

~66× hız farkı — node_modules 400+ paketi içeriyor.

### speculex.js — açıklayıcı yorum eklendi

search için ek "scope-too-large" guard eklenmedi; fs.js ignore filtresi + 10sn timeout yeterli.

### `/model` stdin sorunu düzeltildi — `core/commands/model.js`

`fuzzyPicker.cleanup()` `stdin.pause()` çağırıyordu ama `rl.resume()` yoktu → sohbete yazılamazdı.
`exec` artık `rl` alıyor, fuzzyPicker `rl.pause()/finally→rl.resume()` sarmalanıyor.

### OpenRouter key migrasyonu

`providers.json: {"openrouter":{"key":"..."}}` → `credentials.json: {"OPENROUTER_API_KEY":"..."}`
`/provider key openrouter <key>` artık doğru yere yazıyor.

---

## Son Oturumda Yapılanlar (2026-07-15-A) — Code Review + TUI Taşıma + Embed Doğrulama

### TUI Yeniden Yapılandırma

`core/tui/` dizinindeki dört bileşen dosyası (`fuzzy.js`, `fuzzy-picker.js`,
`masked-input.js`, `select-input.js`) `tui/` dizinine taşındı. `core/skills.js`,
`core/commands/model.js`, `core/commands/saglayici.js` ve ilgili test dosyalarındaki
`require()` yolları güncellendi. `core/tui/` artık yok.

### Code Review — 5 Bulgu Düzeltildi

`/code-review` komutuyla şu anki diff tarandı, 5 bulgu doğrulandı ve hepsi düzeltildi:

| # | Dosya | Bulgu | Düzeltme |
|---|---|---|---|
| 1 | `core/vault.js:260` | `_keywordSearch` 2-karakterli tokenları (`js`, `ai`, `go`) filtreden geçirmiyordu (`t.length > 2`) → vault bağlamı bu sorgularda boş geliyordu | `t.length > 1` yapıldı |
| 2 | `core/freeenergy.js:126` | `computeSurprise()` reject olunca `_evalMemo.promise` 10s boyunca poisoned promise saklıyordu — tüm çağırıcılar aynı hatayla döndü | `promise.catch(() => { if (_evalMemo.promise === promise) _evalMemo.promise = null; })` eklendi |
| 3 | `core/freeenergy.js:284` | `aggregateShadowReport()` bare `catch {}` — telemetri okuma hatası "veri yok" ile ayırt edilemiyordu | `emitSilentCatch("freeenergy.js:aggregateShadowReport", err)` |
| 4 | `core/router.js:62` | `decide()` içindeki dış `try/catch` ölü kod — `shadowHook` zaten kendi guard'ına sahip | Dış wrapper kaldırıldı |
| 5 | `core/freeenergy.js:resetShadowStats` | Testler `resetShadowStats()` çağırınca `_evalMemo` sıfırlanmıyordu — paylaşımlı singleton kirleniyordu | `_evalMemo = { text: null, ts: 0, promise: null }` eklendi |

Test sonucu: **211/211 ✅** (4 yeni test dosyası dahil)

### Embedding Doğrulama

`core/embed.js` (`nomic-embed-text`, Ollama port 11434) canlı olarak test edildi:
- `isAvailable()` → `true`
- `embedText("test")` → `Float32Array(768)` OK
- `cosineSim(vec1, vec2)` → `0.33` (farklı metinler, mantıklı)
- MCP `vault_ara "FEP freeenergy shadow routing"` → ilgili oturumu döndürdü ✅

`vault_ara`'nın %100 benzerlik skoru sorusu (07-13 açık maddesi): gerçek embedding
devrede, `cosineSim` değerleri 0-1 arasında dağılıyor. Vault'ta henüz 5 oturum olduğu
için isabeti ölçmek güç — içerik arttıkça anlamlılaşacak.

---

## Son Oturumda Yapılanlar (2026-07-13) — V→F→B→C→S Zinciri

### Bağlam ve karar

Bu oturum, aşağıdaki "Açık/Sıradaki" tablosundaki İş A/B/C'nin **2026-07-11'de
"Düzeltildi ve doğrulandı" olarak kapatılmış olmasına rağmen**, canlı bir
testte (İş V) hâlâ aynı aile hatayı üretmesiyle başladı. Bu, PERSONA.md
Kural 7'nin ("eski sonuca bile şüpheyle bak") doğrudan bir uygulaması oldu —
"zaten doğrulandı" etiketi yeniden bakılana kadar sadece bir varsayım olarak
ele alındı ve haklı çıktı: 07-11'in doğrulaması **yeterince derin değildi**
(bkz. aşağıdaki "07-11 doğrulamasıyla uzlaştırma").

Üç bağımsız sessiz-hata örneği (weakness-mining yanlış model adı, embedding
modelinin sessizce yok sayılması, `extractWithOllama`'da `<think>` bloğu
temizlenmeden parse) karşısında iki seçenek vardı: (1) weakness-mining'i
genişletip bu sınıf hataları "tespit ettirmek", (2) kaynağı tek seferlik
sistemik bir taramayla kapatmak. **Karar #2 idi** — bu, weakness-mining'i
basit/dar tutma kararını da otomatik olarak doğru seçenek yaptı, çünkü kaynak
kapatılınca tespit edilecek yeni bir hata sınıfı kalmadı.

Dört ayrı, birbirinin dosyasına dokunmayan prompt olarak yürütüldü (paralel
ajanlar çakışmasın diye): **V** (gözlem, kod yok) → **F** (kök-neden,
`core/extract.js`) → **B** (`core/speculex.js`+`core/session.js`, paralel) →
**C** (`core/freeenergy.js`+`core/router.js`+`core/commands/router.js`,
paralel) → **S** (sistemik catch taraması, B/C bitince tek başına — çünkü
B/C'nin değiştirdiği dosyaları da tarayacaktı). `EVENT_TYPES`'a
`speculex_hit`/`speculex_miss`/`router_shadow_decision` event tipleri B/C
başlamadan **önce tek elden** `core/events.js`'e eklendi ki üç iş de aynı
dosyaya yazmak zorunda kalmasın.

### İş V — Canlı doğrulama (kod yok, gözlem)

| Adım | Bulgu |
|---|---|
| `ollama list` | `nomic-embed-text` kurulu değildi (kurulu: `vibethinker`, `ornith`, `qwen-coder`) |
| `ollama pull nomic-embed-text` | 274 MB indirildi, doğrulandı |
| Gerçek modda `node orion.js`, canlı `/vault kaydettir` | Üretilen HTML: `<h1>[user]: ...[assistant]: \`setMaxListeners(n)\` bir Ev</h1>`, `orion-tags="claude-code,manuel"`, Kararlar/Kavramlar/Hatalar bölümleri **boş** — ham alıntı, gerçek özet değil |
| `/vault ara` aynı oturumda | Az önce kaydedilen girdi döndü (boş değil) ama skor **%100** — cosine'dan çok keyword eşleşmesi kokusu, embedding'in arama tarafında gerçekten devrede olup olmadığı bu turda ayrıca doğrulanmadı (açık kaldı) |

**İroni:** V'nin kendi 2. adımı (embedding modelini kurmak), `resolveOllamaModel`'in
o zamanki (07-11'den kalma) "kurulu ilk modele düş" mantığını **daha da
kötüleştirdi** — pull sonrası `/api/tags`'in ilk sırasına çoğunlukla
`nomic-embed-text` (chat bile yapamayan bir model) geldi. "Düzeltme" sanılan
bir adımın yeni bir sessiz-hata yolu açabileceğinin canlı kanıtı.

### İş F — Extraction kök-neden düzeltmesi (`core/extract.js`)

V'nin bulduğu ham-alıntı sorununun kök nedeni iki parçalıydı:

1. **`resolveOllamaModel`** (satır 82-95) artık `/api/tags`'i isim + model
   ailesiyle (`details.family(ies)`) okuyor; `_isEmbeddingModel()` filtresiyle
   embedding-only modelleri (`nomic-embed`, `mxbai-embed`, `bge`... isim veya
   `bert`/`embed` ailesi) fallback adayı olmaktan **eliyor**. Hepsi embedding
   ise istenen adla deniyor ki hata görünür kalsın (sessizce başka bir şeye
   kaymıyor).
2. **`extractWithOllama`** (satır 131-163) artık `JSON.parse`'tan önce zaten
   tanımlı-ama-hiç-çağrılmayan `stripThinking()`'i çağırıyor — thinking
   modelleri (`vibethinker` vb.) `<think>...</think>` bloğunu JSON'dan önce
   basıyordu, temizlenmeden parse her denemede patlıyordu.
3. `~/.orion/config.json`'a `tier1Model: "qwen-coder:latest"` yazıldı (bu
   makinede kurulu gerçek ada sabitlendi). **Bilinçli olarak `core/router.js`
   DEFAULTS'a dokunulmadı** — hem C ajanı o dosyada eşzamanlı çalışıyordu hem
   de `qwen-coder:latest` makineye özgü bir ad, evrensel kod varsayımı olarak
   yanlış olur.

**Canlı doğrulama** (V ile birebir aynı akış, farklı soru): üretilen HTML'de
Kararlar dolu ("Promise.allSettled kullanmak daha güvenli…"), Kod Kalıpları
2 snippet, Kavramlar 3 madde, **`manuel` etiketi yok**. Test: `tests/extract.test.js`
(3 test) — mock Ollama'da embedding modeli **bilerek ilk sırada** kurularak
(hatayı yeniden üreten dizilim) filtrenin gerçekten çalıştığı kanıtlandı.

### İş B — Spekülatif salt-okunur yürütme (`core/speculex.js` + `core/session.js`)

`core/session.js:246`'da tier2 rotasında `speculex.startPrefetch()` çağrısı
zaten **vardı** (07-11'in İş B notu "session.js'e entegre değil" artık yanlış
bir varsayımdı — kod okunarak düzeltildi). Gerçek problem, İş V/F'yle **aynı
kök aileden** bir başkasıydı: tahmin prompt'undaki örnek `list_files` için
`{"path":...}` kullanıyordu, gerçek araç şeması `{dir}` — cache anahtarı
tool+input JSON'unun **tam eşleşmesi** olduğundan bu, `list_files`/`search`
isabetini yapısal olarak imkânsız kılıyordu. 07-11'in doğrulaması bu
detayı yakalamamıştı (bkz. aşağı, "07-11 doğrulamasıyla uzlaştırma").

| Değişiklik | Dosya | Not |
|---|---|---|
| Tahmin prompt şeması gerçek araç şemalarıyla hizalandı | `core/speculex.js` | `list_files`/`search` isabeti artık yapısal olarak mümkün |
| Girdi tüketim takibi (`consumed`) + `generation` tur çiti | `core/speculex.js` | Geç biten prefetch yeni turun cache'ini kirletemiyor |
| `drainUnconsumed(expectedGen)`, `get()`'e opsiyonel `sessionId` (TTL) | `core/speculex.js` | Tüketilmeyen/TTL'i kaçıran tahminler `speculex_miss` ile görünür |
| `_callToolCached` isabette `speculex_hit` yayınlar | `core/session.js` | — |
| `send()` tier2 dalında prefetch promise + generation yakalanır, `finally`'de `_sweepSpeculexMisses` | `core/session.js` | Hata `speculex_miss reason:"error"` olarak yayınlanır, kullanıcıya asla yansımaz |

**KATI SINIR kanıtı** (`tests/speculex-integration.test.js`, 6 test): tahminci
*kasıtlı olarak* `write_file`/`edit_file`/`run_command` döndürse bile
hiçbiri yürütülmüyor/cache'lenmiyor; cache'e zorla write girdisi enjekte
edilse bile `get()` çiti derinlemesine savunmayla dönüşü engelliyor.

**Ölçüm** (yarı-gerçek: tier1 gerçek Ollama ile gerçekten yürütüldü, tier2
tarafı bulut maliyeti olmasın diye 10 senaryoda elle ground-truth): **%80
isabet (8/10)**. Iskalar makul cinsten (farklı path tahmini, `memory_read`
yerine `read_file`). Tur başına beklenen gecikme kazancı **~2.0 sn**
(`search` aracının ~10 sn sürmesi domine ediyor; fs araçları ~1ms, ihmal
edilebilir). Dürüst sınır: prefetch 2.4–15.8 sn sürebiliyor — tier2 daha
hızlı yanıtlarsa girdi geç kalır, bu durumda regresyon yok, sadece
`speculex_miss reason:"unused"`.

**Kapsam dışı bırakılan iki gözlem** (raporlandı, dokunulmadı): `search`
aracı muhtemelen `node_modules`'ı tarıyor (ignore filtresi ayrı iş olarak
değerli — speculex'in en değerli hedefini de hızlandırır); spekülasyon
yalnızca router'ın tier2 kararında tetikleniyor, kullanıcı `_manualBackend`
ile bulut backend'i elle seçtiğinde prefetch hiç çalışmıyor.

### İş C — FEP gölge modu telemetri (`core/freeenergy.js` + `core/router.js` + `core/commands/router.js`)

`core/router.js`'te `decide()` ikiye bölündü: gerçek karar mantığı bayt bayt
aynı şekilde `_decideCore()`'a taşındı, `decide()` kararı alıp fire-and-forget
bir `shadowHook`'u ateşleyip kararı **değiştirmeden** döndürüyor.
`core/freeenergy.js`'e tek hesap noktası (`evaluateShadow`, 10 sn memo —
aynı turda `shadowHook` ve session.js'in önceden var olan `shadowLog`
çağrısı sürprizi/embed'i **bir kez** hesaplıyor), sayaç + `router_shadow_decision`
event yayını (`recordShadow`) ve kalıcı NDJSON loglarından okuyan
`aggregateShadowReport` eklendi. `session.js:251`'deki mevcut `shadowLog`
çağrısına dokunulmadı (kapsam dışıydı) — çift sayım riski kanalları ayırarak
çözüldü: kanca → event + oturum içi sayaç, `shadowLog` → yalnız kalıcı
telemetri. Yeni komut: **`/router shadow-report [gün]`**.

**Ölçüm** (20 turluk simüle oturum, gerçek `decide()` yolundan):

| Konfig | Sapma | Yapı |
|---|---|---|
| Varsayılan (λ=0.5, boş vault → sürpriz sabit 0.5) | 12/20 = %60 | Gölge bu konfigde hep tier2 seçiyor — sapma birebir "gerçek kararın tier1 olduğu turlar" (`balanced default` 9/9, `chat mode` 2/2, `budget exceeded` 1/1) |
| λ=1.0 + sentetik sürpriz taraması | 10/20 = %50 | Yön değişiyor: gölge yüksek sürprizli girdilerde tier1'e kayıyor |

Test: `tests/freeenergy-shadow.test.js` (8 test) — kapalıyken sıfır etki,
gerçek kararın değişmezliği, 6 turluk deterministik simülasyon, bozuk girdi
toleransı, çift-saymama, `/router shadow-report` komutu.

### İş S — Sessiz catch{} sistemik taraması (kök nedeni kapatan iş)

`core/*.js`, `core/commands/*.js`, `tools/*.js` içinde gövdesi boş/yalnız-yorum
**58 catch bloğu** tek tek elle gözden geçirildi. **44'ü zararsız/zaten-görünür**
(dosya-yoksa-varsayılan türü desenler + B/C'nin bugün event'li hale getirdiği
speculex/freeenergy gölge kanalları). **15'i sessiz-başarısızlık** olarak
`core/events.js`'e eklenen `EVENT_TYPES.silent_catch_hit` + hiçbir zaman
fırlatmayan `emitSilentCatch(site, err, sessionId?, detail?)` yardımcısıyla
görünür kılındı — hiçbir dönüş sözleşmesi bozulmadı, sadece olay kanalı
eklendi:

| Site | Detail | Neden görünür kılındı |
|---|---|---|
| `core/extract.js:148` `extractWithOllama` | `manuel-fallback` | Manuel yedek "başarı gibi" dönüyordu (bu zincirin başlangıç noktası) |
| `core/i18n.js:28` `setLocale` | — | Dil bellekte değişip diske yazılamayınca "kaydedildi" izlenimi kalıyordu |
| `core/skills.js:189` `findRelevantSkills` | `embed-yolu` | Embedding→fuzzy sessiz düşüş |
| `core/skills.js:205` `findRelevantSkills` | `fuzzy-yolu` | Fuzzy de başarısızsa boş sonuç ayrımsızdı |
| `core/thompson.js:80` `_save` | — | Bandit öğrenmesi süreç kapanınca sessizce kayboluyordu |
| `core/vault.js:194` `writeSession` | `vectors` | Vektör yazılamayınca oturum semantik aramada görünmez ama "kaydedildi" raporlanıyordu |
| `core/vault.js:202` `writeSession` | `rebuildGraph` | `graph.html` sessizce bayat kalıyordu |
| `core/vault.js:250` `searchVault` | `keyword-fallback` | Embedding hatası keyword sonuçlarıyla maskeleniyordu (V'nin şüphelendiği %100 skorla aynı aile) |
| `core/session.js:233` `chat` | `vault-inject` | Bağlam enjeksiyonu sessizce yok oluyordu, "eşleşme yok" ile karışıyordu |
| `core/session.js:245` `chat` | `turn-recall` | Aynı aile |
| `core/session.js:259` `chat` | `skill-inject` | Aynı aile |
| `core/session.js:759` `_extractMemories` | — | Başarıda mesaj basılıyor, başarısızlık tamamen görünmezdi |
| `core/session.js:843` `_save` | — | **En kritik:** oturum diske yazılamasa bile `session_saved` event'i yayınlanıyordu — sessiz veri kaybı riski |
| `core/coordinator.js:68` `plan` | `parse` | Yedek tek-subtask plan gerçek plandan ayırt edilemiyordu |
| `core/daemon.js` `generateDigest` | — | Worker thread — `events.js` singleton'ı ana thread'e taşınmaz; `mineWeaknesses`'ın mevcut kanalı (`parentPort` → `daemon_error`) kullanıldı, event değil |

**Bilinçli olarak dokunulmayanlar:** `core/telemetry.js` (gözlemlenebilirlik
kanalının kendisi — disk hatasında emit fırtınası/döngü riski);
`tools/fs.js:263` grep fallback iç döngüsü (arama başına yüzlerce beklenen
hata — sıcak yol); `core/router.js`'in gölge kancası (zaten fire-and-forget);
`core/daemon.js`'in çoğu worker-thread catch'i (beklenen ilk-çalıştırma/bakım
durumları). **Yeni bulunan, kapsam dışı bırakılan bir gözlem:**
`core/coordinator.js:57`'de LLM çağrı hatası da aynı desenle sessizce yedek
plana düşüyor — S bunu raporladı, düzeltmedi (aynı desenle görünür
kılınabilir, ayrı bir iş).

Test: `tests/silent-catch.test.js` (5 test) — event şeması, fırlatmazlık
garantisi, iki gerçek site uçtan uca (`extractWithOllama` Ollama erişilemezken,
`setLocale` `saveConfig` hatasında).

### 07-11 doğrulamasıyla uzlaştırma (Kural 7 uygulaması)

Aşağıdaki tablo, 2026-07-11'de "Düzeltildi ve doğrulandı" denen maddelerin
2026-07-13'te yeniden bakılınca ne çıktığını gösteriyor — hiçbiri yanlıştı
demek değil, ama **doğrulama derinliği yetersizdi**:

| 07-11 iddiası | 07-13'te bulunan | Sonuç |
|---|---|---|
| İş A: "model bulunamama hatası artık sessizce yutulmuyor" (`data.error` kontrolü) | Doğruydu, hâlâ duruyor — ama bu, `extractWithOllama`'nın **kendi** `catch{}`'ini kapsamıyordu; o ayrı ve hâlâ açıktı | Kısmi doğru — dar kapsamlıydı |
| İş A: `resolveOllamaModel` "kurulu ilk modele düşer" | Embedding modelleri filtre dışı değildi — V'nin pull'u bunu **aktif hale getirdi** | Yanlış eksikti (embedding farkındalığı yoktu) |
| İş A: "`extractWithOllama` parse'tan önce `stripThinking` uygular" (07-11 notu) | Kod okunduğunda bu çağrı **yoktu** — sadece `speculex.js`'in kendi tahmin fonksiyonuna uygulanmıştı | Doğrulama notu, gerçek koddan ileri gitmişti |
| İş B: "Düzeltildi ve doğrulandı", "`list_files`+`read_file`, doğru path'lerle" | Tahmin prompt'unun `list_files` örneği yanlış şemaydı (`path` vs `dir`) — cache anahtarı hiç eşleşmiyordu | Doğrulama sadece "geçerli JSON üretildi mi"ne baktı, "gerçek tool girdisiyle eşleşiyor mu"ya bakmadı |
| İş C: "muhtemelen çalışıyor ama doğrulanmadı" (07-11 kendi notu) | Bugün gerçekten uçtan uca ölçüldü, ilk kez sayısal sapma oranı çıktı | Bu madde zaten dürüsttü — sadece tamamlandı |

Ders: "yazıldı ve testi geçti" ile "gerçek veriyle uçtan uca doğrulandı"
arasındaki fark, bu zincirde üç kere aynı yönde hataya yol açtı. Bundan
sonraki "Düzeltildi ve doğrulandı" notları, hangi doğrulamanın (birim test /
mock / gerçek Ollama+gerçek dosya) yapıldığını açıkça belirtmeli.

### Açık kalan, aksiyon alınmamış notlar

- `vault_ara`'nın %100 benzerlik skoru (İş V) — **kapatıldı (2026-07-15)**: gerçek embedding
  devrede, `cosineSim` 0-1 arası değerler üretiyor; vault'ta az oturum olduğu için
  dağılım henüz anlamsız, içerik arttıkça ölçülecek.
- `core/coordinator.js:57` — LLM çağrı hatası sessizce yedek plana düşüyor
  (S'nin bulduğu, dokunmadığı gözlem).
- `search` aracının `node_modules` taraması muhtemelen gereksiz yavaşlık
  kaynağı (İş B gözlemi).
- Manuel backend seçiliyken (`_manualBackend`) speculex prefetch hiç
  tetiklenmiyor (İş B gözlemi).
- TUI'deki AI turn başlığının bayat backend etiketi ("agent · openrouter"
  gösterip gerçek backend ollama olması) — TUI hattı bu oturumda ayrı bir
  akışta aktif olduğu için dokunulmadı.

---

## Son Oturumda Yapılanlar (2026-07-11)

### 10-Uzman Kod Kalite Toplantısı — Düzeltmeler

| # | Dosya | Sorun | Düzeltme |
|---|---|---|---|
| 1 | `core/vault.js` | `index.json` read-modify-write yarış koşulu (veri kaybı riski) | Promise-chain `_withIndexLock()` mutex eklendi |
| 2 | `core/vault.js` | `DEFAULT_VAULT` Windows-özel sabit yol | `os.homedir()/.orion/vault` olarak düzeltildi |
| 3 | `core/session.js` | `_trim()` Anthropic blok mesajlarını sessizce siliyordu | `_flattenMsgs()` ile değiştirildi |
| 4 | `core/session.js` | `undo()` tek elemanlı dizide `splice(-2)` güvensizdi | `msgs.length >= 2` guard eklendi |
| 5 | `core/session.js` | Modül-seviyesi interrupt durumu test edilemez, çok-session riskli | Instance'a taşındı (`_activeSession` yönlendirme) |
| 6 | `core/telemetry.js` | Her token olayında `appendFileSync` event loop'u bloke ediyordu | `setImmediate` drain buffer'ı ile async yazım |
| 7 | `core/embed.js` | LRU cache aslında LRU değildi (hit'te sıra güncellenmiyor) | `_cacheGet`'te `delete + set` ile gerçek LRU |
| 8 | `core/speculex.js` | Hata string filtresi sadece `startPrefetch`'teydi — diğer çağırıcılar korumasızdı | `set()` içine taşındı |
| 9 | `core/daemon.js` | `generateDigest` + `mineWeaknesses` aynı anda Ollama'ya gidiyordu | `generateDigest().finally(() => mineWeaknesses())` — sıralı |
| 10 | `core/daemon.js` | `mineWeaknesses`'da `ollamaRequest(prompt)` model argümanı açık değildi | `ollamaRequest(model, prompt, opts)` 3-arg form |
| 11 | `core/tools.js` | `ALL_DEFS` MCP araçlarını içermiyordu (yanıltıcı isim) | `get ALL_DEFS()` getter → `getDefs()` çağırır |

### Kritik Bug Düzeltmeleri (önceki oturum)
- **ollamaRequest arity**: 1-arg `(prompt)` ve 3-arg `(model, prompt, opts)` her ikisini destekler
- **SpeculativeCache \0 separator**: `server:tool` MCP format için key ayırıcı düzeltildi
- **Cache poisoning**: hata stringleri önbelleğe artık alınmıyor
- **Cache 50KB cap**: büyük sonuçlar önbelleği şişirmiyor
- **AbortSignal body drain**: `ping.text()` artık tüketiliyor

### CLI Yenileme (önceki oturum)
- **Chat turn yapısı**: `╭─ ozyn ─╮ / │ ► / ╰──╯` kutulu input + `─ orion ✦ ──` separator
- **Sticky input**: scroll region (`\x1b[1;N-3r`) ile input kutusu terminalde altta sabit kalır
- **Tool format**: `* ToolName "arg"` + `→ result` (opencode tarzı)
- **Tab completion**: `/` komutları için `cmdCompleter`
- **History dedup**: ardışık aynı girişler temizlenir
- **`/gecmis`**: oturum geçmişi komutu (aliases: history)

### Weakness Mining Doğrulama — Sessiz Hata Zinciri Bulundu ve Düzeltildi (bu oturum)

`/weakness` hiç rapor üretmemiş olması araştırılırken (bkz. Açık/Sıradaki → İş A), gerçek Ollama'ya karşı uçtan uca deneme yapıldı ve üç kırık nokta bulundu:

| # | Dosya | Sorun | Düzeltme |
|---|---|---|---|
| 12 | `core/extract.js` | `ollamaRequest`, Ollama'nın `{"error": "model not found"}` yanıtını sessizce `""`'e çeviriyordu | `data.error` kontrolü eklendi, artık `throw` ediyor |
| 13 | `core/extract.js` | `tier1Model` varsayılanı (`qwen2.5-coder:7b`) yerelde kurulu olmayabiliyor, hata hiç görünmüyordu | `resolveOllamaModel()`: `/api/tags`'ten kurulu modelleri okur (60sn önbellek), istenen model yoksa chat yapabilen ilk modele düşer (embedding modelleri elenir); `extractWithOllama` parse'tan önce `stripThinking` uygular |
| 14 | `core/daemon.js` | `mineWeaknesses()` boş/kısa Ollama yanıtında sessizce `return` ediyordu, hiçbir yerde iz kalmıyordu | `parentPort.postMessage({type:"error", ...})` ile `daemon_error` olayına bağlandı |

Doğrulama: sahte `≥2` tekrar eden hata kaydı + gerçek yerel Ollama ile uçtan uca test edildi. Düzeltme öncesi model bulunamama hatası 49ms'de sessizce boş dönüyordu; düzeltme sonrası gerçek kurulu modele düşüp gerçek yanıt üretiyor.

### İş B (Spekülatif Yürütme) — session entegrasyonu zaten vardı, aynı kök nedenden ölüydü (bu oturum)

PLAN.md "session.js'e entegre değil" diyordu — bu artık doğru değil: `session.js:246`
tier2 rotasında `speculex.startPrefetch()`'i zaten çağırıyordu ve `_callToolCached`
zaten `specCache`'e bakıyordu. Gerçek sorun İş A'yla **aynı kök nedendi**:
`speculex.js`'in kendi ham `fetch`'i `qwen2.5-coder:7b` kullanıyordu (yerelde yok),
JSON.parse boş yanıtta patlayıp sessizce yutuluyordu — canlı testte doğrulandı
(cache hep boş, hiç telemetry olayı yok).

| # | Dosya | Sorun | Düzeltme |
|---|---|---|---|
| 15 | `core/speculex.js` | `_predictToolCalls` kendi ham `fetch`'ini kullanıyordu — İş A'nın model/hata düzeltmesinden faydalanmıyordu | `extract.js`'in `ollamaRequest`'ine yönlendirildi |
| 16 | `core/speculex.js` | Yerel "thinking" modelleri (`vibethinker` vb.) JSON'dan önce `<think>` bloğu üretiyor, hiç temizlenmiyordu → `JSON.parse` hep patlıyordu | `stripThinking()` `extract.js`'e çıkarılıp (session.js'in `_cleanResponse`'u ile paylaşılıyor) `_predictToolCalls`'a uygulandı |
| 17 | `core/speculex.js` | Timeout 8sn — yerel thinking modeli bu donanımda 14-20sn arası değişken sürüyor, her zaman timeout'a giriyordu | 25sn'ye çıkarıldı |

Doğrulama: `ollamaRequest` doğrudan çağrılıp gerçek JSON tahmini üretildiği
gözlemlendi (`list_files`+`read_file`, doğru path'lerle, ~20sn'de). **Açık mimari
not:** tier2 (bulut) genelde bu süreden hızlı cevap verebilir — bu durumda
spekülasyon zamanında bitmeyip boşa gider (zararsız, fire-and-forget). Bu bir
kod bug'ı değil, kurulu yerel modelin hız karakteristiği — daha hızlı/thinking
yapmayan bir tier1 modeli kurulursa iyileşir.

### Provider Düzeltmesi (önceki oturum)
- **Clack kaldırıldı**: `selectInput` (arrow-key, raw mode) + `maskedInput` (custom) clack bağımlılığını tamamen devre dışı bıraktı — çift render sorunu giderildi
- **Key env senkron**: built-in provider'lar için key hem `process.env[keyEnv]`'e hem `credentials.json`'a yazılıyor

---

## Açık / Sıradaki

### Plan (öncelik sırasıyla)

| # | İş | Açıklama | Durum (2026-07-13) |
|---|---|---|---|
| A | Weakness Mining | `daemon.js`'e idle-zaman log analizi, `/weakness` komutu, onay kapılı tool güncelleme | Kaynak zinciri (model fallback + `<think>` temizliği) **kapatıldı** (bkz. İş F yukarıda), canlı doğrulandı — gerçek özet üretiyor, `manuel` etiketine düşmüyor. Genişletme yerine kaynağı kapatma kararı alındı (bkz. yukarıki "Bağlam ve karar"), weakness-mining'in kendisi hâlâ dar/basit tutuluyor — bilinçli. Onay kapılı tool güncelleme (apply) kısmı hâlâ yazılmadı. |
| B | Spekülatif yürütme | Tier2 beklerken tier1 read-only tool tahmin + önbellek | **Gerçekten ölçüldü ve KATI SINIR testle kanıtlandı** (bkz. İş B yukarıda) — %80 isabet, ~2.0sn/tur beklenen kazanç. 07-11'in "doğru path'lerle" iddiası yanlış çıktı (şema uyuşmazlığı vardı, düzeltildi). Açık: manuel backend seçiminde prefetch hiç çalışmıyor; `search` aracı `node_modules` tarıyor, yavaş. |
| C | FEP Faz 0 | `freeenergy.js` gölge modun gerçek telemetry karşılaştırmasına bağlanması | **Kapatıldı ve ölçüldü.** `/router shadow-report` komutu + `router_shadow_decision` event'i eklendi, gerçek karar hiç değiştirilmiyor. 20 turluk simülasyonda sapma oranı ve yapısı çıkarıldı (varsayılan konfigde %60, λ=1.0'da %50 farklı yönde). |
| D | Kimlik adayı | İş A/B/C bitmeden başlanmaz | A/B/C artık gerçek veriyle doğrulanmış durumda — başlanabilir, henüz başlanmadı |

### jcode Karşılaştırması Sonrası Eklenenler (2026-07-12)

jcode (github.com/1jehuang/jcode) ile satır satır karşılaştırma yapıldı; eksik bulunan
özelliklerin Node.js karşılıkları eklendi. Kapsam dışı bırakılanlar: Rust'a geçiş,
gerçek OAuth akışları (provider'ların özel client kayıtları gerekir), iOS uygulaması,
mermaid renderer, dikte/STT.

| Özellik (jcode satırı) | Orion'daki karşılığı | Dosya |
|---|---|---|
| LM Studio yerel model | Built-in backend, `http://localhost:1234/v1`, anahtarsız, canlı erişilebilirlik kontrolü | `backends/lmstudio.js` |
| Tarayıcı aracı | `web_fetch`: HTML→metin, SSRF koruması (özel ağ engelli), 3 yönlendirme, güvenilmez-veri işareti | `tools/web.js` |
| Turn embedding + pasif hatırlama | Oturum-içi turn belleği: her turn embed edilir, bağlam sıkıştıktan sonra eski turn'lerin TAM içeriği pasif geri çağrılır | `core/turnmemory.js` |
| Tembel skill yükleme | Skill'ler başta yüklenmez; mesaj embedding/fuzzy ile eşleşince o tura enjekte edilir | `core/skills.js findRelevantSkills` |
| `/account` çoklu hesap | Adlandırılmış anahtar profilleri, `~/.orion/accounts.json`, başlangıçta otomatik uygulanır | `core/accounts.js` + `commands/account.js` |
| 20+ provider | 6 yeni preset: alibaba, minimax, zai, nvidia, perplexity, sambanova (toplam 14 preset + 6 built-in) | `backends/custom.js` |
| Self-dev modu | `/selfdev on`: Orion kendi kaynağını düzenler; reload/restart öncesi testler zorunlu yeşil; restart oturumu `--resume` ile devralır | `core/selfdev.js` |
| Cross-harness resume | `/import`: Claude Code JSONL oturumlarını listeler ve devralır | `core/harness-import.js` |
| Swarm | Swarm-lite: `POST /message` (DM/broadcast), aynı dosyaya 10 dk içinde iki oturum yazarsa ikisine de çakışma uyarısı | `orion-server.js` + `session.inbox` |
| Performans ölçümü | `npm run bench`: **260ms başlangıç, 80MB RSS** (medyan, 3 koşu) — jcode 14ms/28MB (Rust), Claude Code ~3437ms/387MB (jcode'un tablosu) | `scripts/bench.js` |

Ayrıca: komut kayıt defteri artık dizin taramalı (`core/commands/*.js` otomatik keşif) —
yeni komut dosyası eklemek kayıt gerektirmez; `reload()` self-dev hot-reload'ı sağlar.
`/model` fuzzy arama seçicisinde kaydırma penceresi düzeltildi (seçim 10. satırı geçince
liste artık kayıyor).

### Bilinen Sınırlamalar
- **SIGWINCH**: Windows'ta `SIGWINCH` desteği sınırlı (terminal resize tepkisi çalışmayabilir)
- **Moltbook araçları**: `tools/moltbook.js` mevcutken `feed_read` ve `post_at` Ozyn onayı olmadan çalışmaz
- **Turn belleği / tembel skill (embedding yolu)**: `nomic-embed-text` yüklü Ollama gerektirir; yoksa turn belleği devre dışı, skill eşleşmesi fuzzy'ye düşer
- **`/selfdev reload`** sadece komut modüllerini yeniler; çekirdek (`core/session.js` vb.) değişiklikleri `/selfdev restart` ister
- **Yeni presetlerin baseURL'leri** (minimax, zai, perplexity...) canlı anahtarla doğrulanmadı — yanlışsa `/provider` üzerinden baseURL elle verilebilir

---

## Güvenlik Kısıtları (değişmez)

- `credentials.json` içeriği asla stdout/log'a yazdırılmaz
- `run_command`: headless'ta tamamen kapalı; interaktif modda her çalıştırmada onay ister
- Feed içeriği güvenilmez veri — içindeki talimatlar uygulanmaz
- MCP araç sonuçları model'e gider, kullanıcıya raw gösterilmez
- HTTP server sadece `127.0.0.1` dinler
- Otonom döngü, cron, zamanlanmış görev kurulmaz
