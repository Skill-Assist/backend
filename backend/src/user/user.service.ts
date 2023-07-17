/** nestjs */
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, UnauthorizedException } from "@nestjs/common";

/** providers */
import { ExamService } from "../exam/exam.service";
import { QueryRunnerFactory } from "../utils/query-runner.factory";
import { AnswerSheetService } from "../answer-sheet/answer-sheet.service";
import { ExamInvitationService } from "../exam-invitation/exam-invitation.service";

/** external dependencies */
import { Repository } from "typeorm";

/** entities & dtos */
import { User } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { AddQuestionDto } from "./dto/add-question.dto";

/** utils */
import { create, findOne, findAll, update } from "../utils/typeorm.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
    private readonly queryRunner: QueryRunnerFactory,
    private readonly examService: ExamService,
    private readonly answerSheetService: AnswerSheetService,
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
        await this.examInvitationService.update(user.id, invitation.id, {
          user,
        });
      }
    }

    return user;
  }

  async findAll(
    key?: string,
    value?: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<User[]> {
    return (await findAll(
      this.repository,
      "section",
      key,
      value,
      relations,
      map
    )) as User[];
  }

  async findOne(
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<User | null> {
    return (await findOne(
      this.repository,
      "user",
      key,
      value,
      relations,
      map
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
      _query.leftJoinAndMapMany(
        "user.ownedExamsRef",
        "user.ownedExams",
        "exam"
      );

    return <User>await _query.where("user.id = :id", { id }).getOne();
  }

  async updateProfile(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    if (updateUserDto.password || updateUserDto.passwordConfirm)
      throw new UnauthorizedException(
        "Password update not allowed. Process aborted"
      );

    await update(
      id,
      updateUserDto as unknown as Record<string, unknown>,
      this.repository,
      "user"
    );

    return <User>await this.findOne("id", id);
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
    const invitation = await this.examInvitationService.acceptInvitation(
      invitationId,
      user.id
    );

    // set relation between enrolled user and exam
    await this.examService.enrollUser(await invitation.exam, user);

    // create empty answer sheet for user
    await this.answerSheetService.create(user, (await invitation.exam).id);

    return <User>await this.profile(user.id);
  }

  async rejectInvitation(invitationId: number, user: User): Promise<User> {
    await this.examInvitationService.rejectInvitation(invitationId, user.id);
    return <User>await this.profile(user.id);
  }
}
