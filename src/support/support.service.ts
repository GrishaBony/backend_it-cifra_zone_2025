import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupportTicketType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  async getTickets() {
    try {
      const tickets = await this.prisma.supportTicket.findMany(
        {
          include: {
            user: true,
          }
        }
      );
      return tickets;
    } catch {
      throw new InternalServerErrorException(
        'Внутреняя ошибка сервера, не удалось получить тикеты.',
      );
    }
  }

  async createTicket(tgId: string, type: SupportTicketType, theme: string, description: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { telegramId: tgId },
      });
      if (!user) {
        throw new InternalServerErrorException('Пользователь не найден');
      }

      const ticket = await this.prisma.supportTicket.create({
        data: {
          userId: user.id,
          type: type ?? 'Другое',
          theme: theme ?? 'Тема не задана',
          description: description ?? 'Нет описания',
        },
      });
      return ticket;
    } catch {
      throw new InternalServerErrorException(
        'Внутреняя ошибка сервера, не удалось получить тикеты.',
      );
    }
  }
}
