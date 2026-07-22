// scripts/lib/test_messages.js — Meissa batch/inceleme script'lerinin ortak girdi kümesi.
// Tek kaynak: meissa_batch.js ve manual_review_sample.js buradan okur, ikisi
// ayrı ayrı tutulmaz (TAYF_v0.1.md'deki "iki yerde yaşayan veri sapar" dersiyle aynı sebep).
"use strict";

const TEST_MESSAGES = [
  // Resim/görsel (image skill)
  "bana bir cyberpunk kız çiz",
  "siberpunk şehri görseli oluştur",
  "anime karakteri resim yap",
  "fantasy ortam görsel",
  "draw a space station",
  "generate an image of a dragon",
  "pixel art knight sprite",
  "retro scifi robot",
  "3d render of a mountain",
  "portrait of an elf warrior",

  // Ses/TTS (voice skill)
  "bu metni seslendir: Merhaba Dünya",
  "oku: Orion hazır",
  "speak this: hello world",
  "sesli oku şunu",

  // Kod
  "python'da fibonacci yaz",
  "javascript async await örneği",
  "typescript interface nedir",
  "sql join açıkla",
  "git rebase ne işe yarar",
  "docker container nasıl çalışır",

  // Analiz
  "bu kodu analiz et: for(let i=0;i<10;i++){}",
  "performans sorunlarını bul",
  "bug nerede olabilir",
  "memory leak tespiti",

  // Yazı
  "bir blog yazısı yaz yapay zeka hakkında",
  "README.md dosyası oluştur",
  "commit mesajı öner",
  "teknik doküman taslağı",

  // Sohbet/Genel
  "merhaba nasılsın",
  "bugün hava nasıl",
  "ne yapabilirim",
  "yardım et",
  "teşekkürler",
  "tamam anladım",

  // Orchestration
  "bir karakter çiz ve ardından seslendir",
  "kod yaz test et ve dokümante et",
  "animasyon oluştur ve kaydet",

  // Karmaşık (3)
  "proje planı oluştur, milestone'ları belirle, takıma dağıt",
  "kod review yap, bug bul, düzelt, test yaz, PR aç",

  // Türkçe slang / informal
  "abi bi resim at",
  "hocam kod yazıver",
  "kanka anime çiz",
  "bunu sesle okusana",

  // İngilizce
  "what is quantum computing",
  "explain neural networks",
  "how does TCP/IP work",
  "write a haiku about programming",

  // Kazıcı saçma girdiler (10 adet)
  "💀💀💀💀💀",
  "a".repeat(200),  // truncated versiyonu
  "",               // boş (otomatik FALLBACK)
  "\n\n\n",
  "\t\t\t",
  "'; DROP TABLE users; --",
  "🎨🖼️👨‍💻",
  "Ey Türkçe sözler sızlatır yüreğimi ".repeat(5),
  "resim yap resim yap resim yap ".repeat(10),
  "x".repeat(500),
];

module.exports = { TEST_MESSAGES };
