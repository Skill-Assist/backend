/** nestjs */
import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { TerminusModule } from "@nestjs/terminus";

/** controllers */
import { HealthController } from "./health.controller";
//////////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [HttpModule, TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
