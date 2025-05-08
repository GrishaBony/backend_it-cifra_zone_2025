import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { TelegramAuthDto } from 'src/dto/telegram.auth.dto';
import { UserPublicDto } from 'src/dto/public.user.dto';
import { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UsePipes(new ValidationPipe())
  @Post('tg')
  @HttpCode(HttpStatus.OK)
  async authTelegram(
    @Body() dto: TelegramAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authData = await this.authService.authWithInitData(dto.initData);
    if (!authData) {
      return { userExists: false };
    }

    // Устанавливаем Access Token в HTTP-only куку
    res.cookie('accessToken', authData.accessToken, {
      httpOnly: true, // Только HTTP(S), скрипты с клиента не могут прочитать
      secure: process.env.NODE_ENV === 'production', // в продакшене по HTTPS
      sameSite: 'strict',
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15min
      path: '/',
    });

    // Устанавливаем Refresh Token в HTTP-only куку
    res.cookie('refreshToken', authData.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', //NOTE - При запуске - указать
      sameSite: 'strict',
      expires: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 7d
      path: '/',
    });

    return new UserPublicDto(authData.user);
  }

  @UsePipes(new ValidationPipe())
  @Post('tg/register')
  @HttpCode(HttpStatus.OK)
  async registerTelegram(
    @Body() dto: TelegramAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const authData = await this.authService.registerWithInitData(dto.initData);

    // Устанавливаем Access Token в HTTP-only куку
    res.cookie('accessToken', authData.accessToken, {
      httpOnly: true, // Только HTTP(S), скрипты с клиента не могут прочитать
      secure: process.env.NODE_ENV === 'production', // в продакшене по HTTPS
      sameSite: 'strict',
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15min
      path: '/',
    });

    // Устанавливаем Refresh Token в HTTP-only куку
    res.cookie('refreshToken', authData.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', //NOTE - При запуске - указать
      sameSite: 'strict',
      expires: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 7d
      path: '/',
    });

    return new UserPublicDto(authData.user);
  }
}
