import { Controller, Get, Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

@Controller('health')
class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
import { AuthModule } from './modules/auth/auth.module';
import { GradeModule } from './modules/grade/grade.module';
import { AdminModule } from './modules/admin/admin.module';
import { TranscriptModule } from './modules/transcript/transcript.module';
import { PrismaModule } from './infrastructure/prisma/prisma.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    GradeModule,
    AdminModule,
    TranscriptModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
