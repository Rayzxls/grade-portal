import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { GenerateTranscriptUseCase } from '../application/generate-transcript.use-case';

@Controller('transcript')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TranscriptController {
  constructor(private generate: GenerateTranscriptUseCase) {}

  @Get('me')
  @Roles('STUDENT')
  async me(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const pdf = await this.generate.execute(user.id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="transcript-${user.id}.pdf"`,
      'Content-Length': pdf.length,
    });
    res.end(pdf);
  }
}
