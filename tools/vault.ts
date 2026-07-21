// tools/vault.js — Ajan araçları: vault arama ve okuma
// @ts-nocheck
"use strict";

const vault = require("../core/vault.ts");

const DEFS = [
  {
    name: "vault_search",
    description: "Geçmiş oturumları semantic olarak ara. Geçmişteki kararları, kod kalıplarını, hataları bulmak için kullan.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Arama sorgusu" },
        limit: { type: "number", description: "Maksimum sonuç (varsayılan 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "vault_recent",
    description: "En son vault oturumlarını listele.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Kaç oturum (varsayılan 10)" },
      },
    },
  },
  {
    name: "vault_read",
    description: "Belirli bir vault oturumunun içeriğini oku.",
    input_schema: {
      type: "object",
      properties: {
        session_id: { type: "string", description: "Oturum ID" },
      },
      required: ["session_id"],
    },
  },
];

async function execute(name, input) {
  switch (name) {
    case "vault_search": {
      const results = await vault.searchVault(input.query, input.limit ?? 5);
      if (!results.length) return "Vault'ta ilgili sonuç bulunamadı.";
      return results.map(e =>
        `[${e.date}] ${e.id}\n${e.summary}\nEtiketler: ${(e.tags ?? []).join(", ")}`
      ).join("\n\n");
    }

    case "vault_recent": {
      const entries = vault.recentEntries(input.limit ?? 10);
      if (!entries.length) return "Vault boş.";
      return entries.map(e =>
        `${e.date} · ${e.id} · ${e.summary.slice(0, 80)}`
      ).join("\n");
    }

    case "vault_read": {
      const content = vault.readEntry(input.session_id);
      if (!content) return `Oturum bulunamadı: ${input.session_id}`;
      return content.slice(0, 4000); // token limiti
    }

    default:
      return `Bilinmeyen araç: ${name}`;
  }
}

module.exports = { DEFS, execute };
