import { Action, Ctx, On, Scene, SceneEnter } from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import { LLMSceneSession, WizardContext } from '../types/wizard-context.type';
import { ChatService } from 'src/chat/chat.service';
import { OpenrouterMessage } from 'src/openrouter/interfaces/openrouter.interface';

@Scene('quick-answer')
export class QuickAnswerWizardScene {
  constructor(private readonly chatService: ChatService) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: WizardContext) {
    this.initSession(ctx);

    await ctx.reply(
      '🔎 Введите запрос:',
      Markup.inlineKeyboard([[Markup.button.callback('❌ Отмена', 'cancel')]]),
    );
  }

  @On('text')
  async onMessage(@Ctx() ctx: WizardContext) {
    // Проверяем наличие message
    if (!ctx.message) {
      return;
    }

    this.initSession(ctx);

    const session = this.getSession(ctx);
    if (!session) {
      return;
    }

    const text = 'text' in ctx.message ? ctx.message.text : '';

    if (!text) {
      await ctx.reply('Пожалуйста, введите текст.');
    }

    if (text === '/cancel') {
      await this.cancelOperation(ctx);
      return;
    }

    await ctx.sendMessage('🤖 Обрабатываем ваш запрос..');

    const userMessage: OpenrouterMessage = { role: 'user', content: text };
    session.messages.push(userMessage);

    const err_message =
      '🛑 Произошла ошибка во время обработки запроса, пожалуйста попробуйте позже.';
    try {
      const res = await this.chatService.getQuickAnswer('', session.messages);

      // Экранируем сиволы MarkdownV2
      const markdownFixed = () => {
        return (
          res
            .replace(/\\/g, '\\\\')
            // eslint-disable-next-line no-useless-escape
            // .replace(/([_*\[\]()~`>#+\-=|{}\.!])/g, '\\$1')
            // eslint-disable-next-line no-useless-escape
            .replace(/([\[\]()~>#+\-=|{}\.!])/g, '\\$1')
            .replace(/\*{2,}/g, '*')
        );
      };

      const aiMessage: OpenrouterMessage = {
        role: 'assistant',
        content: res,
      };
      session.messages.push(aiMessage);

      await ctx.reply(markdownFixed() || err_message, {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Выйти с чата', 'cancel')],
        ]),
        parse_mode: 'MarkdownV2',
      });
      // await ctx.sendMessage(JSON.stringify(session.messages));
    } catch (e) {
      console.error(e);
      await ctx.reply(err_message);
    }
  }

  // Обработчик для кнопки отмены
  @Action('cancel')
  async onCancelButton(@Ctx() ctx: WizardContext) {
    if (!ctx.callbackQuery) {
      return;
    }

    await ctx.answerCbQuery('Операция отменена');
    await this.cancelOperation(ctx);
  }

  private async cancelOperation(ctx: WizardContext): Promise<void> {
    await ctx.reply(
      '⬅️ Заполнение формы отменено. Вы вышли из режима запроса быстрого ответа от LLM.',
    );
    await ctx.scene.leave();
  }

  // Вспомогательные методы для безопасной работы с сессией
  private initSession(ctx: WizardContext): void {
    try {
      // Проверяем существование ctx.scene и ctx.scene.session
      if (!ctx.scene || typeof ctx.scene.session === 'undefined') {
        console.warn('Scene or scene.session is undefined');
        return;
      }

      const session = ctx.scene.session as Partial<LLMSceneSession>;

      if (!Array.isArray(session.messages)) {
        session.messages = [];
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }

  private getSession(ctx: WizardContext): LLMSceneSession | null {
    try {
      // Проверяем существование ctx.scene и ctx.scene.session
      if (!ctx.scene || typeof ctx.scene.session === 'undefined') {
        return null;
      }

      // Проверяем, что сессия имеет нужную структуру
      if (
        !ctx.scene.session ||
        typeof ctx.scene.session !== 'object' ||
        !('messages' in ctx.scene.session)
      ) {
        return null;
      }

      return ctx.scene.session as unknown as LLMSceneSession;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }
}
