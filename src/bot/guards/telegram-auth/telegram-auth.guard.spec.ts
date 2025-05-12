import { TelegramAuthGuard } from './telegram-auth.guard';

describe('TelegramAuthGuard', () => {
  it('should be defined', () => {
    expect(new TelegramAuthGuard()).toBeDefined();
  });
});
