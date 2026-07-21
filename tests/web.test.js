// tests/web.test.js — web_fetch aracı (tools/web.js)
"use strict";
const { test } = require("node:test");
const assert   = require("node:assert");
const web      = require("../tools/web.ts");

test("web_fetch: DEFS tanımlı ve doğru şekilde", () => {
  assert.strictEqual(web.DEFS.length, 1);
  assert.strictEqual(web.DEFS[0].name, "web_fetch");
  assert.deepStrictEqual(web.DEFS[0].input_schema.required, ["url"]);
});

test("htmlToText: script/style ayıklanır, bloklar satıra çevrilir", () => {
  const html = `<html><head><style>body{color:red}</style><script>alert(1)</script></head>
<body><h1>Başlık</h1><p>İlk paragraf</p><ul><li>bir</li><li>iki</li></ul></body></html>`;
  const text = web.htmlToText(html);
  assert.ok(!text.includes("alert"), "script içeriği kalmamalı");
  assert.ok(!text.includes("color:red"), "style içeriği kalmamalı");
  assert.ok(text.includes("Başlık"));
  assert.ok(text.includes("- bir"), "li → madde işareti");
});

test("htmlToText: HTML entity'leri çözülür", () => {
  assert.strictEqual(web.htmlToText("a &amp; b &lt;c&gt; &#65;"), "a & b <c> A");
});

test("_isPrivateHost: yerel/özel adresler yakalanır, kamusal geçer", () => {
  for (const h of ["localhost", "127.0.0.1", "10.0.0.5", "192.168.1.1", "172.16.0.1", "169.254.1.1", "::1"]) {
    assert.strictEqual(web._isPrivateHost(h), true, `${h} özel olmalı`);
  }
  for (const h of ["example.com", "8.8.8.8", "172.15.0.1", "172.32.0.1"]) {
    assert.strictEqual(web._isPrivateHost(h), false, `${h} kamusal olmalı`);
  }
});

test("web_fetch: özel ağ, geçersiz URL ve http-dışı şema reddedilir", async () => {
  await assert.rejects(() => web.execute("web_fetch", { url: "http://localhost:8080/x" }), /engellendi/);
  await assert.rejects(() => web.execute("web_fetch", { url: "ftp://example.com/f" }), /http/);
  await assert.rejects(() => web.execute("web_fetch", { url: "böyle-url-olmaz" }), /geçersiz URL/);
});
