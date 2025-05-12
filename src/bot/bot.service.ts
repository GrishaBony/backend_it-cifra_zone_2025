import { Injectable } from '@nestjs/common';
import { Command, Ctx, Hears, Help, Start, Update } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { WizardContext } from './types/wizard-context.type';
import { RequiresAuth } from './decorators/requires-auth.decorator';

const MAIN_MENU = Markup.keyboard([
  ['🤖 Быстрый ответ от LLM'],
  ['📩 Обратиться в поддержку'],
]).resize();

@Update()
@Injectable()
export class BotService {
  @Start()
  async onStart(@Ctx() ctx: Context) {
    await ctx.reply(
      '👋 Добро пожаловать!\n/help - узнать, как пользоваться\n/menu - при необходимости вы всегда можете вызвать главное меню.',
      MAIN_MENU,
    );
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    await ctx.reply(
      `❗️ <b>Для регистрации и полноценной работы - используйте mini-app.</b>\n<i>(Нажмите кнопку в меню бота внизу для запуска mini-app)</i>\n\n` +
        `<b>Команды:</b>\n` +
        `👋 /start - Приветствие и краткая справка\n` +
        `ℹ️ /help - Это сообщение\n` +
        `📋 /menu - Главное меню с выбором действий\n` +
        `🚫 /cancel - Отменить текущее действие\n\n` +
        `<b>Главное меню:</b>\n` +
        `🤖 Быстрый ответ от LLM\n - Вы можете задать вопрос языковой модели не выходя из чата, при этом история сообщений сохранена не будет.\n\n` +
        `📩 Обратиться в поддержку\n - Вы можете обратиться в поддержку, если у вас возникли проблемы, вопросы или предложения по работе сервиса.`,
      { parse_mode: 'HTML' },
    );
  }

  @Command('menu')
  async onMenu(@Ctx() ctx: Context) {
    await ctx.reply('Выберите пункт меню:', MAIN_MENU);
  }

  @Command('cancel')
  async onCancel(@Ctx() ctx: Context) {
    await ctx.reply('🤷‍♂️ Сейчас нечего отменять.');
  }

  // @RequiresAuth()
  @Hears('🤖 Быстрый ответ от LLM')
  async onQuickLLM(@Ctx() ctx: WizardContext) {
    await ctx.scene.enter('quick-answer');
  }

  @RequiresAuth()
  @Hears('📩 Обратиться в поддержку')
  async onSupport(@Ctx() ctx: WizardContext) {
    await ctx.scene.enter('support-wizard');
  }
}
