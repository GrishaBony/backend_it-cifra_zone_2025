import { Module } from '@nestjs/common';
import { SupportWizardScene } from './support.scene';
import { QuickAnswerWizardScene } from './quick-answer.scene';
import { ChatModule } from 'src/chat/chat.module';

@Module({
  imports: [ChatModule],
  providers: [SupportWizardScene, QuickAnswerWizardScene],
  exports: [SupportWizardScene, QuickAnswerWizardScene],
})
export class ScenesModule {}
