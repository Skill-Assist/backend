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
import { QueryRunnerFactory } from "../utils/query-runner.factory";
import { ExamInvitationService } from "../exam-invitation/exam-invitation.service";

/** external dependencies */
import { Repository } from "typeorm";

/** entities & dtos */
import { InviteDto } from "./dto/invite.dto";
import { Exam } from "./entities/exam.entity";
import { User } from "../user/entities/user.entity";
import { CreateExamDto } from "./dto/create-exam.dto";
import { UpdateExamDto } from "./dto/update-exam.dto";

/** utils */
import { create, findOne, findAll, update } from "../utils/typeorm.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class ExamService {
  private userService: UserService;
  private examInvitationService: ExamInvitationService;

  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    private readonly moduleRef: ModuleRef,
    private readonly queryRunner: QueryRunnerFactory
  ) {}

  /** basic CRUD methods */
  async create(userId: number, createExamDto: CreateExamDto): Promise<Exam> {
    // get user service from moduleRef
    this.userService =
      this.userService ?? this.moduleRef.get(UserService, { strict: false });

    // create exam
    const exam = await create(
      this.queryRunner,
      this.examRepository,
      createExamDto
    );

    // set relation between exam and user
    const user = <User>await this.userService.findOne("id", userId);
    await update(exam.id, { createdBy: user }, this.examRepository, "exam");

    // return updated exam
    return <Exam>await this.findOne(userId, "id", exam.id);
  }

  async findAll(
    key?: string,
    value?: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<Exam[]> {
    if (key && !value) throw new NotFoundException("Value not provided.");

    return (await findAll(
      this.examRepository,
      "exam",
      key,
      value,
      relations,
      map
    )) as Exam[];
  }

  async findOne(
    userId: number,
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<Exam> {
    const exam = (await findOne(
      this.examRepository,
      "exam",
      key,
      value
    )) as Exam;

    // check if exam exists
    if (!exam) throw new NotFoundException("Exam with given id not found.");

    // check if exam belongs to user or user is enrolled in exam
    if (
      userId !== (await exam.createdBy).id &&
      !(await exam.enrolledUsers).some((candidate) => candidate.id === userId)
    )
      throw new UnauthorizedException(
        "You are not authorized to access this exam."
      );

    return (await findOne(
      this.examRepository,
      "exam",
      key,
      value,
      relations,
      map
    )) as Exam;
  }

  async update(
    userId: number,
    examId: number,
    updateExamDto: UpdateExamDto
  ): Promise<Exam> {
    // check if exam exists and is owned by user
    await this.findOne(userId, "id", examId);

    // update exam
    await update(
      examId,
      updateExamDto as Record<string, unknown>,
      this.examRepository,
      "exam"
    );
    return <Exam>await this.findOne(userId, "id", examId);
  }

  /** custom methods */
  async fetchOwnedExams(
    userId: number,
    relations?: string[],
    map?: boolean
  ): Promise<Exam[]> {
    return await this.findAll("createdBy", userId, relations, map);
  }

  async switchStatus(
    userId: number,
    examId: number,
    status: string
  ): Promise<Exam> {
    // try to get exam by id
    const exam = await this.findOne(userId, "id", examId);

    // if status is published, check if exam is draft
    if (status === "published" && exam!.status !== "draft")
      throw new UnauthorizedException(
        "Exam is not in draft status. Process was aborted."
      );

    // switch status of exam
    await this.examRepository
      .createQueryBuilder()
      .update(Exam)
      .set({ status })
      .where("id = :examId", { examId })
      .execute();

    // return updated exam
    return <Exam>await this.findOne(userId, "id", examId);
  }

  async sendInvitations(
    userId: number,
    examId: number,
    inviteDto: InviteDto
  ): Promise<string> {
    // get user service and exam invitation service from moduleRef
    this.userService =
      this.userService ?? this.moduleRef.get(UserService, { strict: false });
    this.examInvitationService =
      this.examInvitationService ??
      this.moduleRef.get(ExamInvitationService, {
        strict: false,
      });

    // try to get exam by id
    const exam = await this.findOne(userId, "id", examId);

    // check if exam is published or live
    if (!["published", "live"].includes(exam!.status))
      throw new UnauthorizedException(
        "Exam is not published or live. Process was aborted."
      );

    // check if email addresses are already in exam
    for (const email of inviteDto.email) {
      if (
        await this.examRepository
          .createQueryBuilder("exam")
          .leftJoinAndSelect("exam.enrolledUsers", "enrolledUsers")
          .where("exam.id = :examId", { examId })
          .andWhere("enrolledUsers.email = :email", { email })
          .getOne()
      )
        throw new UnauthorizedException(
          "Email address is already enrolled in exam. Process was aborted."
        );
    }

    // for each email address
    for (const email of inviteDto.email) {
      // check if email address is already registered in the system (user)
      const user = <User>await this.userService.findOne("email", email);

      // create exam invitation related to exam and user, if any
      await this.examInvitationService.create(
        userId,
        {
          email,
          expirationInHours: inviteDto.expirationInHours,
        },
        exam!,
        user
      );
    }

    // return message to user with number of invitations sent
    return `Invitations sent to ${inviteDto.email.length} email addresses.`;
  }

  async enrollUser(exam: Exam, user: User): Promise<Exam> {
    // enroll user in exam
    await this.examRepository
      .createQueryBuilder()
      .relation(Exam, "enrolledUsers")
      .of(exam)
      .add(user);

    // return updated exam
    return <Exam>await this.findOne(user.id, "id", exam.id);
  }
}
