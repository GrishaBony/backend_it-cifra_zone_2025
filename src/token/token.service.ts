import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

export interface TokenPayload {
  id: number;
  telegramId: string;
  role: string;
  jti: string;
}

@Injectable()
export class TokenService {
  private readonly saltRounds = 10;

  constructor(
    @Inject('JWT_ACCESS') private readonly jwtAccess: JwtService,
    @Inject('JWT_REFRESH') private readonly jwtRefresh: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async genJWTPair(payload: Omit<TokenPayload, 'jti'>) {
    const jti = uuidv4();
    const accessToken = this.jwtAccess.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtRefresh.sign(payload, { expiresIn: '1d' });
    const refreshTokenHash = await bcrypt.hash(refreshToken, this.saltRounds);

    try {
      await this.prisma.refreshToken.create({
        data: {
          jti: jti,
          token: refreshTokenHash,
          userId: payload.id,
        },
      });
    } catch {
      throw new InternalServerErrorException(
        'Возникла непредвиденная ошибка сервера, пожалуйста повторите попытку позже.',
      );
    }

    return { accessToken, refreshToken };
  }

  validateAccessToken(accessToken: string): Omit<TokenPayload, 'jti'> {
    try {
      const decoded = this.jwtAccess.verify<TokenPayload>(accessToken);

      const { id, telegramId, role } = decoded;
      return { id, telegramId, role };
    } catch {
      throw new UnauthorizedException('Ошибка авторизации пользователя');
    }
  }

  async validateRefreshToken(
    refreshToken: string,
  ): Promise<Omit<TokenPayload, 'jti'>> {
    try {
      const decoded = this.jwtRefresh.verify<TokenPayload>(refreshToken);

      const refreshTokenDB = await this.prisma.refreshToken.findUnique({
        where: { token: decoded.jti },
      });

      if (!refreshTokenDB) {
        throw new UnauthorizedException('Ошибка авторизации пользователя');
      }

      const isMatch = await bcrypt.compare(refreshToken, refreshTokenDB.token);
      if (!isMatch) {
        await this.prisma.refreshToken.delete({ where: { jti: decoded.jti } });
        throw new UnauthorizedException('Ошибка авторизации пользователя');
      }

      const { id, telegramId, role } = decoded;
      return { id, telegramId, role };
    } catch {
      throw new UnauthorizedException('Ошибка авторизации пользователя');
    }
  }
}
