// Subtypes:
export type TextContent = {
  type: 'text';
  text: string;
};

export type ImageContentPart = {
  type: 'image_url';
  image_url: {
    url: string; // URL or base64 encoded image data
    detail?: 'auto' | 'low' | 'high'; // Optional, defaults to "auto"
  };
};

export type ContentPart = TextContent | ImageContentPart;

export interface OpenrouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[]; // Может быть строкой или массивом ContentPart (для мультимодальных моделей)
}

export interface OpenrouterCompletionRequest {
  model: string;
  messages: OpenrouterMessage[];
  stream?: boolean;
  temperature?: number; // Опционально
  max_tokens?: number; // Опционально
}

// --- Streaming specific interfaces ---

// Чанк, который приходит в stream (внутри data: ... SSE сообщения)
type StreamingChoice = {
  finish_reason: string | null;
  native_finish_reason: string | null; // OpenRouter specific
  delta: {
    content: string | null; // Часть контента
    role?: string; // Роль (обычно только в первом чанке assistant)
    tool_calls?: any[]; // Если модель поддерживает Function/Tool Calling
    function_call?: any; // Устаревшее, но может приходить
  };
  error?: ErrorResponse; // Ошибка внутри чанка
  index: number; // Индекс выбора (для n > 1, редко используется со стримингом)
};

export type ErrorResponse = {
  code: number | string | null; // Код ошибки
  message: string; // Сообщение об ошибке
  metadata?: Record<string, unknown>; // Дополнительная информация
  type?: string; // Тип ошибки (OpenAI style)
  param?: string | null;
};

// Структура каждого SSE сообщения (после data: )
export interface OpenrouterStreamingChunk {
  id?: string; // Chat completion ID (обычно в первом чанке)
  object?: string; // 'chat.completion.chunk'
  created?: number; // timestamp (обычно в первом чанке)
  model?: string; // Название модели (обычно в первом чанке)
  choices: StreamingChoice[];
  // usage usually comes in the final chunk or is delayed
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Не-стриминговый ответ (если stream: false), оставлен для полноты,
// но наша функция будет возвращать стрим
export interface OpenrouterNonStreamingResponse {
  id: string;
  object: string; // 'chat.completion'
  created: number; // timestamp
  model: string; // Название модели, которая реально использовалась
  choices: Array<{
    index: number;
    message: OpenrouterMessage; // Полное сообщение
    logprobs: null;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

// Для метода получения моделей
export interface OpenrouterModel {
  id: string; // model name
  name: string;
  provider: { id: string; name: string } | null;
  description: string | null;
  pricing: {
    prompt: string | null;
    completion: string | null;
    request: string | null /* ... */;
  };
  // ... other fields
}

export interface OpenrouterModelsResponse {
  data: OpenrouterModel[];
  // ...
}
