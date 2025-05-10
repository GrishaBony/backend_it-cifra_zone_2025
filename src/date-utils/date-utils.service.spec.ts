import { Test, TestingModule } from '@nestjs/testing';
import { DateUtilsService } from './date-utils.service';

describe('DateUtilsService', () => {
  let service: DateUtilsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DateUtilsService],
    }).compile();

    service = module.get<DateUtilsService>(DateUtilsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
