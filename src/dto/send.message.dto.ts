// src/chat/dto/send-message.dto.ts
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
} from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100000)
  content: string;

  @IsOptional()
  @IsInt()
  aiModelId?: number;

  // Дополнительные параметры для OpenRouter
  @IsOptional()
  temperature?: number;

  @IsOptional()
  max_tokens?: number;
}
