import { Controller, Get, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthRolesGuard } from 'src/auth-roles/auth-roles.guard';
import { Roles } from 'src/auth-roles/roles.decorator';
import { SupportService } from './support.service';

@UseGuards(AuthRolesGuard)
@Controller('support')
export class SupportController {
    constructor (
        private readonly supportService: SupportService,
    ) {}

    @Roles(Role.ADMIN)
    @Get('tickets')
    async getAllTickets() {
      const tikets = await this.supportService.getTickets();
      return tikets;
    }
}
