import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthRolesGuard } from 'src/auth-roles/auth-roles.guard';
import { Roles } from 'src/auth-roles/roles.decorator';
import { RequestWithUser } from 'src/interfaces/request-with-user.interface';
import { Role } from '@prisma/client';
import { UserPublicDto } from 'src/dto/public.user.dto';
import { UserForAdminDto } from 'src/dto/forAdmin/for-admin.user.dto';
import { DateUtilsService } from 'src/date-utils/date-utils.service';

@UseGuards(AuthRolesGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly dateUtilsService: DateUtilsService,
  ) {}

  // ==== Маршруты для пользователя ====
  @Roles(Role.USER, Role.ADMIN)
  @Get('me')
  async getMe(@Req() req: RequestWithUser) {
    const user = await this.userService.getById(req.user.id);
    return new UserPublicDto(user);
  }

  // ==== Маршруты для администратора ====
  @Roles(Role.ADMIN)
  @Get()
  async getAllUsers() {
    const users = await this.userService.getAll();
    return users.map(
      (user) => new UserForAdminDto(user, this.dateUtilsService),
    );
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    const user = await this.userService.getById(id);
    return new UserForAdminDto(user, this.dateUtilsService);
  }
}
