// src/chat/dto/create-chat.dto.ts
import { IsString, IsOptional, MaxLength, IsInt } from 'class-validator';

export class CreateChatDto {
  @IsOptional()
  @IsString()
  @MaxLength(100000)
  initialMessage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsInt()
  aiModelId?: number;
}
