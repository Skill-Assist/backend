/** nestjs */
import {
  Injectable,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
} from "@nestjs/common";

/** providers */
import { AnswerService } from "./answer/answer.service";
import { SectionService } from "./section/section.service";
import { AnswerSheetService } from "./answer-sheet/answer-sheet.service";
import { SectionToAnswerSheetService } from "./section-to-answer-sheet/section-to-answer-sheet.service";

/** external dependencies */
import { map } from "rxjs/operators";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class AppInterceptor implements NestInterceptor {
  constructor(
    private readonly answerService: AnswerService,
    private readonly sectionService: SectionService,
    private readonly answerSheetService: AnswerSheetService,
    private readonly sectionToAnswerSheetService: SectionToAnswerSheetService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): any {
    // extract controller and method from url
    const url = context.switchToHttp().getRequest().originalUrl;
    let [controller, method] = url.split("/api/v1/").pop().split("/");
    if (method && method.includes("?")) method = method.split("?")[0];

    // get user from request
    const user = context.switchToHttp().getRequest().user ?? undefined;

    return next.handle().pipe(
      map(async (data) => {
        // if user is not a candidate, return data as is
        if (controller !== "auth" && user.roles.includes("candidate")) {
          // endpoint: /api/v1/user/profile
          // previous interceptors: none
          if (controller === "user" && method === "profile") {
            for (const key of data.invitationsRef) {
              const exam = key.examRef;
              const answerSheet = exam.answerSheetsRef;
              if (exam.showScore || !answerSheet) continue;

              delete key.examRef.answerSheetsRef.aiScore;
              delete key.examRef.answerSheetsRef.revisedScore;
            }
          }

          // endpoint: /api/v1/exam/findOne
          // previous interceptors: none
          if (controller === "exam" && method === "findOne") {
            if (!data.showScore && data["__answerSheets__"])
              for (const key in data["__answerSheets__"]) {
                delete data["__answerSheets__"][key].aiScore;
                delete data["__answerSheets__"][key].revisedScore;
              }
          }

          // endpoint: /api/v1/section/findOne
          // previous interceptors: none
          if (controller === "section" && method === "findOne") {
            if (data["__sectionToAnswerSheets__"]) {
              // prettier-ignore
              const section = await this.sectionService.findOne(user.id, "id", data.id);
              const exam = await section.exam;

              if (!exam.showScore) {
                for (const key in data["__sectionToAnswerSheets__"]) {
                  delete data["__sectionToAnswerSheets__"][key].aiScore;
                  delete data["__sectionToAnswerSheets__"][key].revisedScore;
                }
              }
            }
          }

          // endpoint: /api/v1/answer-sheet/*
          // previous interceptors: AutocloseInterceptor, ExpirationFlagInterceptor
          if (controller === "answer-sheet") {
            const _data = await data;

            if (["findOne", "fetchOwn", "fetchSections"].includes(method)) {
              for (const key in _data) {
                const answerSheet = await this.answerSheetService.findOne(
                  user.id,
                  "id",
                  _data[key].id
                );
                if ((await answerSheet.exam).showScore) continue;

                // methods: findOne, fetchOwn
                if (method === "findOne" || method === "fetchOwn") {
                  delete _data[key].aiScore;
                  delete _data[key].revisedScore;

                  for (const key2 in _data[key]["__sectionToAnswerSheets__"]) {
                    delete _data[key]["__sectionToAnswerSheets__"][key2]
                      .aiScore;
                    delete _data[key]["__sectionToAnswerSheets__"][key2]
                      .revisedScore;
                  }
                }

                // methods: fetchSections
                if (method === "fetchSections") {
                  if (!_data[key]["__exam__"].showScore) {
                    delete _data[key].aiScore;
                    delete _data[key].revisedScore;
                  }
                }
              }
            }

            return _data;
          }

          // endpoint: /api/v1/section-to-answer-sheet/findOne
          // previous interceptors: ExpirationFlagInterceptor
          if (
            controller === "section-to-answer-sheet" &&
            method === "findOne"
          ) {
            const _data = await data;
            const sas = await this.sectionToAnswerSheetService.findOne(
              user.id,
              "id",
              _data.id
            );
            const section = await sas.section;
            const exam = await section.exam;
            if (!exam.showScore) {
              delete _data.aiScore;
              delete _data.revisedScore;

              if (_data["__answerSheet__"]) {
                delete _data["__answerSheet__"].aiScore;
                delete _data["__answerSheet__"].revisedScore;
              }

              if (_data["__answers__"])
                for (const key in _data["__answers__"]) {
                  delete _data["__answers__"][key].aiScore;
                  delete _data["__answers__"][key].revisedScore;
                  delete _data["__answers__"][key].aiFeedback;
                  delete _data["__answers__"][key].revisedFeedback;
                }
            }

            return _data;
          }

          // endpoint: /api/v1/answer/findOne
          // previous interceptors: none
          if (controller === "answer" && method === "findOne") {
            const answer = await this.answerService.findOne(
              user.id,
              "id",
              data.id
            );
            const sas = await answer.sectionToAnswerSheet;
            const section = await sas.section;
            const exam = await section.exam;
            if (!exam.showScore) {
              delete data.aiScore;
              delete data.revisedScore;
              delete data.aiFeedback;
              delete data.revisedFeedback;

              if (data["__sectionToAnswerSheet__"]) {
                delete data["__sectionToAnswerSheet__"].aiScore;
                delete data["__sectionToAnswerSheet__"].revisedScore;
              }
            }
          }
        }

        // baseline for all other endpoints
        return data;
      })
    );
  }
}
