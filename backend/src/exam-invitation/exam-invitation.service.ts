/** nestjs */
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, UnauthorizedException } from "@nestjs/common";

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
    // check if user is candidate
    if (user && !user.roles.includes("candidate"))
      throw new UnauthorizedException("User is not a candidate.");

    // check if email is already invited
    const existingInvitations = await this.findAll(
      "email",
      createExamInvitationDto.email
    );
    if (existingInvitations.length) {
      for (const invitation of existingInvitations) {
        if ((await invitation.exam).id === exam.id)
          throw new UnauthorizedException(
            "User has already been invited to this exam."
          );
      }
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
    relations?: string[],
    map?: boolean
  ): Promise<ExamInvitation | null> {
    return (await findOne(
      this.examInvitationRepository,
      "examInvitation",
      key,
      value,
      relations,
      map
    )) as ExamInvitation;
  }

  async update(
    invitationId: number,
    payload: Record<string, unknown>
  ): Promise<void> {
    await update(
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
    const invitation = await this.findOne("id", invitationId);
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
    return <ExamInvitation>await this.findOne("id", invitation.id);
  }

  async rejectInvitation(
    invitationId: number,
    userId: number
  ): Promise<ExamInvitation> {
    // check if invitation exists
    const invitation = await this.findOne("id", invitationId);
    if (!invitation)
      throw new UnauthorizedException("Exam invitation does not exist.");

    // check if user owns invitation
    if ((await invitation.user).id !== userId)
      throw new UnauthorizedException("User does not own invitation.");

    // change invitation status to denied
    await update(
      invitation.id,
      { accepted: false },
      this.examInvitationRepository,
      "examInvitation"
    );

    // return updated invitation
    return <ExamInvitation>await this.findOne("id", invitation.id);
  }

  async resendInvitation(
    invitationId: number,
    userId: number
  ): Promise<ExamInvitation> {
    // check if invitation exists
    const invitation = await this.findOne("id", invitationId);
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

    // change invitation createdAt to current time
    await update(
      invitation.id,
      { createdAt: new Date() },
      this.examInvitationRepository,
      "examInvitation"
    );

    // return updated invitation
    return <ExamInvitation>await this.findOne("id", invitation.id);
  }

  async findPendingInvitations(userEmail: string): Promise<ExamInvitation[]> {
    return (await this.examInvitationRepository
      .createQueryBuilder("examInvitation")
      .where("examInvitation.accepted = :accepted", { accepted: false })
      .andWhere("examInvitation.email = :email", { email: userEmail })
      .getMany()) as ExamInvitation[];
  }
}
