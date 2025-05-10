import { Global, Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    TokenService,
    // JwtService для access-токенов
    {
      provide: 'JWT_ACCESS',
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.get<string>('JWT_ACCESS_SECRET'),
          signOptions: { expiresIn: '15m' },
        }),
      inject: [ConfigService],
    },
    // JwtService для refresh-токенов
    {
      provide: 'JWT_REFRESH',
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.get<string>('JWT_REFRESH_SECRET'),
          signOptions: { expiresIn: '1d' },
        }),
      inject: [ConfigService],
    },
  ],
  exports: [TokenService],
})
export class TokenModule {}
