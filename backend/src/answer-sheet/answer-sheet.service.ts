/** nestjs */
import { InjectRepository } from "@nestjs/typeorm";
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

/** providers */
import { ExamService } from "../exam/exam.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";

/** external dependencies */
import { Repository } from "typeorm";

/** entities */
import { User } from "../user/entities/user.entity";
import { Exam } from "../exam/entities/exam.entity";
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
    const exam: Exam | null = await this.examService.findOne("id", examId);
    if (!exam || !exam.isActive)
      throw new UnauthorizedException("Exam not found or not active");

    // check if exam is live
    if (exam.status !== "live")
      throw new UnauthorizedException(
        "You can't start this exam. It is not published or live."
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
    const answerSheet = await create(
      this.queryRunner,
      this.answerSheetRepository
    );

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
    const invitation = (await exam.invitations).find(
      (invite) => invite.email === user.email
    );

    const deadline = new Date(
      invitation
        ? invitation.createdAt.getTime() +
          exam.submissionDeadlineInHours * 60 * 60 * 1000
        : exam.submissionDeadlineInHours * 60 * 60 * 1000
    );

    await update(
      answerSheet.id,
      { deadline },
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
}
