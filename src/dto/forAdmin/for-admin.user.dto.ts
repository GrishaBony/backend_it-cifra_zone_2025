import { DateUtilsService } from 'src/date-utils/date-utils.service';
import { UserPublicDto } from '../public.user.dto';
import { User } from '@prisma/client';

export class UserForAdminDto extends UserPublicDto {
  id: number;
  telegramId: string;
  lastAuth: string;
  createdAt: string;
  updatedAt: string;

  constructor(user: User, dateUtilsService: DateUtilsService) {
    super(user);
    this.id = user.id;
    this.telegramId = user.telegramId;
    this.lastAuth = dateUtilsService.formatDate(user.lastAuth);
    this.createdAt = dateUtilsService.formatDate(user.createdAt);
    this.updatedAt = dateUtilsService.formatDate(user.updatedAt);
  }
}
