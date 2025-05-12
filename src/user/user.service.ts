import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UpdateUserDto } from 'src/dto/update.user.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getAll() {
    const users = await this.prisma.user.findMany();
    if (!users) {
      throw new NotFoundException('Пользователи не найдены.');
    } else {
      return users;
    }
  }

  async getById(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден.');
    } else {
      return user;
    }
  }

  async updateById(userId: number, data: UpdateUserDto) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: data,
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Пользователь не найден.');
      } else {
        throw new InternalServerErrorException(
          'Возникла внутренняя ошибка сервера, во время обновления пользователя.',
        );
      }
    }
  }

  async deleteById(userId: number) {
    try {
      await this.prisma.user.delete({ where: { id: userId } });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Пользователь не найден.');
      } else {
        throw new InternalServerErrorException(
          'Возникла внутренняя ошибка сервера, во время удаления пользователя.',
        );
      }
    }
  }
}
