/** nestjs */
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, UnauthorizedException } from "@nestjs/common";

/** providers */
import { ExamService } from "../exam/exam.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";
import { ExamInvitationService } from "../exam-invitation/exam-invitation.service";

/** external dependencies */
import { Repository } from "typeorm";

/** entities & dtos */
import { User } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { AddQuestionDto } from "./dto/add-question.dto";

/** utils */
import { create, findOne, update } from "../utils/typeorm.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
    private readonly queryRunner: QueryRunnerFactory,
    private readonly examService: ExamService,
    private readonly examInvitationService: ExamInvitationService
  ) {}

  /** basic CRUD methods */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // check if email already exists
    if (await this.findOne("email", createUserDto.email)) {
      throw new UnauthorizedException("Email already exists");
    }

    // create user
    const user = <User>await create(this.queryRunner, this.repository, {
      ...createUserDto,
      ownedQuestions: [],
    });

    // if user is candidate, check for pending invitations
    if (user.roles.includes("candidate")) {
      const invitations =
        await this.examInvitationService.findPendingInvitations(user.email);

      //  set relation between invitation and user
      for (const invitation of invitations) {
        await this.examInvitationService.update(invitation.id, { user });
      }
    }

    return user;
  }

  async findOne(
    key: string,
    value: unknown,
    relations?: string[]
  ): Promise<User | null> {
    return (await findOne(
      this.repository,
      "user",
      key,
      value,
      relations
    )) as User;
  }

  /** custom methods */
  async profile(id: number): Promise<User> {
    const user = <User>await this.findOne("id", id);

    let _query = this.repository.createQueryBuilder("user");

    if (user.roles.includes("candidate"))
      _query
        .leftJoinAndMapMany(
          "user.invitationsRef",
          "user.invitations",
          "invitations"
        )
        .leftJoinAndMapOne("invitations.examRef", "invitations.exam", "exam")
        .leftJoinAndMapOne("exam.createdByRef", "exam.createdBy", "createdBy")
        .leftJoinAndMapOne(
          "exam.answerSheetsRef",
          "exam.answerSheets",
          "answerSheets",
          "answerSheets.user = :id",
          { id }
        );

    if (user.roles.includes("recruiter"))
      _query.loadRelationIdAndMap("user.ownedExamsRef", "user.ownedExams");

    return <User>await _query.where("user.id = :id", { id }).getOne();
  }

  async addQuestion(id: number, payload: AddQuestionDto): Promise<void> {
    await update(
      id,
      payload as unknown as Record<string, unknown>,
      this.repository,
      "user"
    );
  }

  async acceptInvitation(invitationId: number, user: User): Promise<User> {
    // accept invitation
    const invitation = await this.examInvitationService.acceptInvitation(
      invitationId,
      user.id
    );

    // set relation between enrolled user and exam
    await this.examService.enrollUser(await invitation.exam, user);

    return <User>(
      await this.findOne("id", user.id, [
        "invitations",
        "enrolledExams",
        "answerSheets",
      ])
    );
  }

  async rejectInvitation(invitationId: number, user: User): Promise<User> {
    // reject invitation
    await this.examInvitationService.rejectInvitation(invitationId, user.id);

    return <User>(
      await this.findOne("id", user.id, [
        "invitations",
        "enrolledExams",
        "answerSheets",
      ])
    );
  }

  async updateProfile(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    await update(
      id,
      updateUserDto as unknown as Record<string, unknown>,
      this.repository,
      "user"
    );

    return <User>await this.findOne("id", id);
  }
}
