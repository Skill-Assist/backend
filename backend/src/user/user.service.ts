/** nestjs */
import {
  Injectable,
  NotImplementedException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";

/** providers */
import { AwsService } from "../aws/aws.service";
import { ExamService } from "../exam/exam.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";
import { AnswerSheetService } from "../answer-sheet/answer-sheet.service";
import { ExamInvitationService } from "../exam-invitation/exam-invitation.service";

/** external dependencies */
import * as path from "path";
import { promises as fs } from "fs";
import { Repository } from "typeorm";

/** entities */
import { User } from "./entities/user.entity";

/** dtos */
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { AddQuestionDto } from "./dto/add-question.dto";

/** utils */
import { _create, _findOne, _update } from "../utils/typeorm.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
    private readonly awsService: AwsService,
    private readonly examService: ExamService,
    private readonly configService: ConfigService,
    private readonly queryRunner: QueryRunnerService,
    private readonly answerSheetService: AnswerSheetService,
    private readonly examInvitationService: ExamInvitationService
  ) {}

  /** basic CRUD methods */
  async create(createUserDto: CreateUserDto): Promise<User> {
    // check if email already exists
    if (await this.findOne("email", createUserDto.email)) {
      throw new UnauthorizedException("Email already exists");
    }

    // check if multiple roles are provided
    if (createUserDto.roles.length > 1)
      throw new NotImplementedException(
        "Multiple roles are not implemented yet"
      );

    // create user
    const user = <User>await _create(this.queryRunner, this.repository, {
      ...createUserDto,
      ownedQuestions: [],
    });

    // if user is candidate, check for pending invitations
    if (user.roles.includes("candidate")) {
      const invitations = await this.examInvitationService.findPending(
        user.email
      );

      //  set relation between invitation and user
      for (const invitation of invitations) {
        await this.examInvitationService.update(user.id, invitation.id, {
          user,
        });
      }
    }

    return user;
  }

  async findOne(
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<User | null> {
    return (await _findOne(
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

  async updateProfile(
    id: number,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File
  ): Promise<User> {
    // check if user is trying to update password
    if (updateUserDto.password || updateUserDto.passwordConfirm)
      throw new NotImplementedException(
        "Password update is not implemented yet"
      );

    // check if user is trying to update email
    if (updateUserDto.email)
      throw new NotImplementedException("Email update is not implemented yet");

    // check if user is trying to update roles
    if (updateUserDto.roles)
      throw new NotImplementedException("Roles update is not implemented yet");

    // upload file to s3 bucket
    if (file) {
      const format = file.mimetype.split("/")[1];
      const nodeEnv = this.configService.get<string>("NODE_ENV");

      if (nodeEnv === "dev") {
        const filePath = path.join(__dirname, `../../logo/${id}.${format}`);
        await fs.appendFile(filePath, file.buffer);

        updateUserDto.logo = `https://wallpapers.com/images/featured-full/cool-profile-picture-87h46gcobjl5e4xu.jpg`;
      } else if (nodeEnv === "prod") {
        const bucket = this.configService.get<string>("AWS_S3_BUCKET_NAME");
        const s3Key = `logo/${id}.${format}`;

        await this.awsService.uploadFileToS3(s3Key, file);

        updateUserDto.logo = `https://${bucket}.s3.sa-east-1.amazonaws.com/logo/${id}.${format}`;
      }
    }

    // update user
    await _update(
      id,
      updateUserDto as unknown as Record<string, unknown>,
      this.repository,
      "user"
    );

    return <User>await this.findOne("id", id);
  }

  async addQuestion(id: number, payload: AddQuestionDto): Promise<void> {
    await _update(
      id,
      payload as unknown as Record<string, unknown>,
      this.repository,
      "user"
    );
  }

  async acceptInvitation(invitationId: number, user: User): Promise<User> {
    // accept invitation
    const invitation = await this.examInvitationService.accept(
      invitationId,
      user.id
    );

    // set relation between enrolled user and exam
    const exam = await invitation.exam;
    await this.examService.enrollUser(await invitation.exam, user);

    // create empty answer sheet for user
    await this.answerSheetService.create(user, exam.id, invitationId);

    return <User>await this.profile(user.id);
  }

  async rejectInvitation(invitationId: number, user: User): Promise<User> {
    await this.examInvitationService.reject(invitationId, user.id);
    return <User>await this.profile(user.id);
  }
}
