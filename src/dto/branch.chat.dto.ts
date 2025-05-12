import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsInt,
} from 'class-validator';

export class BranchChatDto {
  @IsString()
  @IsNotEmpty()
  branchedAfterMessageId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100000)
  initialMessageContent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsInt()
  aiModelId?: number;
}
