/** nesjs */
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

/** providers */
import { OpenaiService } from "./openai.service";
import { NaturalLanguageService } from "./natural-language.service";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [ConfigModule],
  providers: [OpenaiService, NaturalLanguageService],
  exports: [OpenaiService, NaturalLanguageService],
})
export class OpenaiModule {}
