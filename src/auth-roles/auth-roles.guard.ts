import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenService } from 'src/token/token.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { RequestWithUser } from 'src/interfaces/request-with-user.interface';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class AuthRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly prismaService: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      // Получаем роли, указанные декоратором @Roles()
      const requiredRoles = this.reflector.get<Role[]>(
        ROLES_KEY,
        context.getHandler(),
      );

      const request: RequestWithUser = context.switchToHttp().getRequest();
      const accessToken = request.cookies['accessToken'] as string;

      if (!accessToken) {
        throw new UnauthorizedException('Ошибка авторизации пользователя');
      }

      const tokenPayload = this.tokenService.validateAccessToken(accessToken);

      const user = await this.prismaService.user.findUnique({
        where: { id: tokenPayload.id },
      });

      if (!user) {
        throw new UnauthorizedException('Ошибка авторизации пользователя.');
      }

      // Проверка роли пользователя из базы данных - это основной источник правды
      if (!requiredRoles.includes(user.role)) {
        throw new ForbiddenException(`Недостаточно прав.`);
      }

      // Прикрепляем пользователя к объекту запроса
      request.user = user;

      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error; // Перебрасываем известные ошибки авторизации/доступа
      }
      // Для неизвестных ошибок, чтобы не раскрывать детали
      throw new UnauthorizedException(
        'Внутреняя ошибка сервера при авторизации пользователя.',
      );
    }
  }
}
