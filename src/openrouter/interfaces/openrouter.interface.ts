// AI Helped

// Определяет роль отправителя сообщения в OpenRouter/OpenAI API
export type OpenrouterMessageRole = 'system' | 'user' | 'assistant' | 'tool';

// Определяет структуру сообщения для OpenRouter/OpenAI API
export interface OpenrouterMessage {
  role: OpenrouterMessageRole;
  content: string | null; // Может быть null, если, например, это tool_calls
  // name?: string; // Опционально, для указания имени, если роль 'tool' или 'function'
  // tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string; }; }>; // Опционально, для вызовов инструментов
  // tool_call_id?: string; // Опционально, ID вызова инструмента
}

// Определяет структуру запроса на завершение чата к OpenRouter API
export interface OpenrouterCompletionRequest {
  model: string; // Название модели, например, "openai/gpt-3.5-turbo"
  messages: OpenrouterMessage[];
  stream?: boolean; // Включить ли потоковую передачу
  max_tokens?: number; // Максимальное количество токенов для генерации
  temperature?: number; // Температура генерации (0.0 - 2.0)
  top_p?: number; // Top-p (nucleus) sampling
  // Другие параметры API OpenRouter/OpenAI по необходимости
  // stop?: string | string[];
  // presence_penalty?: number;
  // frequency_penalty?: number;
  // logit_bias?: Record<string, number>;
  // user?: string; // Уникальный идентификатор конечного пользователя
  // transforms?: string[]; // Например, ["middle-out"]
  // route?: string; // "fallback" или "any"
  // provider?: { order?: string[], require?: string[] };
}

// Определяет структуру чанка данных при потоковой передаче от OpenRouter
export interface OpenrouterStreamingChunk {
  id: string; // ID чата
  object: string; // Тип объекта, например, "chat.completion.chunk"
  created: number; // Временная метка создания
  model: string; // Используемая модель
  choices: Array<{
    index: number;
    delta: {
      role?: OpenrouterMessageRole;
      content?: string | null;
      // tool_calls?: any[];
    };
    finish_reason: string | null;
    logprobs?: any;
    error?: {
      message: string;
      type?: string;
      param?: string | null;
      code?: string | null;
    } | null;
  }>;
  // usage?: { // Информация об использовании токенов (обычно в последнем чанке или не-потоковом ответе)
  //   prompt_tokens: number;
  //   completion_tokens: number;
  //   total_tokens: number;
  // };
  // system_fingerprint?: string; // Системный отпечаток
  // x_openrouter_version?: string; // Версия OpenRouter
}

// Определяет структуру полного (не потокового) ответа от OpenRouter/OpenAI API
export interface OpenrouterCompletionResponse {
  [x: string]: any;
  id: string; // ID ответа
  object: string; // Тип объекта, например, "chat.completion"
  created: number; // Временная метка создания
  model: string; // Используемая модель
  choices: Array<{
    index: number;
    message: OpenrouterMessage; // Полное сообщение от ассистента
    finish_reason: string; // Причина завершения, например, "stop", "length", "tool_calls"
    logprobs?: any; // Логарифмические вероятности, если запрошены
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  // system_fingerprint?: string;
  // x_openrouter_version?: string;
}

// Определяет структуру ответа для запроса списка моделей от OpenRouter
export interface OpenrouterModelsResponse {
  data: OpenrouterModel[];
}

// Определяет структуру информации о модели от OpenRouter
export interface OpenrouterModel {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: ('text' | 'image')[]; // -
    tokenizer: string;
    default_template: string;
  };
  top_provider: {
    max_completion_tokens: number | null;
  };
  per_request_limits?: {
    [key: string]: any;
  } | null;
}
