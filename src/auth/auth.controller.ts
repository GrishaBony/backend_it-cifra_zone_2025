import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { TelegramAuthDto } from 'src/dto/telegram.auth.dto';
import { UserPublicDto } from 'src/dto/public.user.dto';
import { Response } from 'express';
import { RefreshTokenGuard } from 'src/refresh-token/refresh-token.guard';
import { RequestWithJTI } from 'src/interfaces/request-with-jti.interface';
import { TokenService } from 'src/token/token.service';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', //NOTE - При запуске - указать
  sameSite: 'strict' as const,
  path: '/' as const,
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  private setCookies(res: Response, accessToken: string, refreshToken: string) {
    // Устанавливаем Access Token в HTTP-only куку
    res.cookie('accessToken', accessToken, {
      ...COOKIE_OPTIONS,
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15min
    });

    // Устанавливаем Refresh Token в HTTP-only куку
    res.cookie('refreshToken', refreshToken, {
      ...COOKIE_OPTIONS,
      expires: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 7d
    });
  }

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

    this.setCookies(res, authData.accessToken, authData.refreshToken);

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

    this.setCookies(res, authData.accessToken, authData.refreshToken);

    return new UserPublicDto(authData.user);
  }
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  async refreshTokens(
    @Res({ passthrough: true }) res: Response,
    @Req() req: RequestWithJTI,
  ) {
    await this.tokenService.revokeRefreshToken(req.jti);

    const payload = { id: req.user.id, telegramId: req.user.telegramId };
    const { accessToken, refreshToken } =
      await this.tokenService.genJWTPair(payload);

    this.setCookies(res, accessToken, refreshToken);
    return;
  }

  @UseGuards(RefreshTokenGuard)
  @Post('logout')
  @HttpCode(HttpStatus.CREATED)
  async logout(
    @Req() req: RequestWithJTI,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (await this.tokenService.revokeRefreshToken(req.jti)) {
      res.clearCookie('accessToken', COOKIE_OPTIONS);
      res.clearCookie('refreshToken', COOKIE_OPTIONS);
      return;
    }
  }
}
