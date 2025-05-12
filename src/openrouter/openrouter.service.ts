// src/openrouter/openrouter.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { defer, mergeAll, Observable, Subscriber } from 'rxjs';
import { TextDecoder } from 'util';
import {
  OpenrouterCompletionRequest,
  OpenrouterStreamingChunk,
  OpenrouterMessage,
  OpenrouterModel,
  OpenrouterModelsResponse,
  OpenrouterCompletionResponse,
} from './interfaces/openrouter.interface';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OpenrouterService {
  private readonly openrouterApiBaseUrl: string;
  private readonly openrouterApiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.openrouterApiBaseUrl =
      this.configService.get<string>('OPENROUTER_BASE_URL') || '';
    this.openrouterApiKey =
      this.configService.get<string>('OPENROUTER_API_KEY') || '';

    if (!this.openrouterApiKey) {
      throw new Error('OPENROUTER_API_KEY не задана в .env');
    }
    if (!this.openrouterApiBaseUrl) {
      throw new Error('OPENROUTER_BASE_URL не задана в .env');
    }
  }

  /**
   * Отправляет НЕ ПОТОКОВЫЙ запрос на завершение чата в OpenRouter API.
   * @param modelName - Название модели LLM.
   * @param messages - Массив сообщений в формате OpenRouter/OpenAI.
   * @param options - Дополнительные параметры API.
   * @returns Promise с полным ответом от API.
   * @throws Ошибки при проблемах с API или HTTP-запросом.
   */
  async sendCompletionRequest(
    modelName: string,
    messages: OpenrouterMessage[],
    options?: Partial<
      Omit<OpenrouterCompletionRequest, 'model' | 'messages' | 'stream'>
    >,
  ): Promise<OpenrouterCompletionResponse> {
    const chatCompletionsUrl = `${this.openrouterApiBaseUrl}/chat/completions`;

    const requestPayload: OpenrouterCompletionRequest = {
      model: modelName,
      messages: messages,
      stream: false,
      ...options,
    };

    try {
      const siteSettings = await this.prisma.siteSettings.findFirst();
      const apiKey = siteSettings?.openRouterApiKey ?? this.openrouterApiKey;

      const response = await fetch(chatCompletionsUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorStatus = response.status;
        throw new InternalServerErrorException(
          `Запрос к OpenRouter API завершился ошибкой ${errorStatus}`,
        );
      }

      const data = (await response.json()) as OpenrouterCompletionResponse;
      return data;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Не удалось подключиться к API LLM или обработать ответ.',
      );
    }
  }

  /**
   * Отправляет запрос на завершение чата в OpenRouter API и возвращает стрим контента.
   * Использует stream.getReader().read() для обработки стрима с AbortController.
   * @param modelName - Название модели LLM.
   * @param messages - Массив сообщений в формате OpenRouter/OpenAI.
   * @param options - Дополнительные параметры API.
   * @returns Observable, который эмитит строки с частями контента по мере их поступления.
   * @throws Ошибки при проблемах с API или HTTP-запросом (до начала стрима) или во время стрима.
   */
  sendStreamingCompletionRequest(
    modelName: string,
    messages: OpenrouterMessage[],
    options?: Partial<
      Omit<OpenrouterCompletionRequest, 'model' | 'messages' | 'stream'>
    >,
  ): Observable<string> {
    // NOTE -
    return defer(async () => {
      const siteSettings = await this.prisma.siteSettings.findFirst();
      const apiKey = siteSettings?.openRouterApiKey ?? this.openrouterApiKey;

      const chatCompletionsUrl = `${this.openrouterApiBaseUrl}/chat/completions`;

      const requestPayload: OpenrouterCompletionRequest = {
        model: modelName,
        messages: messages,
        stream: true,
        ...options,
      };

      const controller = new AbortController();
      const signal = controller.signal;

      return new Observable((subscriber: Subscriber<string>) => {
        fetch(chatCompletionsUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
          signal: signal,
        })
          .then(async (response) => {
            if (!response.ok) {
              const errorStatus = response.status;
              subscriber.error(
                new InternalServerErrorException(
                  `Запрос к OpenRouter API завершился ошибкой ${errorStatus}`,
                ),
              );
              return;
            }

            const stream = response.body;
            if (!stream) {
              const errorMsg =
                'Ошибка чтения стрима от OpenRouter: тело ответа отсутствует.';
              subscriber.error(new InternalServerErrorException(errorMsg));
              return;
            }

            const reader = stream.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (signal.aborted) {
                  subscriber.complete();
                  return;
                }
                if (done) {
                  if (buffer.length > 0) {
                    // Попытка обработать остаток, если это валидный JSON чанк
                    try {
                      if (buffer.startsWith('data: ')) {
                        const data = buffer.substring(6);
                        if (data !== '[DONE]') {
                          const chunkData = JSON.parse(
                            data,
                          ) as OpenrouterStreamingChunk;
                          if (
                            chunkData.choices &&
                            chunkData.choices.length > 0
                          ) {
                            const deltaContent =
                              chunkData.choices[0].delta?.content;
                            if (deltaContent) subscriber.next(deltaContent);
                          }
                        }
                      }
                    } catch {
                      /* empty */
                    }
                  }
                  if (!subscriber.closed) {
                    // OpenRouter должен всегда присылать 'data: [DONE]'
                    // Если его нет, ручками завершаем
                    subscriber.complete();
                  }
                  return;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split(/\r?\n/);
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data === '[DONE]') {
                      subscriber.complete();
                      return;
                    }
                    try {
                      const chunkData = JSON.parse(
                        data,
                      ) as OpenrouterStreamingChunk;
                      if (chunkData.choices && chunkData.choices.length > 0) {
                        const deltaContent =
                          chunkData.choices[0].delta?.content;
                        if (deltaContent) {
                          subscriber.next(deltaContent);
                        }
                        if (chunkData.choices[0]?.error) {
                          const apiError = chunkData.choices[0].error;
                          subscriber.error(
                            new InternalServerErrorException(
                              `Ошибка LLM API во время стрима: ${apiError.message}`,
                            ),
                          );
                          await reader.cancel();
                          return;
                        }
                      }
                    } catch {
                      // Не прерываем стрим из-за одной плохой части, если это не [DONE]
                    }
                  } else if (line.trim() !== '') {
                    // Пропуск
                  }
                }
              }
            } catch {
              if (signal.aborted) {
                subscriber.complete();
              } else {
                subscriber.error(
                  new InternalServerErrorException(
                    'Возникла неизвестная ошибка сервера при обработки стрима от LLM.',
                  ),
                );
              }
              try {
                await reader.cancel();
              } catch {
                /* empty */
              }
            } finally {
              reader.releaseLock();
            }
          })
          .catch(() => {
            if (signal.aborted) {
              subscriber.complete();
            } else {
              subscriber.error(
                new InternalServerErrorException(
                  'Невозможно подключиться к API LLM.',
                ),
              );
            }
          });

        return () => {
          controller.abort();
        };
      });
    }).pipe(mergeAll());
  }

  async getAvailableModels(): Promise<OpenrouterModel[]> {
    const modelsUrl = `${this.openrouterApiBaseUrl}/models`;

    try {
      const siteSettings = await this.prisma.siteSettings.findFirst();
      const apiKey = siteSettings?.openRouterApiKey ?? this.openrouterApiKey;

      const response = await fetch(modelsUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new InternalServerErrorException(
          `Не удалось получить модели OpenRouter: ${response.status} ${response.statusText}`,
        );
      }

      const data = (await response.json()) as OpenrouterModelsResponse;
      if (!data || !Array.isArray(data.data)) {
        throw new InternalServerErrorException(
          'Неверная структура ответа от API моделей LLM',
        );
      }
      return data.data;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Возникла внутренняя ошибка сервера во время получения моделей.',
      );
    }
  }
}
