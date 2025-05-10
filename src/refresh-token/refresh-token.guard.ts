import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RequestWithJTI } from 'src/interfaces/request-with-jti.interface';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenService } from 'src/token/token.service';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly prismaService: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request: RequestWithJTI = context.switchToHttp().getRequest();
      const refreshToken = request.cookies['refreshToken'] as string;

      if (!refreshToken) {
        throw new UnauthorizedException('Ошибка авторизации пользователя');
      }

      const tokenPayload =
        await this.tokenService.validateRefreshToken(refreshToken);

      const user = await this.prismaService.user.findUnique({
        where: { id: tokenPayload.id },
      });

      if (!user) {
        throw new UnauthorizedException('Ошибка авторизации пользователя.');
      }

      // Прикрепляем пользователя и jti к объекту запроса
      request.user = user;
      request.jti = tokenPayload.jti;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error; // Перебрасываем известные ошибки авторизации/доступа
      }
      // Для неизвестных ошибок, чтобы не раскрывать детали
      throw new UnauthorizedException(
        'Внутреняя ошибка сервера при авторизации пользователя.',
      );
    }
  }
}
