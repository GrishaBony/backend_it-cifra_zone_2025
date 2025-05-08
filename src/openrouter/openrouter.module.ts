import { Module } from '@nestjs/common';
import { OpenrouterService } from './openrouter.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [OpenrouterService],
  exports: [OpenrouterService],
})
export class OpenrouterModule {}
