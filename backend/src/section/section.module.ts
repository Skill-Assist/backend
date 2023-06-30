/** nestjs */
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

/** modules */
import { ExamModule } from "../exam/exam.module";

/** controllers */
import { SectionController } from "./section.controller";

/** providers */
import { SectionService } from "./section.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";

/** entities */
import { Section } from "./entities/section.entity";
////////////////////////////////////////////////////////////////////////////////

@Module({
  imports: [ExamModule, TypeOrmModule.forFeature([Section])],
  controllers: [SectionController],
  providers: [SectionService, QueryRunnerFactory],
  exports: [SectionService],
})
export class SectionModule {}
