import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { DateUtilsModule } from 'src/date-utils/date-utils.module';

@Module({
  imports: [DateUtilsModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
