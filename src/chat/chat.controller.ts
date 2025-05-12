import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  Sse,
  MessageEvent,
  Query,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Observable, map, catchError, from, finalize, EMPTY } from 'rxjs';
import { Roles } from 'src/auth-roles/roles.decorator';
import { Role } from '@prisma/client';
import { RequestWithUser } from 'src/interfaces/request-with-user.interface';
import { ChatService } from './chat.service';
import { CreateChatDto } from 'src/dto/create.chat.dto';
import { UpdateChatDto } from 'src/dto/update.chat.dto';
import { SendMessageDto } from 'src/dto/send.message.dto';
import { BranchChatDto } from 'src/dto/branch.chat.dto';
import { AuthRolesGuard } from 'src/auth-roles/auth-roles.guard';

@UseGuards(AuthRolesGuard)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  @Post()
  async createChat(
    @Req() req: RequestWithUser,
    @Body() createChatDto: CreateChatDto,
  ) {
    const userId = req.user.id;
    return this.chatService.createChat(userId, createChatDto);
  }

  // Note page, pageSize
  @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  @Get()
  async getUserChats(
    @Req() req: RequestWithUser,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    const userId = req.user.id;
    const pageNum = parseInt(page, 10) || 1;
    const pageSizeNum = parseInt(pageSize, 10) || 20;
    return this.chatService.getUserChats(userId, pageNum, pageSizeNum);
  }

  @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  @Get(':chatId')
  async getChatById(
    @Param('chatId') chatId: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    return this.chatService.getChatById(chatId, userId);
  }

  @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  @Patch(':chatId')
  async updateChat(
    @Param('chatId') chatId: string,
    @Req() req: RequestWithUser,
    @Body() updateChatDto: UpdateChatDto,
  ) {
    const userId = req.user.id;
    return this.chatService.updateChat(chatId, userId, updateChatDto);
  }

  @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  @Delete(':chatId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChat(
    @Param('chatId') chatId: string,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.id;
    await this.chatService.deleteChat(chatId, userId);
  }

  //   @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  //   @Get(':chatId/messages')
  //   async getMessagesForChat(
  //     @Param('chatId') chatId: string,
  //     @Req() req: RequestWithUser,
  //     @Query('page') page: string,
  //     @Query('pageSize') pageSize: string,
  //   ) {
  //     const userId = req.user.id;
  //     const pageNum = parseInt(page, 10) || 1;
  //     const pageSizeNum = parseInt(pageSize, 10) || 50;
  //     return this.chatService.getMessagesForChat(
  //       chatId,
  //       userId,
  //       pageNum,
  //       pageSizeNum,
  //     );
  //   }
  @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  @Post(':chatId/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Param('chatId') chatId: string,
    @Body() sendMessageDto: SendMessageDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user?.id;

    const result = await this.chatService.sendMessageAndGetResponse(
      chatId,
      userId,
      sendMessageDto,
    );

    return result.aiMessage;
  }

  @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  @Sse(':chatId/messages/stream') // Server-Sent Events endpoint
  async sendMessageAndStreamResponse(
    @Param('chatId') chatId: string,
    @Req() req: RequestWithUser,
    @Body() sendMessageDto: SendMessageDto,
  ): Promise<Observable<MessageEvent>> {
    const userId = req.user.id;

    try {
      // sendMessageAndStreamResponse теперь возвращает объект с userMessage и aiResponseStream
      const { userMessage, aiResponseStream, aiModelUsed } =
        await this.chatService.sendMessageAndStreamResponse(
          chatId,
          userId,
          sendMessageDto,
        );

      // Первый эвент: информация о созданном сообщении пользователя и используемой модели
      const initialEvent: MessageEvent = {
        type: 'user_message_created',
        data: {
          messageId: userMessage.id,
          chatId: userMessage.chatId,
          content: userMessage.content,
          role: userMessage.role,
          createdAt: userMessage.createdAt,
          aiModelId: aiModelUsed.id, // ID модели из вашей БД
          aiModelIdentifier: aiModelUsed.modelId, // modelId от OpenRouter
        },
      };

      // Последующие эвенты: чанки ответа LLM
      return from(Promise.resolve(initialEvent)).pipe(
        // Оборачиваем initialEvent в Observable
        // Используем from для создания Observable из Promise, который разрешается в initialEvent
        (source: Observable<MessageEvent>) =>
          new Observable<MessageEvent>((observer) => {
            source.subscribe({
              // Подписываемся на Observable с initialEvent
              next: (event) => observer.next(event), // Отправляем initialEvent
              error: (err) => observer.error(err),
              complete: () => {
                // Когда initialEvent отправлен, подписываемся на aiResponseStream
                aiResponseStream
                  .pipe(
                    map(
                      (chunk: string): MessageEvent => ({
                        type: 'ai_chunk',
                        data: { text: chunk },
                      }),
                    ),
                    catchError((error) => {
                      const errorMessage =
                        error instanceof Error
                          ? error.message
                          : 'Неизвестная ошибка потока LLM';

                      observer.next({
                        type: 'error',
                        data: { errorMessage },
                      });
                      observer.error(error); // Это закроет SSE соединение с ошибкой
                      //   return throwError(() => error);
                      return EMPTY;
                    }),
                    finalize(() => {
                      observer.next({
                        type: 'ai_stream_end',
                        data: { message: 'Поток завершен.' },
                      });
                      observer.complete();
                    }),
                  )
                  .subscribe(observer); // Подписываем основной observer на обработанный aiResponseStream
              },
            });
          }),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Не удалось начать стрим.';

      // Если ошибка произошла до начала стрима (например, чат не найден)
      return new Observable<MessageEvent>((observer) => {
        observer.next({
          type: 'error',
          data: { errorMessage },
        });
        observer.complete(); // или observer.error(error) - закрыть соединение с ошибкой
      });
    }
  }

  @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  @Post(':chatId/branch')
  async branchChat(
    @Param('chatId') originalChatId: string,
    @Req() req: RequestWithUser,
    @Body() branchChatDto: BranchChatDto,
  ) {
    const userId = req.user.id;
    return this.chatService.branchChat(userId, originalChatId, branchChatDto);
  }

  // --- AI Model ---
  //   @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  //   @Get('ai/models')
  //   async getAvailableAiModels(@Req() req: RequestWithUser) {
  //     // const userId = req.user?.id || 1; // Заглушка, если доступ к моделям зависит от пользователя
  //     this.logger.log(`Fetching available AI models from DB.`);
  //     return this.chatService.getAvailableAiModels();
  //   }

  //   @Roles(Role.ADMIN)
  //   @Post('ai/sync-models')
  //   async syncOpenRouterModels(@Req() req: RequestWithUser) {
  //     return this.chatService.syncOpenRouterModels();
  //   }
}
