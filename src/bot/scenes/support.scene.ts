import {
  Action,
  Command,
  Ctx,
  Hears,
  On,
  Scene,
  SceneEnter,
} from 'nestjs-telegraf';
import { Markup } from 'telegraf';
import {
  WizardContext,
  SupportWizardState,
  SceneSession,
} from '../types/wizard-context.type';
import { SupportService } from 'src/support/support.service';
import { $Enums } from '@prisma/client';

@Scene('support-wizard')
export class SupportWizardScene {
  constructor(private readonly supportService: SupportService) {}

  @SceneEnter()
  async onSceneEnter(@Ctx() ctx: WizardContext) {
    // Инициализируем сессию безопасным способом
    this.initSession(ctx);

    await ctx.reply(
      'Выберите тип обращения:',
      Markup.inlineKeyboard([
        [Markup.button.callback('Ошибка в работе сервиса', 'type_error')],
        [Markup.button.callback('Другое', 'type_other')],
        [Markup.button.callback('❌ Отмена', 'cancel')],
      ]),
    );
  }

  @Action(/type_(.+)/)
  async onTypeSelected(@Ctx() ctx: WizardContext) {
    // Проверяем наличие callbackQuery
    if (!ctx.callbackQuery) {
      return;
    }

    // Безопасно извлекаем тип из callback_query
    const callbackData =
      'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
    const type =
      callbackData === 'type_error' ? 'Ошибка в работе сервиса' : 'Другое';

    // Инициализируем сессию, если её нет
    this.initSession(ctx);

    // Безопасно обновляем состояние
    const session = this.getSession(ctx);
    if (session) {
      session.state.supportType = type;
      session.step = 'waiting_topic';
    }

    await ctx.answerCbQuery(); // Отвечаем на callback query
    await ctx.reply('Опишите тему обращения (до 150 слов):');
  }

  // Обработчик команды /cancel с высоким приоритетом
  @Hears('/cancel')
  async onCancelCommand(@Ctx() ctx: WizardContext) {
    await this.cancelOperation(ctx);
  }

  @On('text')
  async onMessage(@Ctx() ctx: WizardContext) {
    // Проверяем наличие message
    if (!ctx.message) {
      return;
    }

    // Инициализируем сессию, если её нет
    this.initSession(ctx);

    // Безопасно получаем сессию
    const session = this.getSession(ctx);
    if (!session) {
      return;
    }

    const step = session.step || '';
    const text = 'text' in ctx.message ? ctx.message.text : '';

    switch (step) {
      case 'waiting_topic': {
        // Сохраняем тему обращения
        session.state.supportTopic = text;
        await ctx.reply(
          'Напишите детали вашего обращения:',
          Markup.inlineKeyboard([]),
        );
        session.step = 'waiting_details';
        break;
      }

      case 'waiting_details': {
        // Получаем все данные из состояния
        const supportType = session.state.supportType || 'Не указано';
        const supportTopic = session.state.supportTopic || 'Не указана';

        const type =
          supportType !== 'Другое'
            ? $Enums.SupportTicketType.BUG_REPORT
            : $Enums.SupportTicketType.OTHER;
        const userId = ctx.from?.id.toString();
        if (!userId) {
          await ctx.reply('Ошибка создания тикета.');
          break;
        }

        await this.supportService.createTicket(
          userId,
          type,
          supportTopic,
          text,
        );

        // Отправляем итоговое сообщение
        await ctx.reply(
          `✅ Ваше обращение получено:\n` +
            `• Тип: ${supportType}\n` +
            `• Тема: ${supportTopic}\n` +
            `• Сообщение: ${text}`,
        );

        // Выходим из сцены
        await ctx.scene.leave();
        break;
      }

      default: {
        // Если пользователь отправил сообщение до выбора типа
        await ctx.reply(
          'Пожалуйста, выберите тип обращения, используя кнопки выше.',
        );
      }
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

  // Метод для отмены операции
  private async cancelOperation(ctx: WizardContext): Promise<void> {
    await ctx.reply(
      '⬅️ Заполнение формы отменено. Вы вышли из режима обращения в поддержку.',
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

      // Инициализируем сессию, если она не существует или не имеет нужной структуры
      if (
        !ctx.scene.session ||
        typeof ctx.scene.session !== 'object' ||
        !('state' in ctx.scene.session)
      ) {
        ctx.scene.session = {
          state: {} as SupportWizardState,
          step: 'initial',
        } as SceneSession;
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }

  private getSession(ctx: WizardContext): SceneSession | null {
    try {
      // Проверяем существование ctx.scene и ctx.scene.session
      if (!ctx.scene || typeof ctx.scene.session === 'undefined') {
        return null;
      }

      // Проверяем, что сессия имеет нужную структуру
      if (
        !ctx.scene.session ||
        typeof ctx.scene.session !== 'object' ||
        !('state' in ctx.scene.session)
      ) {
        return null;
      }

      return ctx.scene.session as unknown as SceneSession;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }
}
