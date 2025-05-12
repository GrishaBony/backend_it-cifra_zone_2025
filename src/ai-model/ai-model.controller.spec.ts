import { Test, TestingModule } from '@nestjs/testing';
import { AIModelController } from './ai-model.controller';

describe('AdminController', () => {
  let controller: AIModelController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIModelController],
    }).compile();

    controller = module.get<AIModelController>(AIModelController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
