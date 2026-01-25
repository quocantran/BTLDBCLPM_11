import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ExamsService } from './exams.service';

@Injectable()
export class ExamStatusScheduler {
  private readonly logger = new Logger(ExamStatusScheduler.name);

  constructor(private readonly examsService: ExamsService) {}

  @Cron('*/5 * * * * *')
  async handleStatusTransitions(): Promise<void> {
    try {
      await this.examsService.processAutomaticStatusTransitions();
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process exam status transitions: ${reason}`);
    }
  }
}
