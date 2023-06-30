/** nesjs */
import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

/** modules */
import { AnswerModule } from "../answer/answer.module";
import { SectionModule } from "../section/section.module";
import { AnswerSheetModule } from "../answer-sheet/answer-sheet.module";

/** controllers */
import { SectionToAnswerSheetController } from "./section-to-answer-sheet.controller";

/** providers */
import { QueryRunnerFactory } from "../utils/query-runner.factory";
import { SectionToAnswerSheetService } from "./section-to-answer-sheet.service";

/** entities */
import { SectionToAnswerSheet } from "./entities/section-to-answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [
    forwardRef(() => AnswerModule),
    SectionModule,
    AnswerSheetModule,
    TypeOrmModule.forFeature([SectionToAnswerSheet]),
  ],
  controllers: [SectionToAnswerSheetController],
  providers: [SectionToAnswerSheetService, QueryRunnerFactory],
  exports: [SectionToAnswerSheetService],
})
export class SectionToAnswerSheetModule {}
