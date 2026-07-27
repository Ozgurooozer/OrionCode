// core/sahne.ts — LLM çıktısından [POZ:x] / [JEST:x] marker'larını ayırır
// sahne.py'nin TypeScript portu — arayüz birebir aynı tutuldu.
"use strict";

const POZLAR: ReadonlySet<string> = new Set([
  "duruyor", "oturuyor", "yatıyor", "eğiliyor",
  "yürüyor", "koşuyor", "bakıyor",
]);

const JESTLER: ReadonlySet<string> = new Set([
  "el_salliyor", "başını_sallıyor", "omuz_silkiyor",
  "işaret_ediyor", "gülümsüyor", "kaş_çatıyor",
  "el_açıyor", "bekliyor",
]);

// Chunk sonunda yarım kalan marker başlangıcını yakalar: "[POZ:" veya "[JEST:"
const _PARTIAL = /\[(?:POZ|JEST):[^\]]*$/;

const SISTEM_ISTEMI = (
  "Yanıtlarken beden dilini belirtmek için YALNIZCA aşağıdaki işaretçileri " +
  "kullan — başka format KULLANMA.\n" +
  `  Duruş (bir adet, sürekli): [POZ:deger]  — Geçerli: ${[...POZLAR].sort().join(", ")}\n` +
  `  Jest (anlık): [JEST:deger]               — Geçerli: ${[...JESTLER].sort().join(", ")}\n` +
  "İşaretçiler kullanıcıya GÖRÜNMEYECEKTİR; metinden ayrıştırılır. " +
  "İşaretçi metninle iç içe yaz, ayrı satıra KOYMA.\n" +
  "Örnek: 'Evet [POZ:duruyor][JEST:başını_sallıyor] bu doğru.'\n" +
  "UYARI: sözlük dışı değer kullanırsan bilinmeyen olarak işaretlenir."
);

interface Olay {
  tur: "poz" | "jest" | "bilinmeyen";
  deger: string;
  pozisyon: number;
}

type OlayCallback = (olay: Olay) => void;

class Ayristirici {
  private _olaylar: Olay[] = [];
  private _gorunenUzunluk: number = 0;
  private _tampon: string = "";
  private _onOlay: OlayCallback | null;

  constructor(onOlay: OlayCallback | null = null) {
    this._onOlay = onOlay;
  }

  metin(chunk: string): string {
    chunk = this._tampon + chunk;
    this._tampon = "";

    // Chunk sonunda yarım kalan marker varsa ayır, bir sonraki round'a bırak
    const mPartial = _PARTIAL.exec(chunk);
    if (mPartial) {
      this._tampon = chunk.slice(mPartial.index);
      chunk = chunk.slice(0, mPartial.index);
    }

    const outChars: string[] = [];
    let pos = 0;
    // Her çağrıda taze regex — g flag'li regex instance paylaşılmaz
    const pattern = /\[(?<tur>POZ|JEST):(?<deger>[^\]]+)\]/g;
    for (const m of chunk.matchAll(pattern)) {
      outChars.push(chunk.slice(pos, m.index!));
      const turHam = m.groups!.tur.toLowerCase();
      const deger = m.groups!.deger.trim();
      const gelen = outChars.join("").length + this._gorunenUzunluk;
      let tur: "poz" | "jest" | "bilinmeyen";
      if (turHam === "poz") {
        tur = POZLAR.has(deger) ? "poz" : "bilinmeyen";
      } else {
        tur = JESTLER.has(deger) ? "jest" : "bilinmeyen";
      }
      const olay: Olay = { tur, deger, pozisyon: gelen };
      this._olaylar.push(olay);
      this._onOlay?.(olay);
      pos = m.index! + m[0].length;
    }
    outChars.push(chunk.slice(pos));
    const gorunen = outChars.join("");

    this._gorunenUzunluk += gorunen.length;
    return gorunen;
  }

  olaylar(): Olay[] { return [...this._olaylar]; }

  pozDagilimi(): Record<string, number> {
    const dag: Record<string, number> = {};
    for (const o of this._olaylar) {
      if (o.tur === "poz") dag[o.deger] = (dag[o.deger] ?? 0) + 1;
    }
    return dag;
  }

  jestSayisiToplam(): number {
    return this._olaylar.filter(o => o.tur === "jest").length;
  }

  bilinmeyenSayisi(): number {
    return this._olaylar.filter(o => o.tur === "bilinmeyen").length;
  }
}

module.exports = { POZLAR, JESTLER, SISTEM_ISTEMI, Ayristirici };
