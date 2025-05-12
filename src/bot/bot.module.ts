import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';
import { session } from 'telegraf';
import { BotService } from './bot.service';
import { ScenesModule } from './scenes/scenes.module';

@Module({
  imports: [
    ScenesModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const token = config.get<string>('TELEGRAM_BOT_TOKEN');
        if (!token) {
          throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env');
        }

        return {
          token: token,
          middlewares: [session()],
          include: [ScenesModule, BotModule],
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [BotService],
})
export class BotModule {}
