/** nestjs */
import { Module } from "@nestjs/common";

/** providers */
import { AwsService } from "./aws.service";
////////////////////////////////////////////////////////////////////////////////

@Module({
  providers: [AwsService],
  exports: [AwsService],
})
export class AwsModule {}
