import { Module } from '@nestjs/common';
import { ReadyDocsController } from './ready-docs.controller';
import { ReadyDocsService } from './ready-docs.service';

@Module({
  controllers: [ReadyDocsController],
  providers: [ReadyDocsService],
  exports: [ReadyDocsService],
})
export class ReadyDocsModule {}
