// backends/types.ts — Ortak backend sözleşmesi (tip katmanı, runtime kodu yok)
// Tüm sağlayıcılar (ollama, anthropic, openai-compat ailesi, nim) bu imzaları konuşur.
// chatRich her yerde aynı şekli döndürür: { text, toolCalls } — session loop'ları
// backend'den bağımsız tek akış üzerinden çalışır.
"use strict";

/** Anthropic-tarzı araç tanımı — tüm backend'lere bu format verilir, her backend kendi
 *  formatına (OpenAI function, Ollama tool) kendisi çevirir. */
export interface ToolDef {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
}

/** LLM'in istediği tek bir araç çağrısı — loop bu şekli çalıştırır. */
export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  /** openai-compat: ham JSON string (stream'den birleştirilmiş, henüz parse edilmemiş) */
  rawArgs?: string;
  /** openai-compat: rawArgs JSON.parse başarısız olduysa true — loop aracı ÇALIŞTIRMAZ */
  argsTruncated?: boolean;
}

/** chatRich sonucu — backend'den bağımsız ortak dönüş şekli. */
export interface ChatRichResult {
  text: string;
  toolCalls: ToolCall[];
}

/** Konuşma mesajı — role/content; tool sonuçları backend'e özgü alanlar taşıyabilir. */
export interface ChatMessage {
  role: string;
  content: unknown;
  [key: string]: unknown;
}

export interface ChatRichOpts {
  system?: string;
  tools?: ToolDef[];
  onToken?: (token: string) => void;
  maxTokens?: number;
  numCtx?: number;
}

export interface ChatOpts {
  onToken?: (token: string) => void;
  stream?: boolean;
  numCtx?: number;
}

/** Tool desteği olmayan modellerde backend'in fırlattığı hata — loop ReAct'a düşer. */
export interface BackendError extends Error {
  noToolSupport?: boolean;
  ollamaJinjaError?: boolean;
}

/** Her backend modülünün dışa açtığı ortak yüzey. */
export interface Backend {
  name: string;
  isAvailable(): Promise<boolean>;
  listModels(): Promise<string[]>;
  chat(model: string, messages: ChatMessage[], opts?: ChatOpts): Promise<string>;
  chatRich?(model: string, messages: ChatMessage[], opts?: ChatRichOpts): Promise<ChatRichResult>;
  defaultModel: string | null;
}

// Salt tip modülü — runtime'da boş obje export edilir (CJS uyumu).
module.exports = {};
