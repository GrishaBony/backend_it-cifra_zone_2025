import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigModule } from '@nestjs/config';
import { TokenModule } from 'src/token/token.module';

@Module({
  imports: [ConfigModule, TokenModule],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
