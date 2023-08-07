/** nesjs */
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

/** providers */
import { NaturalLanguageService } from "./nlp.service";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [ConfigModule],
  providers: [NaturalLanguageService],
  exports: [NaturalLanguageService],
})
export class NaturalLanguageModule {}
