// AI HELPED
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import {
  MessageSenderRole,
  Prisma,
  Chat,
  Message,
  AiModel as DbAiModel,
} from '@prisma/client';
import {
  OpenrouterMessage,
  OpenrouterMessageRole,
} from '../openrouter/interfaces/openrouter.interface';
import { Observable, tap, catchError, finalize, EMPTY } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';
import { OpenrouterService } from 'src/openrouter/openrouter.service';
import { CreateChatDto } from 'src/dto/create.chat.dto';
import { UpdateChatDto } from 'src/dto/update.chat.dto';
import { SendMessageDto } from 'src/dto/send.message.dto';
import { BranchChatDto } from 'src/dto/branch.chat.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly openrouterService: OpenrouterService,
  ) {}

  // == CHAT CRUD OPERATIONS ==

  async createChat(
    userId: number,
    createChatDto: CreateChatDto,
  ): Promise<Chat> {
    // const { initialMessage, title } = createChatDto; // aiModelId из createChatDto не используется для initial message

    try {
      const chat = await this.prisma.chat.create({
        data: {
          userId,
          title: 'Новый диалог',
        },
      });

      // if (initialMessage) {
      //   await this.prisma.message.create({
      //     data: {
      //       chatId: chat.id,
      //       content: initialMessage,
      //       role: MessageSenderRole.USER,
      //     },
      //   });
      //   // Если нужен немедленный ответ ИИ на initialMessage, то
      //   // sendMessageAndStreamResponse или getQuickAnswer после создания чата.
      // }
      return chat;
    } catch {
      throw new InternalServerErrorException('Не удалось создать чат.');
    }
  }

  async getUserChats(
    userId: number,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<Chat[]> {
    try {
      return this.prisma.chat.findMany({
        where: { userId, isArchived: false, parentChatId: null },
        include: {
          childBranches: {
            include: {
              childBranches: {
                include: {
                  childBranches: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
    } catch {
      throw new InternalServerErrorException(
        'Не удалось получить список чатов.',
      );
    }
  }

  async getChatById(
    chatId: string,
    userId: number,
  ): Promise<(Chat & { messages: Message[] }) | null> {
    try {
      const chat = await this.prisma.chat.findUnique({
        where: { id: chatId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            include: { llm: true },
          },
        },
      });
      if (!chat) {
        throw new NotFoundException('Чат не найден.');
      }
      return chat;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Не удалось получить чат.');
    }
  }

  async updateChat(
    chatId: string,
    userId: number,
    updateChatDto: UpdateChatDto,
  ): Promise<Chat> {
    await this.getChatById(chatId, userId); // Проверка существования и прав доступа

    try {
      return this.prisma.chat.update({
        where: { id: chatId },
        data: updateChatDto,
      });
    } catch {
      throw new InternalServerErrorException('Не удалось обновить чат.');
    }
  }

  async deleteChat(chatId: string, userId: number): Promise<void> {
    const chat = await this.getChatById(chatId, userId);
    if (!chat) {
      throw new BadRequestException('Чат не найден.');
    }
    try {
      await this.prisma.chat.delete({
        where: { id: chat.id },
      });
    } catch {
      throw new InternalServerErrorException('Не удалось удалить чат.');
    }
  }

  // == СООБЩЕНИЯ ==

  // async getMessagesForChat(
  //   chatId: string,
  //   userId: number,
  //   page: number = 1,
  //   pageSize: number = 50,
  // ): Promise<Message[]> {
  //   await this.getChatById(chatId, userId);

  //   try {
  //     return this.prisma.message.findMany({
  //       where: { chatId },
  //       orderBy: { createdAt: 'asc' },
  //       skip: (page - 1) * pageSize,
  //       take: pageSize,
  //       include: { llm: true },
  //     });
  //   } catch {
  //     throw new InternalServerErrorException('Не удалось получить сообщения.');
  //   }
  // }

  private async getAiModelByIdOrIdentifier(
    modelId?: number | string,
  ): Promise<DbAiModel> {
    if (typeof modelId === 'number') {
      const modelFromDb = await this.prisma.aiModel.findUnique({
        where: { id: modelId },
      });
      if (!modelFromDb) {
        throw new NotFoundException(
          `Модель ИИ с ID ${modelId} не найдена в базе данных.`,
        );
      }
      return modelFromDb;
    } else if (typeof modelId === 'string') {
      const modelFromDb = await this.prisma.aiModel.findUnique({
        where: { modelId: modelId },
      });
      if (!modelFromDb) {
        throw new NotFoundException(
          `Модель ИИ с идентификатором '${modelId}' не найдена в базе данных.`,
        );
      }
      return modelFromDb;
    }
    // Если modelId не предоставлен, используем модель по умолчанию
    const siteSettings = await this.prisma.siteSettings.findFirst({
      where: { id: 1 },
    });
    const defaultModelIdentifier =
      siteSettings?.fastLLMAnswerModel || 'google/gemini-flash-1.5'; // Резервный вариант
    const defaultModelFromDb = await this.prisma.aiModel.findUnique({
      where: { modelId: defaultModelIdentifier },
    });
    if (!defaultModelFromDb) {
      throw new InternalServerErrorException(
        'Модель ИИ по умолчанию не настроена или не найдена в базе данных.',
      );
    }
    return defaultModelFromDb;
  }

  async sendMessageAndStreamResponse(
    chatId: string,
    userId: number,
    sendMessageDto: SendMessageDto,
  ): Promise<{
    userMessage: Message;
    aiResponseStream: Observable<string>;
    aiModelUsed: { id: number; modelId: string; displayName: string };
  }> {
    const chat = await this.getChatById(chatId, userId); // Проверяет существование и права

    const {
      content,
      aiModelId: requestedDbModelId,
      ...openRouterOptions
    } = sendMessageDto;

    const userMessage = await this.prisma.message.create({
      data: { chatId, content, role: MessageSenderRole.USER },
    });

    const aiModel = await this.getAiModelByIdOrIdentifier(requestedDbModelId);

    const historyMessages = await this.prisma.message.findMany({
      where: { chatId, createdAt: { lt: userMessage.createdAt } }, // Сообщения до текущего
      orderBy: { createdAt: 'desc' },
      take: 10, // Количество сообщений для контекста
    });

    const openRouterMessages: OpenrouterMessage[] = [
      ...historyMessages.reverse().map((msg) => ({
        role: msg.role.toLowerCase() as OpenrouterMessageRole,
        content: msg.content,
      })),
      { role: 'user', content: userMessage.content }, // Добавляем текущее сообщение пользователя
    ];

    const aiResponseStream =
      this.openrouterService.sendStreamingCompletionRequest(
        aiModel.modelId, // Используем modelId для OpenRouter
        openRouterMessages,
        {
          max_tokens: openRouterOptions.max_tokens,
          temperature: openRouterOptions.temperature,
        },
      );

    let fullAiContent = '';
    const streamWithSaveLogic: Observable<string> = aiResponseStream.pipe(
      tap((chunk) => {
        fullAiContent += chunk;
      }),
      catchError((err) => {
        const errorMessage =
          err instanceof Error ? err.message : 'Неизвестная ошибка';

        // Сохраняем сообщение об ошибке как ответ ИИ
        this.prisma.message
          .create({
            data: {
              chatId,
              content: `При обработке вашего запроса произошла ошибка от модели ИИ: ${errorMessage || 'Неизвестная ошибка'}`,
              role: MessageSenderRole.AI,
              llmId: aiModel.id,
            },
          })
          .catch(() => {});
        // return throwError(() => err);
        return EMPTY;
      }),
      finalize(() => {
        // Выполняется при завершении или ошибке потока
        if (fullAiContent.trim().length > 0) {
          this.prisma.message
            .create({
              data: {
                chatId,
                content: fullAiContent,
                role: MessageSenderRole.AI,
                llmId: aiModel.id,
              },
            })
            .catch(() => {});
        }
      }),
    );

    return {
      userMessage,
      aiResponseStream: streamWithSaveLogic,
      aiModelUsed: {
        id: aiModel.id,
        modelId: aiModel.modelId,
        displayName: aiModel.displayName,
      },
    };
  }

  // AI HELPED
  /**
   * Принимает сообщение от пользователя, отправляет его LLM, получает не потоковый ответ,
   * и сохраняет оба сообщения (пользователя и ИИ) в базу данных для указанного чата.
   * @param chatId - ID чата, в который отправляется сообщение.
   * @param userId - ID пользователя, отправляющего сообщение.
   * @param sendMessageDto - DTO с содержимым сообщения и опциональными параметрами для LLM.
   * @returns Promise с объектами созданных сообщений пользователя и ИИ.
   */
  async sendMessageAndGetResponse(
    chatId: string,
    userId: number,
    sendMessageDto: SendMessageDto,
  ): Promise<{ userMessage: Message; aiMessage: Message }> {
    const {
      content,
      aiModelId: requestedDbModelId, // ID модели из БД или идентификатор для OpenRouter
      ...openRouterOptions // Оставшиеся параметры (max_tokens, temperature и т.д.)
    } = sendMessageDto;

    if (!content || content.trim() === '') {
      throw new BadRequestException('Сообщение не может быть пустым.');
    }

    try {
      // 1. Проверить существование чата и права доступа пользователя
      await this.getChatById(chatId, userId); // Выбросит ошибку, если чат не найден или нет доступа

      // 2. Сохранить сообщение пользователя в БД
      const userMessage = await this.prisma.message.create({
        data: {
          chatId,
          content,
          role: MessageSenderRole.USER,
        },
      });

      // 3. Определить модель ИИ для использования
      const aiModel = await this.getAiModelByIdOrIdentifier(requestedDbModelId);

      // 4. Получить историю сообщений для контекста
      const historyMessages = await this.prisma.message.findMany({
        where: { chatId, createdAt: { lt: userMessage.createdAt } }, // Сообщения до нового сообщения пользователя
        orderBy: { createdAt: 'desc' },
        take: 10, // Количество сообщений для контекста (можно сделать настраиваемым)
      });

      // 5. Сформировать массив сообщений для OpenRouter API
      const openRouterMessages: OpenrouterMessage[] = [
        // Добавляем системный промпт, если он есть для чата или модели (опционально)
        // { role: 'system', content: 'Твой системный промпт...' },
        ...historyMessages.reverse().map((msg) => ({
          role: msg.role.toLowerCase() as OpenrouterMessageRole, // Приводим роль к нижнему регистру
          content: msg.content,
        })),
        { role: 'user', content: userMessage.content }, // Добавляем текущее сообщение пользователя
      ];

      // 6. Отправить запрос к OpenRouter для получения НЕ потокового ответа
      const aiResponse = await this.openrouterService.sendCompletionRequest(
        aiModel.modelId, // Используем modelId для OpenRouter
        openRouterMessages,
        openRouterOptions, // Передаем опции типа max_tokens, temperature
      );

      // 7. Извлечь контент ответа ИИ
      let aiContent = aiResponse.choices?.[0]?.message?.content;

      // 8. Обработать возможные ошибки от API (например, лимиты)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (aiResponse?.error?.code === 429 && aiResponse?.error?.message) {
        // Можно выбросить ошибку или записать специальное сообщение
        aiContent =
          'Достигнут лимит запросов к ИИ. Пожалуйста, попробуйте позже.'; // Записываем сообщение об ошибке
        // Можно также выбросить throw new TooManyRequestsException('...');
      } else if (!aiContent || aiContent.trim() === '') {
        // Если ИИ вернул пустой ответ
        aiContent = 'Модель ИИ не предоставила ответ.'; // Записываем сообщение о пустом ответе
        // Можно также выбросить throw new InternalServerErrorException('Модель ИИ вернула пустой ответ.');
      }

      // 9. Сохранить ответ ИИ в БД
      const aiMessage = await this.prisma.message.create({
        data: {
          chatId,
          content: aiContent, // Сохраненный контент (или сообщение об ошибке)
          role: MessageSenderRole.AI,
          llmId: aiModel.id, // Связь с конкретной записью модели в вашей БД
        },
      });

      // 10. Вернуть созданные сообщения
      return { userMessage, aiMessage };
    } catch (error) {

      // Перевыбрасываем известные типы ошибок
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        // Добавьте сюда другие ожидаемые типы ошибок (например, TooManyRequestsException)
        error instanceof InternalServerErrorException // Перевыбрасываем и InternalServerError для сохранения статуса
      ) {
        throw error;
      }

      // Для всех остальных неожиданных ошибок выбрасываем InternalServerErrorException
      throw new InternalServerErrorException(
        'Произошла внутренняя ошибка при обработке вашего сообщения.',
      );
    }
  }

  /**
   * Получает быстрый, не потоковый ответ от LLM на основе одного промпта.
   * @param prompt - Текст запроса к LLM.
   * @param userId - (Опционально) ID пользователя для возможного логирования или специфических настроек.
   * @param requestedDbModelId - (Опционально) ID модели AiModel из вашей БД. Если не указан, используется модель по умолчанию.
   * @returns Promise со строкой ответа от LLM.
   */
  async getQuickAnswer(
    prompt?: string,
    messages?: OpenrouterMessage[],
    // userId?: number,
    requestedDbModelId?: string,
  ): Promise<string> {
    if (!messages && (!prompt || prompt.trim() === '')) {
      throw new BadRequestException('Промпт не может быть пустым.');
    }

    try {
      const siteSettings = await this.prisma.siteSettings.findFirst({
        where: { id: 1 },
      });
      const aiModel = requestedDbModelId || siteSettings?.fastLLMAnswerModel;

      if (!aiModel) {
        throw new InternalServerErrorException(
          'Модель для быстрых ответов не задана.',
        );
      }

      const msgs: OpenrouterMessage[] =
        messages && messages.length > 0
          ? messages
          : [{ role: 'user', content: prompt ?? null }];

      // Параметры по умолчанию для быстрых ответов, если нужно
      const openRouterOptions = {
        max_tokens: 1000, // Примерное ограничение для быстрого ответа
        temperature: 0.7, // Стандартная температура
      };

      const response = await this.openrouterService.sendCompletionRequest(
        aiModel,
        msgs,
        openRouterOptions,
      );

      let aiContent = response.choices?.[0]?.message?.content;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (response?.error?.code === 429 && response?.error?.message) {
        aiContent =
          'Достигнут дневной лимит по запросам к бесплатной версии openRouter!';
      } else if (!aiContent) {
        throw new InternalServerErrorException(
          'Модель ИИ вернула пустой ответ.',
        );
      }

      return aiContent;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error(error);
      throw new InternalServerErrorException(
        'Не удалось получить быстрый ответ от модели ИИ.',
      );
    }
  }

  // == ВЕТКИ ==
  async branchChat(
    userId: number,
    originalChatId: string,
    branchChatDto: BranchChatDto,
  ): Promise<Chat & { messages: Message[] }> {
    // Возвращаемый тип
    const { branchedAfterMessageId, initialMessageContent, title } =
      branchChatDto;

    const originalChat = await this.prisma.chat.findUnique({
      where: { id: originalChatId, userId },
      include: {
        messages: {
          where: { id: branchedAfterMessageId },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!originalChat) {
      throw new NotFoundException(
        'Оригинальный чат не найден или у вас нет к нему доступа.',
      );
    }
    if (!originalChat.messages || originalChat.messages.length === 0) {
      throw new BadRequestException(
        `Сообщение с ID ${branchedAfterMessageId} не найдено в чате ${originalChatId}.`,
      );
    }
    const branchingPointMessage = originalChat.messages[0];

    const messagesToCopy = await this.prisma.message.findMany({
      where: {
        chatId: originalChatId,
        createdAt: { lte: branchingPointMessage.createdAt },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (messagesToCopy.length === 0) {
      throw new InternalServerErrorException(
        'Не удалось найти сообщения для копирования в новую ветку.',
      );
    }

    const newBranchChat = await this.prisma.chat.create({
      data: {
        userId,
        title: title || `Ветка от "${originalChat.title || 'диалога'}"`,
        parentChatId: originalChatId,
        branchedAfterMessageId: branchedAfterMessageId,
      },
    });

    await this.prisma.message.createMany({
      data: messagesToCopy.map((msg) => ({
        chatId: newBranchChat.id,
        content: msg.content,
        role: msg.role,
        llmId: msg.llmId,
        createdAt: msg.createdAt,
      })),
    });

    if (initialMessageContent) {
      const userMessageInBranch = await this.prisma.message.create({
        data: {
          chatId: newBranchChat.id,
          content: initialMessageContent,
          role: MessageSenderRole.USER,
        },
      });
      // Если нужен автоматический ответ ИИ на это сообщение, потребуется вызов
      // sendMessageAndStreamResponse или getQuickAnswer для newBranchChat.id
    }
    const resultChat = await this.prisma.chat.findUnique({
      where: { id: newBranchChat.id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!resultChat) {
      throw new InternalServerErrorException(
        'Не удалось получить данные о созданной ветке.',
      );
    }
    return resultChat as Chat & { messages: Message[] }; // Убеждаемся в типе
  }

  // == МОДЕЛИ (moved to ai-models) ==
  // async getAvailableAiModels(): Promise<DbAiModel[]> {
  //   // Используем DbAiModel
  //   try {
  //     return this.prisma.aiModel.findMany({
  //       orderBy: [{ isFree: 'desc' }, { displayName: 'asc' }],
  //     });
  //   } catch {
  //     throw new InternalServerErrorException(
  //       'Не удалось получить список моделей ИИ.',
  //     );
  //   }
  // }

  // async syncOpenRouterModels() {
  //   try {
  //     const openRouterModels =
  //       await this.openrouterService.getAvailableModels();
  //     let createdCount = 0;
  //     let updatedCount = 0;

  //     for (const model of openRouterModels) {
  //       const existingModel = await this.prisma.aiModel.findUnique({
  //         where: { modelId: model.id },
  //       });

  //       const modelData: Prisma.AiModelCreateInput | Prisma.AiModelUpdateInput =
  //         {
  //           modelId: model.id,
  //           displayName: model.name || model.id,
  //           description: model.description || '',
  //           isFree:
  //             parseFloat(model.pricing?.prompt) === 0 &&
  //             parseFloat(model.pricing?.completion) === 0,
  //           pricePerMToken: model.pricing?.prompt
  //             ? parseFloat(model.pricing.prompt) * 1000000
  //             : 0, // Цена за 1М токенов
  //           canRecognizeImages: model.architecture?.modality === 'multimodal',
  //           maxContextLength: model.context_length || 0,
  //         };

  //       if (existingModel) {
  //         await this.prisma.aiModel.update({
  //           where: { modelId: model.id },
  //           data: modelData as Prisma.AiModelUpdateInput,
  //         });
  //         updatedCount++;
  //       } else {
  //         await this.prisma.aiModel.create({
  //           data: modelData as Prisma.AiModelCreateInput,
  //         });
  //         createdCount++;
  //       }
  //     }
  //     return {
  //       created: createdCount,
  //       updated: updatedCount,
  //       totalFetched: openRouterModels.length,
  //     };
  //   } catch {
  //     throw new InternalServerErrorException(
  //       'Ошибка синхронизации моделей с OpenRouter.',
  //     );
  //   }
  // }
}
