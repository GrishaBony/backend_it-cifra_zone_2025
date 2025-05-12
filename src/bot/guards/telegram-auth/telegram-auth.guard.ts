import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { PrismaService } from 'src/prisma/prisma.service';
import { Context } from 'telegraf';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = TelegrafExecutionContext.create(context).getContext<Context>();

    if (!ctx.from) {
      return false;
    }

    const telegramId = ctx.from.id.toString();

    try {
      // Проверяем, существует ли пользователь в базе данных
      const user = await this.prisma.user.findUnique({
        where: { telegramId: telegramId },
      });

      // Если пользователь не найден, отправляем сообщение и возвращаем false
      if (!user) {
        await ctx.reply(
          '⚠️ Для использования этой функции необходимо зарегистрироваться.\n' +
            'Пожалуйста, перейдите в mini-app для регистрации.',
        );
        return false;
      }

      // Добавляем пользователя в контекст для дальнейшего использования
      // (ctx as any).user = user;
      return true;
    } catch (error) {
      console.error(
        '[TG-BOT]: Ошибка проверки аунтификации пользователя:',
        error,
      );
      await ctx.reply(
        'Произошла ошибка при проверке авторизации. Пожалуйста, попробуйте позже.',
      );
      return false;
    }
  }
}
