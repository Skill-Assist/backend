/** nestjs */
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

/** providers */
import { QueryRunnerFactory } from "../utils/query-runner.factory";

/** external dependencies */
import { Repository } from "typeorm";

/** entities & dtos */
import { User } from "../user/entities/user.entity";
import { Exam } from "../exam/entities/exam.entity";
import { ExamInvitation } from "./entities/exam-invitation.entity";
import { CreateExamInvitationDto } from "./dto/create-exam-invitation.dto";

/** utils */
import { create, findOne, findAll, update } from "../utils/typeorm.utils";
//////////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class ExamInvitationService {
  constructor(
    @InjectRepository(ExamInvitation)
    private readonly examInvitationRepository: Repository<ExamInvitation>,
    private readonly queryRunner: QueryRunnerFactory
  ) {}

  /** basic CRUD methods */
  async create(
    createExamInvitationDto: CreateExamInvitationDto,
    exam: Exam,
    user?: User
  ): Promise<ExamInvitation> {
    // check if user is a candidate and if already invited to exam
    if (user) {
      if (!user.roles.includes("candidate"))
        throw new UnauthorizedException("User is not a candidate.");

      if (
        await this.examInvitationRepository
          .createQueryBuilder("examInvitation")
          .leftJoinAndSelect("examInvitation.user", "user")
          .where("user.id = :userId", { userId: user.id })
          .getOne()
      )
        throw new UnauthorizedException("User is already invited.");
    }

    // create exam invitation
    const invitation = await create(
      this.queryRunner,
      this.examInvitationRepository,
      createExamInvitationDto
    );

    // set relation between invitation and exam
    await update(
      invitation.id,
      { exam },
      this.examInvitationRepository,
      "examInvitation"
    );

    // set relation between invitation and user
    if (user)
      await update(
        invitation.id,
        { user },
        this.examInvitationRepository,
        "examInvitation"
      );

    // return updated invitation
    return <ExamInvitation>await this.findOne("id", invitation.id);
  }

  async findAll(
    key?: string,
    value?: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<ExamInvitation[]> {
    if (key && !value) throw new UnauthorizedException("Value not provided.");

    return (await findAll(
      this.examInvitationRepository,
      "examInvitation",
      key,
      value,
      relations,
      map
    )) as ExamInvitation[];
  }

  async findOne(
    key: string,
    value: unknown,
    relations?: string[]
  ): Promise<ExamInvitation | null> {
    return (await findOne(
      this.examInvitationRepository,
      "examInvitation",
      key,
      value,
      relations
    )) as ExamInvitation;
  }

  async update(invitationId: number, payload: Record<string, unknown>) {
    return await update(
      invitationId,
      payload,
      this.examInvitationRepository,
      "examInvitation"
    );
  }

  /** custom methods */
  async acceptInvitation(
    invitationId: number,
    userId: number
  ): Promise<ExamInvitation> {
    // check if invitation exists
    const invitation = await this.findOne("id", invitationId, ["exam", "user"]);
    if (!invitation)
      throw new UnauthorizedException("Exam invitation does not exist.");

    // check if user owns invitation
    if ((await invitation.user).id !== userId)
      throw new UnauthorizedException("User does not own invitation.");

    // check if invitation is not expired
    const expiresAt =
      invitation.createdAt.getTime() +
      invitation.expirationInHours * 60 * 60 * 1000;

    if (expiresAt < Date.now())
      throw new UnauthorizedException("Exam invitation has expired.");

    // change invitation status to accepted
    await update(
      invitation.id,
      { accepted: true },
      this.examInvitationRepository,
      "examInvitation"
    );

    // return updated invitation
    return <ExamInvitation>await this.findOne("id", invitation.id, ["exam"]);
  }

  async findPendingInvitations(userEmail: string): Promise<ExamInvitation[]> {
    return (await this.examInvitationRepository
      .createQueryBuilder("examInvitation")
      .where("examInvitation.accepted = :accepted", { accepted: false })
      .andWhere("examInvitation.email = :email", { email: userEmail })
      .getMany()) as ExamInvitation[];
  }
}
