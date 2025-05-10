import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { TokenModule } from './token/token.module';
import { OpenrouterModule } from './openrouter/openrouter.module';
import { APP_GUARD } from '@nestjs/core';
import { AuthRolesGuard } from './auth-roles/auth-roles.guard';
import { DateUtilsService } from './date-utils/date-utils.service';
import { DateUtilsModule } from './date-utils/date-utils.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    UserModule,
    AuthModule,
    PrismaModule,
    TokenModule,
    OpenrouterModule,
    DateUtilsModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService, DateUtilsService],
})
export class AppModule {}
