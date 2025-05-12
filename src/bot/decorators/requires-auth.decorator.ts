import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { TelegramAuthGuard } from '../guards/telegram-auth/telegram-auth.guard';

export function RequiresAuth() {
  return applyDecorators(
    SetMetadata('requiresAuth', true),
    UseGuards(TelegramAuthGuard),
  );
}
