/** nestjs */
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";

/** providers */
import { UserService } from "../user/user.service";
import { ExamService } from "../exam/exam.service";
import { AnswerService } from "../answer/answer.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";
import { SectionToAnswerSheetService } from "../section-to-answer-sheet/section-to-answer-sheet.service";

/** external dependencies */
import { Repository } from "typeorm";

/** entities */
import { User } from "../user/entities/user.entity";
import { AnswerSheet } from "./entities/answer-sheet.entity";
import { UpdateAnswerSheetDto } from "./dto/update-answer-sheet.dto";

/** utils */
import { create, findAll, findOne, update } from "../utils/typeorm.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class AnswerSheetService {
  private userService: UserService;
  private answerService: AnswerService;

  constructor(
    @InjectRepository(AnswerSheet)
    private readonly answerSheetRepository: Repository<AnswerSheet>,
    private readonly moduleRef: ModuleRef,
    private readonly examService: ExamService,
    private readonly queryRunner: QueryRunnerService,
    private readonly sectionToAnswerSheetService: SectionToAnswerSheetService
  ) {}

  /** basic CRUD methods */
  async create(user: User, examId: number): Promise<AnswerSheet> {
    // check if exam exists and if user is enrolled in it
    const exam = await this.examService.findOne(user.id, "id", examId);

    // check if user has already attempted the exam
    for (const answerSheet of await exam.answerSheets) {
      if ((await answerSheet.user).id === user.id) {
        throw new UnauthorizedException(
          "You have already attempted this exam. You can't attempt it again."
        );
      }
    }

    // create answer sheet
    const answerSheet = (await create(
      this.queryRunner,
      this.answerSheetRepository
    )) as AnswerSheet;

    // set relation between answer sheet and user
    await update(
      answerSheet.id,
      { user },
      this.answerSheetRepository,
      "answerSheet"
    );

    // set relation between answer sheet and exam
    await update(
      answerSheet.id,
      { exam },
      this.answerSheetRepository,
      "answerSheet"
    );

    // return updated answer sheet
    return <AnswerSheet>await this.findOne(user.id, "id", answerSheet.id);
  }

  async findAll(
    key?: string,
    value?: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<AnswerSheet[]> {
    if (key && !value) throw new NotFoundException("Value not provided");

    return (await findAll(
      this.answerSheetRepository,
      "answerSheet",
      key,
      value,
      relations,
      map
    )) as AnswerSheet[];
  }

  async findOne(
    userId: number,
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<AnswerSheet> {
    const answerSheet = (await findOne(
      this.answerSheetRepository,
      "answerSheet",
      key,
      value
    )) as AnswerSheet;

    // check if answer sheet exists
    if (!answerSheet)
      throw new NotFoundException("Answer sheet with given id not found.");

    // check if answer sheet is owned by user or user owns the exam
    const exam = await answerSheet.exam;
    if (
      (await answerSheet.user).id !== userId &&
      (await exam.createdBy).id !== userId
    )
      throw new UnauthorizedException(
        "You are not authorized to access this answer sheet."
      );

    return (await findOne(
      this.answerSheetRepository,
      "answerSheet",
      key,
      value,
      relations,
      map
    )) as AnswerSheet;
  }

  async update(
    userId: number,
    answerSheetId: number,
    updateAnswerSheetDto: UpdateAnswerSheetDto
  ): Promise<AnswerSheet> {
    // check if answer sheet exists and user allowed to update it
    await this.findOne(userId, "id", answerSheetId);

    // update answer sheet
    await update(
      answerSheetId,
      updateAnswerSheetDto as unknown as Record<string, unknown>,
      this.answerSheetRepository,
      "answerSheet"
    );
    return <AnswerSheet>await this.findOne(userId, "id", answerSheetId);
  }

  /** custom methods */
  async start(userId: number, answerSheetId: number): Promise<AnswerSheet> {
    // get userService from moduleRef
    this.userService =
      this.userService ??
      this.moduleRef.get<UserService>(UserService, {
        strict: false,
      });

    // check if answer sheet exists and user allowed to start it
    const answerSheet = await this.findOne(userId, "id", answerSheetId);

    // check if answer sheet is already started
    if (answerSheet.startDate !== null)
      throw new UnauthorizedException(
        "You have already started this answer sheet."
      );

    // check is exam status is live
    const exam = await answerSheet.exam;
    if (exam.status !== "live")
      throw new UnauthorizedException(
        "You can't start this exam because it is not live."
      );

    // start answer sheet
    const updatedAnswerSheet = await this.update(userId, answerSheetId, {
      startDate: new Date(),
    });

    // set deadline for answer sheet
    const deadlineByDuration =
      updatedAnswerSheet.startDate.getTime() +
      exam.durationInHours * 60 * 60 * 1000;

    const user = await this.userService.findOne("id", userId);
    const invitation = (await exam.invitations).find(
      (invite) => invite.email === user!.email
    );

    const deadlineBySubmission = invitation
      ? invitation.createdAt.getTime() + exam.submissionInHours * 60 * 60 * 1000
      : exam.submissionInHours * 60 * 60 * 1000;

    await this.update(userId, answerSheet.id, {
      deadline: new Date(Math.min(deadlineByDuration, deadlineBySubmission)),
    });

    // return updated answer sheet
    return await this.findOne(userId, "id", answerSheetId);
  }

  async submit(userId: number, answerSheetId: number): Promise<AnswerSheet> {
    // check if answer sheet exists and candidate allowed to submit it
    const answerSheet = await this.findOne(userId, "id", answerSheetId);

    // check if answer sheet contains sections
    if (!(await answerSheet.sectionToAnswerSheets).length)
      throw new UnauthorizedException(
        "You can't submit the answer sheet because it does not contain any attempted section."
      );

    // check if all sections are closed
    for (const section of await answerSheet.sectionToAnswerSheets) {
      if (section.endDate === null)
        throw new UnauthorizedException(
          "You can't submit the answer sheet until all sections are closed."
        );
    }

    // check if answer sheet is expired
    if (answerSheet.deadline.getTime() < new Date().getTime())
      throw new UnauthorizedException(
        "You can't submit the answer sheet because it is expired."
      );

    // check if answer sheet is already submitted
    if (answerSheet.endDate !== null)
      throw new UnauthorizedException(
        "You have already submitted this answer sheet."
      );

    await this.update(userId, answerSheetId, { endDate: new Date() });

    return await this.findOne(userId, "id", answerSheetId);
  }

  async fetchOwn(
    userId: number,
    relations?: string[],
    map?: boolean
  ): Promise<AnswerSheet[]> {
    // get answerSheets created by user
    const answerSheets = await this.findAll("user", userId, relations, map);

    // get answerSheets user owns the exam of
    const exams = await this.examService.findAll("createdBy", userId, [
      "answerSheets",
    ]);
    const answerSheetsOfOwnedExams = exams
      .map((exam) => exam.answerSheets)
      .flat() as unknown as AnswerSheet[];

    // return answerSheets created by user or user owns the exam of
    return answerSheets.concat(answerSheetsOfOwnedExams);
  }

  async fetchSections(
    userId: number,
    answerSheetId: number
  ): Promise<AnswerSheet> {
    // check if answer sheet exists and user allowed to access it
    await this.findOne(userId, "id", answerSheetId);

    return (await this.answerSheetRepository
      .createQueryBuilder("answerSheet")
      .leftJoinAndSelect("answerSheet.exam", "exam")
      .leftJoinAndSelect("exam.sections", "sections")
      .where("answerSheet.id = :answerSheetId", { answerSheetId })
      .getOne()) as AnswerSheet;
  }

  async generateEval(
    userId: number,
    answerSheetID: number
  ): Promise<AnswerSheet> {
    // get answerService from moduleRef
    this.answerService =
      this.answerService ??
      this.moduleRef.get<AnswerService>(AnswerService, {
        strict: false,
      });

    // initialize answerSheet score at 0
    let answerSheetScore: number = 0;

    // get answerSheet
    const answerSheet = await this.findOne(userId, "id", answerSheetID);

    for (const sas of await answerSheet.sectionToAnswerSheets) {
      // initialize SAS score at 0
      let sasScore: number = 0;

      // get section SAS is related to
      const section = await sas.section;

      // get sum of weights of questions in section
      const sumOfWeights = section.questions.reduce(
        (acc, curr) => acc + curr.weight,
        0
      );

      // iterate over each answer in SAS
      for (const answer of await sas.answers) {
        // generate eval for answer

        const evaluatedAnswer = await this.answerService.generateEval(
          userId,
          answer.id
        );

        // get weight of answer in section
        const weight = section.questions.find(
          (q) => q.id === answer.questionRef
        )!.weight;

        // add relative eval of answer to SAS score
        sasScore += (evaluatedAnswer.aiScore * weight) / sumOfWeights;
      }

      // update current SAS with AI score
      answerSheetScore += sasScore * section.weight;

      await this.sectionToAnswerSheetService.update(userId, sas.id, {
        aiScore: sasScore,
      });
    }

    // update answerSheet with AI score
    return await this.update(userId, answerSheet.id, {
      aiScore: answerSheetScore,
    });
  }
}
