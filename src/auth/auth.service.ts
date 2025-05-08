import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isValid, parse } from '@telegram-apps/init-data-node';
import { PrismaService } from 'src/prisma/prisma.service';
import { TokenPayload, TokenService } from 'src/token/token.service';

@Injectable()
export class AuthService {
  private readonly botToken: string;

  constructor(
    private config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN не задан в .env'); //REVIEW - move to bootstrap
    }
    this.botToken = token;
  }

  // Локальная функция для валидации и парсинга initData
  private validateAndParse(initData: string) {
    // 6min
    if (!isValid(initData, this.botToken, { expiresIn: 360 })) {
      throw new UnauthorizedException(
        'Ошибка авторизации, пожалуйста перезапустите mini-app.',
      );
    }
    return parse(initData);
  }

  async authWithInitData(initData: string) {
    const { user } = this.validateAndParse(initData);
    const tgId = user?.id.toString();

    const dbUser = await this.prisma.user.findUnique({
      where: { telegramId: tgId },
    });

    if (!dbUser) {
      return null;
    }

    try {
      await this.prisma.user.update({
        where: { id: dbUser.id },
        data: {
          lastAuth: new Date(),
        },
      });

      // Генерируем пару токенов
      const payload: Omit<TokenPayload, 'jti'> = {
        id: dbUser.id,
        telegramId: dbUser.telegramId,
        role: dbUser.role,
      };
      const tokens = await this.tokenService.genJWTPair(payload);

      return { user: dbUser, ...tokens };
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(
        'Возникла непредвиденная ошибка сервера, пожалуйста повторите попытку позже.',
      );
    }
  }

  async registerWithInitData(initData: string) {
    const { user, chat_instance } = this.validateAndParse(initData);
    const tgId = user?.id.toString();
    if (!tgId || !chat_instance || !user?.first_name) {
      throw new BadRequestException(
        'Ошибка регистрации, пожалуйста перезапустите mini-app.',
      );
    }

    const isUserExists = await this.prisma.user.findUnique({
      where: { telegramId: tgId },
    });

    if (isUserExists) {
      throw new ConflictException('Пользователь уже сущетсвует');
    }

    try {
      const dbUser = await this.prisma.user.create({
        data: {
          telegramId: tgId,
          chatInstance: chat_instance,
          firstName: user.first_name,
          lastName: user?.last_name,
          photoUrl: user?.photo_url,
          username: user?.username,
          lastAuth: new Date(),
        },
      });

      // Генерируем пару токенов
      const payload: Omit<TokenPayload, 'jti'> = {
        id: dbUser.id,
        telegramId: dbUser.telegramId,
        role: dbUser.role,
      };
      const tokens = await this.tokenService.genJWTPair(payload);

      return { user: dbUser, ...tokens };
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(
        'Возникла непредвиденная ошибка сервера, пожалуйста повторите попытку позже.',
      );
    }
  }
}
