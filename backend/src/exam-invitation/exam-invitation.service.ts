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
import { QueryRunnerService } from "../query-runner/query-runner.service";

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
  private userService: UserService;
  private examService: ExamService;

  constructor(
    @InjectRepository(ExamInvitation)
    private readonly examInvitationRepository: Repository<ExamInvitation>,
    private readonly moduleRef: ModuleRef,
    private readonly queryRunner: QueryRunnerService
  ) {}

  /** basic CRUD methods */
  async create(
    userId: number,
    createExamInvitationDto: CreateExamInvitationDto,
    exam: Exam,
    invitee?: User
  ): Promise<ExamInvitation> {
    // check if invitee is candidate
    if (invitee && !invitee.roles.includes("candidate"))
      throw new UnauthorizedException("Invitee is not a candidate.");

    // check if email is already invited
    const existingInvitations = await this.findAll(
      "email",
      createExamInvitationDto.email
    );
    if (existingInvitations.length) {
      for (const invitation of existingInvitations) {
        if ((await invitation.exam).id === exam.id)
          throw new UnauthorizedException(
            `User ${createExamInvitationDto.email} has already been invited to this exam.`
          );
      }
    }

    // check if user owns exam
    if ((await exam.createdBy).id !== userId)
      throw new UnauthorizedException(
        "You are not authorized to invite candidates to this exam."
      );

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

    // set relation between invitation and invitee entity, if provided
    if (invitee)
      await update(
        invitation.id,
        { user: invitee },
        this.examInvitationRepository,
        "examInvitation"
      );

    // return updated invitation
    return <ExamInvitation>await this.findOne(userId, "id", invitation.id);
  }

  async findAll(
    key?: string,
    value?: unknown,
    relations?: string[]
  ): Promise<ExamInvitation[]> {
    if (key && !value) throw new UnauthorizedException("Value not provided.");

    return (await findAll(
      this.examInvitationRepository,
      "examInvitation",
      key,
      value,
      relations
    )) as ExamInvitation[];
  }

  async findOne(
    userId: number,
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<ExamInvitation> {
    // get userService from moduleRef
    this.userService =
      this.userService ??
      this.moduleRef.get(UserService, {
        strict: false,
      });

    const invitation = (await findOne(
      this.examInvitationRepository,
      "examInvitation",
      key,
      value
    )) as ExamInvitation;

    // check if invitation exists
    if (!invitation) throw new NotFoundException("Invitation not found.");

    // check if user owns invitation/exam or user email is invitee email
    const user = await this.userService.findOne("id", userId);
    const exam = await invitation.exam;
    if (
      (await exam.createdBy).id !== userId &&
      user!.email !== invitation.email
    )
      throw new UnauthorizedException(
        "You are not authorized to update this invitation."
      );

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
    userId: number,
    invitationId: number,
    payload: Record<string, unknown>
  ): Promise<void> {
    // check if invitation exists, and if user owns invitation/exam
    //  or user email is invitee email
    await this.findOne(userId, "id", invitationId);

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
    const invitation = await this.findOne(userId, "id", invitationId);

    // check if user is invitee of invitation
    if ((await invitation.user).id !== userId)
      throw new UnauthorizedException(
        "You are not authorized to accept this invitation."
      );

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
    return <ExamInvitation>await this.findOne(userId, "id", invitation.id);
  }

  async rejectInvitation(
    invitationId: number,
    userId: number
  ): Promise<ExamInvitation> {
    // check if invitation exists
    const invitation = await this.findOne(userId, "id", invitationId);

    // check if user is invitee of invitation
    if ((await invitation.user).id !== userId)
      throw new UnauthorizedException(
        "You are not authorized to reject this invitation."
      );

    // check if invitation is not expired
    const expiresAt =
      invitation.createdAt.getTime() +
      invitation.expirationInHours * 60 * 60 * 1000;

    if (expiresAt < Date.now())
      throw new UnauthorizedException("Exam invitation has expired.");

    // change invitation status to rejected
    await update(
      invitation.id,
      { accepted: false },
      this.examInvitationRepository,
      "examInvitation"
    );

    // return updated invitation
    return <ExamInvitation>await this.findOne(userId, "id", invitation.id);
  }

  async resendInvitation(
    invitationId: number,
    userId: number
  ): Promise<ExamInvitation[]> {
    // check if invitation exists
    const invitation = await this.findOne(userId, "id", invitationId);
    if (!invitation)
      throw new UnauthorizedException("Exam invitation does not exist.");

    // check if user owns invitation
    const exam = await invitation.exam;
    if ((await exam.createdBy).id !== userId)
      throw new UnauthorizedException(
        "You are not authorized to resend this invitation."
      );

    // check if invitation is expired
    const expiresAt =
      invitation.createdAt.getTime() +
      invitation.expirationInHours * 60 * 60 * 1000;

    if (expiresAt > Date.now() && invitation.accepted !== false)
      throw new UnauthorizedException("Exam invitation is not expired.");

    // check if invitation status is accepted
    if (invitation.accepted)
      throw new UnauthorizedException(
        "Exam invitation has already been accepted."
      );

    // change invitation createdAt to current time and accept status to null
    await update(
      invitation.id,
      { createdAt: new Date(), accepted: null },
      this.examInvitationRepository,
      "examInvitation"
    );

    // return updated invitation
    return <ExamInvitation[]>await this.findAll("id", invitation.id);
  }

  async findPendingInvitations(userEmail: string): Promise<ExamInvitation[]> {
    return (await this.examInvitationRepository
      .createQueryBuilder("examInvitation")
      .where(
        "examInvitation.accepted = :accepted OR examInvitation.accepted IS NULL",
        { accepted: false }
      )
      .andWhere("examInvitation.email = :userEmail", { userEmail })
      .getMany()) as ExamInvitation[];
  }

  async fetchOwnInvitations(userId: number): Promise<ExamInvitation[]> {
    // get userService from moduleRef
    this.userService =
      this.userService ??
      this.moduleRef.get(UserService, {
        strict: false,
      });

    // get examService from moduleRef
    this.examService =
      this.examService ??
      this.moduleRef.get(ExamService, {
        strict: false,
      });

    // get user by id
    const user = (await this.userService.findOne("id", userId)) as User;

    // get user owned invitations by email
    return await this.findAll("email", user.email);
  }
}
