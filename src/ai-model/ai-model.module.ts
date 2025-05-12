import { Module } from '@nestjs/common';
import { AIModelService } from './ai-model.service';
import { AIModelController } from './ai-model.controller';
import { OpenrouterModule } from 'src/openrouter/openrouter.module';

@Module({
  imports: [OpenrouterModule],
  providers: [AIModelService],
  controllers: [AIModelController],
})
export class AdminModule {}
