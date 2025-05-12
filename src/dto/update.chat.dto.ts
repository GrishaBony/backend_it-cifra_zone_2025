// src/chat/dto/update-chat.dto.ts
import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';

export class UpdateChatDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
