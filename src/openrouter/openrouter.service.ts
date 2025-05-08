// NOTE: AI GENERATED
// src/openrouter/openrouter.service.ts
// Imports remain the same
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable, Subscriber } from 'rxjs';
import { TextDecoder } from 'util'; // For decoding buffer
import {
  OpenrouterCompletionRequest,
  OpenrouterStreamingChunk,
  OpenrouterMessage,
  OpenrouterModel,
  OpenrouterModelsResponse,
} from './interfaces/openrouter.interface';

@Injectable()
export class OpenrouterService {
  private readonly openrouterApiBaseUrl: string;
  private readonly openrouterApiKey: string;

  constructor(private readonly configService: ConfigService) {
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
  } /**
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
    const chatCompletionsUrl = `${this.openrouterApiBaseUrl}/chat/completions`;

    const requestPayload: OpenrouterCompletionRequest = {
      model: modelName,
      messages: messages,
      stream: true,
      ...options,
    };

    // Create AbortController for cancelling the fetch request
    const controller = new AbortController();
    const signal = controller.signal;

    return new Observable((subscriber: Subscriber<string>) => {
      // Start the fetch request. DO NOT await it here.
      fetch(chatCompletionsUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openrouterApiKey}`,
          'Content-Type': 'application/json', // Optional headers:
          // 'HTTP-Referer': 'YOUR_WEBSITE_URL',
          // 'X-Title': 'YOUR_APP_NAME',
        },
        body: JSON.stringify(requestPayload),
        signal: signal, // Pass the abort signal to fetch
      })
        .then(async (response) => {
          // Use async here because we'll use await response.body.getReader().read()
          if (!response.ok) {
            // Read error body for more details if needed (optional, can be slow)
            // const errorBody = await response.text();
            // let errorJson: any = null;
            // try { errorJson = JSON.parse(errorBody); } catch (e) {}
            const errorStatus = response.status;
            const errorText = response.statusText;
            // REMOVED: Detailed error logging
            subscriber.error(
              new InternalServerErrorException(
                `Запрос к OpenRouter API завершился ошибкой: ${errorStatus} ${errorText}`,
                // Pass errorBody/errorJson here if you read it
              ),
            );
            return;
          }

          const stream = response.body;

          if (!stream) {
            const errorMsg = 'Ошибка чтения стрима от openrouter';
            subscriber.error(new InternalServerErrorException(errorMsg));
            return;
          }

          // --- Use getReader() and a loop ---
          const reader = stream.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          try {
            while (true) {
              // Read chunks from the stream
              const { done, value } = await reader.read();

              // Check for abort signal during reading
              if (signal.aborted) {
                subscriber.complete(); // Treat abort as completion or error
                return; // Exit the async function
              }

              if (done) {
                // Stream finished naturally
                // Check if buffer has any remaining data to process
                if (buffer.length > 0) {
                  // Process any remaining data in the buffer
                  buffer = ''; // Clear buffer
                }

                // If [DONE] was received, complete was already called.
                // If stream ended WITHOUT [DONE], this means unexpected end.
                // Based on OpenRouter spec, [DONE] should be the last message.
                // So reaching here with !subscriber.closed is an unexpected end.
                if (!subscriber.closed) {
                  console.warn('OpenRouter stream ended without [DONE].');
                  // Optionally emit an error instead of completing
                  subscriber.error(
                    new InternalServerErrorException(
                      'Стрим неожиданно завершился.',
                    ),
                  );
                }
                return; // Exit the async function
              }

              buffer += decoder.decode(value, { stream: true });

              const lines = buffer.split(/\r?\n/);
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.substring(6);
                  if (data === '[DONE]') {
                    subscriber.complete(); // Signal stream completion
                    return; // Exit the async function
                  }
                  try {
                    const chunkData = JSON.parse(
                      data,
                    ) as OpenrouterStreamingChunk;

                    if (chunkData.choices && chunkData.choices.length > 0) {
                      const deltaContent = chunkData.choices[0].delta?.content;
                      if (deltaContent) {
                        subscriber.next(deltaContent); // Emit content chunk
                      }
                      // Handle role, tool_calls, etc. if needed
                    }
                    // Handle errors embedded within the chunk
                    if (chunkData.choices && chunkData.choices[0]?.error) {
                      const apiError = chunkData.choices[0].error;
                      // REMOVED: Error logging
                      subscriber.error(
                        new InternalServerErrorException(
                          `Ошибка LLM API во время стрима: ${apiError.message}`,
                        ),
                      );
                      await reader.cancel(); // Cancel the reader
                      return; // Exit the async function on error
                    }
                  } catch {
                    // Handle JSON parsing error for a chunk
                    // REMOVED: Error logging
                    subscriber.error(
                      new InternalServerErrorException(
                        `Не удалось проанализировать часть стрима от LLM API`,
                      ),
                    );
                    await reader.cancel(); // Cancel the reader
                    return; // Exit the async function on error
                  }
                } else if (line !== '') {
                  // Handle lines that are not 'data: ' and not empty
                  // Could be 'event:', 'id:', comments, etc.
                  // For this implementation, we just ignore them.
                  // console.log('Ignoring SSE line:', line);
                }
              }
            }
          } catch (error) {
            // This catch block handles errors during stream reading (reader.read())
            // or errors thrown inside the while loop's try block.
            // It also catches errors from signal.throwIfAborted() if using that approach.
            if (signal.aborted) {
              // If the error was due to aborting, complete the subscriber
              subscriber.complete();
            } else {
              console.error('Error during stream processing:', error); // Consider logging here for debugging
              subscriber.error(
                new InternalServerErrorException(
                  'Неизвестная ошибка обработки стрима',
                ),
              );
            }
            // Ensure the reader/stream is cancelled/closed
            try {
              await reader.cancel();
            } catch {
              /* empty */
            } // Ignore errors during cancel
          } finally {
            // Release the reader lock regardless of success, error, or abort
            reader.releaseLock();
          }
        })
        .catch((error) => {
          // This catch block handles errors from the initial fetch() call
          // (e.g., network errors before connection is established).
          // It will not catch errors from the stream processing itself (handled by the try/catch around the while loop).
          if (signal.aborted) {
            // If the fetch error was due to aborting, complete the subscriber
            subscriber.complete();
          } else {
            console.error('Fetch error when connecting to OpenRouter:', error); // Consider logging here for debugging
            subscriber.error(
              new InternalServerErrorException(
                'Не возможно подключиться к API LLM',
              ),
            );
          }
        }); // This is the synchronous teardown function returned by the Observable constructor

      return () => {
        // When the subscriber unsubscribes, abort the fetch request
        // This will cause the fetch Promise or the reader.read() call to reject
        // with an AbortError, which is handled in the catch blocks.
        controller.abort();
        // Note: If the stream was already done or errored, abort() does nothing.
      };
    });
  } // Method getAvailableModels() remains unchanged as it does not use streaming
  // ... (code for getAvailableModels from previous answer)

  async getAvailableModels(): Promise<OpenrouterModel[]> {
    const modelsUrl = `${this.openrouterApiBaseUrl}/models`;

    try {
      const response = await fetch(modelsUrl, {
        headers: {
          Authorization: `Bearer ${this.openrouterApiKey}`,
        },
      });

      if (!response.ok) {
        throw new InternalServerErrorException(
          `Не удалось получить модели OpenRouter: ${response.status} ${response.statusText}`,
        );
      }

      // Cast JSON parse result
      const data = (await response.json()) as OpenrouterModelsResponse;

      if (!data || !Array.isArray(data.data)) {
        throw new InternalServerErrorException(
          'Неверная структура ответа от API моделей LLM',
        );
      }

      return data.data;
    } catch (error) {
      // Re-throw the error after logging if logging was needed
      console.error('Error fetching available OpenRouter models:', error); // Consider logging here for debugging
      throw error;
    }
  }
}
