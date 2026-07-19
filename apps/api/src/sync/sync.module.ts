import { Module } from "@nestjs/common";
import { IngestionService } from "./ingestion.service";
import { SyncController } from "./sync.controller";

@Module({
  controllers: [SyncController],
  providers: [IngestionService],
})
export class SyncModule {}
