# 5. Güvenlik Sınırları ve Çoklu-Ajan Mimarisi

**Perspektif:** Sistem kendisini (yanlış yola sapan bir model, tehlikeli bir
komut) ve kullanıcıyı nasıl koruyor? Bir alt-ajan ana ajandan nasıl izole
ediliyor?

## 5.1 Dosya sistemi sandbox'ı — allowlist, denylist değil

`tools/fs.js:12-45` — tüm dosya araçları `_guardPath()` üzerinden geçer.
Tasarım **allowlist** temelli (blacklist değil): izin verilen tam olarak iki
kök var — `ORION_WORKSPACE` (ya da süreç cwd'si) ve `~/.orion` (vault,
hafıza, raporlar için bilinçli istisna). `_isInside()` (fs.js:30-33)
`path.relative()` ile "hedef, kökün İÇİNDE mi" sorusunu soruyor — `../` ile
kaçış girişimi relative path'in `..` ile başlamasına yol açar ve reddedilir.

İhlal **sessizce değil**, açık hata + `security_boundary_hit` olayıyla
işleniyor (fs.js:38-44) — yorum satırı bunu kasıtlı olarak vurguluyor
(fs.js:19: "Bu köklerin dışına düşen her çağrı SESSİZCE değil, açık hatayla
reddedilir"). Bu, [01](01-runtime-surec-mimarisi.md) §1.4'teki
"silent_catch_hit" felsefesiyle aynı prensip: bir güvenlik/hata durumu asla
görünmez şekilde yutulmamalı.

**Kapsam sınırı:** Bu guard yalnızca `tools/fs.js`'deki araçları kapsıyor.
`tools/shell.js` üzerinden `run_command` ile `cat ~/.ssh/id_rsa` çalıştırmak
bu path guard'ından geçmez — çünkü shell komutu path olarak değil, serbest
metin olarak yürütülüyor. Dosya sınırı ile komut sınırı **iki ayrı, bağımsız
mekanizma**; biri diğerini kapsamıyor.

## 5.2 `run_command` onay zinciri — üç bağlamda üç farklı davranış

`tools/shell.js:105-125`, aynı `run_command` çağrısı çalıştığı bağlama göre
üç farklı yoldan geçebilir:

| Bağlam | Davranış | Kod konumu |
|---|---|---|
| Etkileşimli TTY, güvenilmeyen workspace | `selectInput()` ile terminalde Run/Skip sorusu | shell.js:34-45 |
| Güvenilir workspace (`trustedPaths`) | Otomatik onay, terminale "⚡ auto (trusted)" yazılır | shell.js:30-33 |
| Headless (`--headless`), `autoApproveCommands=false` | **Reddedilir** — "headless modda autoApproveCommands gerekli" | shell.js:119-121 |
| Coordinator subagent'ı (`ORION_ALLOW_COMMANDS=1`) | Otomatik onay, onay isteği yok | shell.js:110-116 |

Dördüncü satır dikkat gerektiriyor: `coordinator.js` bir `coder` alt-görevi
başlattığında `subagent.run({ allowCommands: true, ... })` ile
`ORION_ALLOW_COMMANDS=1` env'ini set ediyor (`coordinator.js` → `subagent.js:26`).
Bu, "coordinator'ın kendisi güvenilir workspace'te çalışıyorsa alt-ajanı da
güvenilir say" varsayımına dayanıyor — alt-ajanın *kendi* workspace güven
durumu ayrıca kontrol edilmiyor, üst ajandan devralınıyor. Yani güven zinciri
tek yönlü ve otomatik: coordinator güvenildiyse tüm coder alt-görevleri de
onaysız komut çalıştırabilir.

## 5.3 Çoklu-ajan izolasyonu — süreç sınırı, bellek sınırı değil

`core/subagent.js:20-97` her alt-görevi **ayrı bir Node süreci** olarak
başlatıyor (`spawn("node", [ORION, "--headless", ...])`). Bu, bellek
paylaşımı sıfır anlamına geliyor — ana ajanın `Session` nesnesi, geçmişi,
`_specCache`'i alt-ajana hiç sızmıyor. Bilgi geçişi sadece iki kanaldan:

1. **`task` metni** (stdin'e yazılır) — görev tanımı + `role` persona'sı
   (researcher/coder/reviewer, `orion.js:99-127`'de metinsel talimat olarak
   enjekte edilir, **kod seviyesinde zorlanan bir izin sistemi değil**).
2. **`memoryScope`** — base64 encode edilmiş ilgili hafıza, `ORION_MEMORY_SCOPE`
   env'i ile taşınıyor (subagent.js:24).

Rol bazlı araç kısıtlaması (`researcher` yazamaz, sadece okur) `orion.js`'deki
persona metninde "Do NOT write or modify any files" gibi **talimat** olarak
veriliyor — `ModeManager` seviyesinde teknik olarak engellenmiyor. Yani bir
`researcher` alt-ajanı, modeli buna uymazsa (prompt injection, model hatası)
teknik olarak `write_file` çağırabilir; bunu engelleyen tek şey modelin
talimata uyması. Bu, [03](03-agent-loop-arac-mimarisi.md) §3.7'de bahsedilen
"mod izinleri merkezi değil" gözlemiyle aynı kökten: coordinator'ın rol
sistemi, `ModeManager`'ın izin sistemiyle **entegre değil**, paralel ve daha
zayıf bir katman.

## 5.4 Zaman aşımı katmanları — dört farklı seviye, birbirinden habersiz

Sistemde donma/askıda kalmayı önlemeye yönelik dört bağımsız zaman aşımı
mekanizması var, hiçbiri diğerini bilmiyor:

| Katman | Süre | Ne olur | Kaynak |
|---|---|---|---|
| HTTP istek idle timeout (openai-compat) | 180s | `req.destroy()` + reject | `backends/openai-compat.js:205` |
| Kullanıcıya "hâlâ çalışıyor" heartbeat | her 30s, **istek bitene kadar** (düzeltildi — eskiden 3 kez/90s sonra sessizdi) | Sadece bilgilendirme, iptal etmez | `core/session.ts:472-485` |
| `run_command` alt-süreç timeout | 120s (varsayılan, `timeout_ms` ile ayarlanabilir) | SIGTERM → 3sn sonra SIGKILL | `tools/shell.js:16,86-91` |
| Subagent (coordinator alt-görevi) timeout | rol bazlı: researcher 120s, coder 600s, reviewer 180s | SIGTERM → 3sn sonra SIGKILL | `core/coordinator.js:73`, `core/subagent.js:82-86` |

Bu dört sayı birbirinden bağımsız ayarlanmış ve **hiçbiri diğerini
tetiklemiyor/iptal etmiyor**. Heartbeat artık istek bitene kadar sürdüğü
için "sessiz aralık = donma" yanılgısı giderildi (bkz.
[06](06-vaka-analizi-uzun-sureli-donma.md) §6.7.1), ama dört süre hâlâ
birbirinden habersiz sabitler — biri değiştirilirse diğerleri otomatik
uyum sağlamıyor. Tek gerçek iptal yolu kullanıcı tarafında:
Ctrl+C → `interrupt()` → `AbortController.abort()` (session.ts:63-70,
322) — ama bu yalnızca CLI'da aktif session'ı hedefliyor, HTTP sunucusunda
(`orion-server.js`) her session kendi `_interrupted` alanını kullanıyor
(session.ts:59-61 yorum satırı bunu açıkça belirtiyor).

## 5.5 Bütçe — hem güvenlik hem maliyet sınırı

`BudgetTracker.isExceeded()` (`core/budget.js`, `session.ts:326-333`)
teknik olarak bir güvenlik mekanizması değil ama fiilen öyle davranıyor:
sonsuz döngüye giren ya da aşırı geniş öz-onaylı bir görev, bütçe aşılınca
sert bir `throw` ile durduruluyor. `run_command` gibi maliyetsiz araçlar
bunun dışında — bütçe yalnızca LLM çağrılarının token/maliyetini sınırlıyor,
CPU/disk/ağ kullanımını değil.

## 5.6 Workspace güven kapısı ile CLI dışı girişler arasındaki boşluk

[01](01-runtime-surec-mimarisi.md) §1.5'te değinildiği gibi, `promptTrust()`
yalnızca `orion.js`'in etkileşimli akışında çağrılıyor. `orion-mcp.js` üzerinden
gelen bir MCP isteği ya da `orion-server.js` üzerinden gelen bir HTTP isteği,
hedef workspace'in daha önce hiç onaylanmamış olması durumunda bu kapıdan
geçip geçmediği ayrıca doğrulanmalı — mevcut kod tabanında güven kapısının
bu iki girişte de çağrıldığına dair açık bir referans yok, bu bir mimari
boşluk olarak işaretlenmeye değer.
