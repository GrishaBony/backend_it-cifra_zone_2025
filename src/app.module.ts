import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { TokenModule } from './token/token.module';
import { OpenrouterModule } from './openrouter/openrouter.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthRolesGuard } from './auth-roles/auth-roles.guard';
import { DateUtilsService } from './date-utils/date-utils.service';
import { DateUtilsModule } from './date-utils/date-utils.module';
import { AdminModule } from './ai-model/ai-model.module';
import { BotService } from './bot/bot.service';
import { BotModule } from './bot/bot.module';
import { ScenesModule } from './bot/scenes/scenes.module';
import { SupportModule } from './support/support.module';
import { ChatService } from './chat/chat.service';
import { ChatController } from './chat/chat.controller';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    UserModule,
    AuthModule,
    PrismaModule,
    TokenModule,
    OpenrouterModule,
    DateUtilsModule,
    AdminModule,
    BotModule,
    SupportModule,
    ChatModule,
    // ScenesModule,
  ],
  controllers: [AppController, ChatController],
  providers: [AppService, DateUtilsService, BotService, ChatService],
})
export class AppModule {}
