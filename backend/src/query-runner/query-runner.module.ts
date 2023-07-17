/** nestjs */
import { Module } from "@nestjs/common";

/** providers */
import { QueryRunnerService } from "./query-runner.service";
////////////////////////////////////////////////////////////////////////////////

@Module({
  providers: [QueryRunnerService],
  exports: [QueryRunnerService],
})
export class QueryRunnerModule {}
