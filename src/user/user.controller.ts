import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
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
import { UpdateUserDto } from 'src/dto/update.user.dto';

@UseGuards(AuthRolesGuard)
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly dateUtilsService: DateUtilsService,
  ) {}

  // ==== Маршруты для пользователя ====
  @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  @Get('me')
  async getMe(@Req() req: RequestWithUser) {
    const user = await this.userService.getById(req.user.id);
    return new UserPublicDto(user);
  }

  @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  @Patch('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateMe(@Req() req: RequestWithUser, @Body() dto: UpdateUserDto) {
    await this.userService.updateById(req.user.id, dto);
    return;
  }

  @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMyAccount(@Req() req: RequestWithUser) {
    await this.userService.deleteById(req.user.id);
    return;
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

  @Roles(Role.USER, Role.ORG_USER, Role.ADMIN)
  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateUserById(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    await this.userService.updateById(id, dto);
    return;
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUserById(@Param('id', ParseIntPipe) id: number) {
    await this.userService.deleteById(id);
    return;
  }
}
