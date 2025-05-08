import { IsNotEmpty, IsString } from 'class-validator';

export class TelegramAuthDto {
  @IsNotEmpty()
  @IsString()
  initData: string;
}
