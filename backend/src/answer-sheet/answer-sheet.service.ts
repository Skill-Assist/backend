/** nestjs */
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

/** providers */
import { ExamService } from "../exam/exam.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";

/** external dependencies */
import { Repository } from "typeorm";

/** entities */
import { User } from "../user/entities/user.entity";
import { AnswerSheet } from "./entities/answer-sheet.entity";

/** utils */
import { create, findAll, findOne, update } from "../utils/typeorm.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class AnswerSheetService {
  constructor(
    @InjectRepository(AnswerSheet)
    private readonly answerSheetRepository: Repository<AnswerSheet>,
    private readonly examService: ExamService,
    private readonly queryRunner: QueryRunnerFactory
  ) {}

  /** basic CRUD methods */
  async create(user: User, examId: number): Promise<AnswerSheet> {
    // check if exam exists and is active
    const exam = await this.examService.findOne("id", examId);
    if (!exam || !exam.isActive)
      throw new UnauthorizedException("Exam not found or not active");

    // check if exam is live
    if (exam.status !== "live")
      throw new UnauthorizedException(
        "You can only start an exam if it is live."
      );

    // check if user is enrolled in exam
    if (!(await exam.enrolledUsers).some((u) => u.id === user.id))
      throw new UnauthorizedException("You are not enrolled in this exam");

    // check if user has already started the exam
    for (const answerSheet of await exam.answerSheets) {
      if ((await answerSheet.user).id === user.id) {
        throw new UnauthorizedException(
          "You have already started this exam. You can't start it again."
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

    // set deadline for answer sheet
    const deadlineByDuration =
      answerSheet.startDate.getTime() + exam.durationInHours * 60 * 60 * 1000;

    const invitation = (await exam.invitations).find(
      (invite) => invite.email === user.email
    );

    const deadlineBySubmission = invitation
      ? invitation.createdAt.getTime() + exam.submissionInHours * 60 * 60 * 1000
      : exam.submissionInHours * 60 * 60 * 1000;

    await update(
      answerSheet.id,
      {
        deadline: new Date(Math.min(deadlineByDuration, deadlineBySubmission)),
      },
      this.answerSheetRepository,
      "answerSheet"
    );

    // return updated answer sheet
    return <AnswerSheet>await this.findOne("id", answerSheet.id);
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
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<AnswerSheet | null> {
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
    id: number,
    updateAnswerSheetDto: Record<string, unknown>
  ): Promise<AnswerSheet> {
    await update(
      id,
      updateAnswerSheetDto,
      this.answerSheetRepository,
      "answerSheet"
    );

    return <AnswerSheet>await this.findOne("id", id);
  }

  /** custom methods */
  async submit(id: number): Promise<string> {
    await this.update(id, { endDate: new Date() });

    return `Answer sheet with id ${id} submitted successfully.`;
  }

  async getAnswerSheetWithSections(id: number): Promise<AnswerSheet | null> {
    return await this.answerSheetRepository
      .createQueryBuilder("answerSheet")
      .leftJoinAndSelect("answerSheet.exam", "exam")
      .leftJoinAndSelect("exam.sections", "sections")
      .where("answerSheet.id = :id", { id })
      .getOne();
  }
}
