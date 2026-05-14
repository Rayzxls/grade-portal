import { Module } from '@nestjs/common';
import { TranscriptController } from './presentation/transcript.controller';
import { GenerateTranscriptUseCase } from './application/generate-transcript.use-case';

@Module({
  controllers: [TranscriptController],
  providers: [GenerateTranscriptUseCase],
})
export class TranscriptModule {}
