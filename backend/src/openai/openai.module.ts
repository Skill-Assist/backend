/** nesjs */
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

/** providers */
import { OpenaiService } from "./openai.service";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [ConfigModule],
  providers: [OpenaiService],
  exports: [OpenaiService],
})
export class OpenaiModule {}
