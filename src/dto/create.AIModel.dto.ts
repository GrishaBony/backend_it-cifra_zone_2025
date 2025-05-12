import { $Enums } from '@prisma/client';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateAIModelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  role: $Enums.MessageSenderRole;

  @IsString()
  @IsNotEmpty()
  modelId: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsString()
  @IsNotEmpty()
  description: string | null;

  @IsBoolean()
  isFree: boolean;

  @IsNumber()
  @IsPositive()
  pricePerMToken: number;

  @IsBoolean()
  canRecognizeImages: boolean;

  @IsNumber()
  @IsPositive()
  maxContextLength: number;
}
