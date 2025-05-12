import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { CreateAIModelDto } from 'src/dto/create.AIModel.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AIModelService {
  constructor(private readonly prisma: PrismaService) {}

  async updateApiKey(apiKey: string) {
    try {
      const siteSettings = await this.prisma.siteSettings.findFirst();
      if (!siteSettings) {
        return await this.prisma.siteSettings.create({
          data: { openRouterApiKey: apiKey },
        });
      } else {
        return await this.prisma.siteSettings.update({
          where: { id: 1 },
          data: { openRouterApiKey: apiKey },
        });
      }
    } catch {
      throw new InternalServerErrorException(
        'Возникла непредвиденная ошибка сервера при обновлении API-ключа',
      );
    }
  }

  async getFastAnswerModel() {
    const model = await this.prisma.siteSettings.findFirst();
    if (!model) {
      try {
        await this.prisma.siteSettings.create({ data: {} });
      } catch {
        throw new InternalServerErrorException(
          'Ошибка при создании записи в таблице настроек',
        );
      }
    } else {
      return model;
    }
  }
  async setFastAnswerMode(model: string) {
    try {
      await this.prisma.siteSettings.update({
        where: { id: 1 },
        data: { fastLLMAnswerModel: model },
      });
    } catch {
      throw new InternalServerErrorException(
        'Возникла внутренняя ошибка сервера, во время обновления модели.',
      );
    }
  }

  async getAiModels() {
    const models = await this.prisma.aiModel.findMany();
    if (!models) {
      throw new NotFoundException('Модели не заданы.');
    } else {
      return models;
    }
  }

  async createAiModel(model: CreateAIModelDto) {
    try {
      const created = await this.prisma.aiModel.create({
        data: model,
      });
      return created;
    } catch {
      throw new InternalServerErrorException(
        'Возникла внутренняя ошибка сервера, во время добавления модели.',
      );
    }
  }

  async deleteAiModel(modelId: number) {
    try {
      await this.prisma.aiModel.delete({
        where: { id: modelId },
      });
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Модель не найдена.');
      } else {
        throw new InternalServerErrorException(
          'Возникла внутренняя ошибка сервера, во время удаления модели.',
        );
      }
    }
  }
}
