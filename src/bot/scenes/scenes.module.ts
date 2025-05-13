import { Module } from '@nestjs/common';
import { SupportWizardScene } from './support.scene';
import { QuickAnswerWizardScene } from './quick-answer.scene';
import { ChatModule } from 'src/chat/chat.module';
import { SupportModule } from 'src/support/support.module';

@Module({
  imports: [ChatModule, SupportModule],
  providers: [SupportWizardScene, QuickAnswerWizardScene],
  exports: [SupportWizardScene, QuickAnswerWizardScene],
})
export class ScenesModule {}
