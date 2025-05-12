import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenrouterModule } from 'src/openrouter/openrouter.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ChatService } from './chat.service';

@Module({
  imports: [PrismaModule, OpenrouterModule, ConfigModule],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
