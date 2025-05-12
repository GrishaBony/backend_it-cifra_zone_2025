import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthRolesGuard } from 'src/auth-roles/auth-roles.guard';
import { AIModelService } from './ai-model.service';
import { Roles } from 'src/auth-roles/roles.decorator';
import { Role } from '@prisma/client';
import { OpenrouterService } from 'src/openrouter/openrouter.service';
import { CreateAIModelDto } from 'src/dto/create.AIModel.dto';

@UseGuards(AuthRolesGuard)
@Controller('ai-models')
export class AIModelController {
  constructor(
    private readonly aiModelService: AIModelService,
    private readonly openRouterService: OpenrouterService,
  ) {}

  @Roles(Role.ADMIN)
  @Put('api-key')
  async updateApiKey(@Body() dto: { apiKey: string }) {
    const res = await this.aiModelService.updateApiKey(dto.apiKey);
    if (res.fastLLMAnswerModel) {
      return;
    } else {
      throw new InternalServerErrorException(
        'Возникла непредвиденная ошибка сервера при обновлении API-ключа',
      );
    }
  }

  // === AI MODELS SETTINGS ===
  // >> GET
  @Roles(Role.ADMIN)
  @Get('all')
  async getAllAiModels() {
    const models = await this.openRouterService.getAvailableModels();

    //NOTE - Возвращаем только бесплатные модели и оставляем только нужные поля
    const freeModels = models
      .filter((model) => model.id.endsWith(':free'))
      .map((model) => ({
        modelId: model.id,
        displayName: model.name,
        description: model.description,
        modality: model.architecture.modality,
        canRecognizeImages:
          model.architecture.input_modalities.includes('image'),
        maxContextLength: model.context_length,
      }));
    return freeModels;
  }

  @Roles(Role.ADMIN)
  @Get('')
  async getAiModels() {
    const models = await this.aiModelService.getAiModels();
    return models;
  }

  @Roles(Role.ADMIN)
  @Get('fast-answer')
  async getFAModel() {
    const model = await this.aiModelService.getFastAnswerModel();
    if (model) {
      return model.fastLLMAnswerModel;
    }
  }

  // >> POST
  @Roles(Role.ADMIN)
  @Post('fast-answer')
  async changeFAModel(@Body() dto: { model: string }) {
    await this.aiModelService.setFastAnswerMode(dto.model);
    return;
  }

  @Roles(Role.ADMIN)
  @Post('')
  async addAiModel(@Body() dto: CreateAIModelDto) {
    await this.aiModelService.createAiModel(dto);
    return;
  }

  // DELETE
  @Roles(Role.ADMIN)
  @Delete(':id')
  async deleteAiModel(@Param('id', ParseIntPipe) id: number) {
    await this.aiModelService.deleteAiModel(id);
    return;
  }
}
