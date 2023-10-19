/** nestjs */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  NotImplementedException,
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
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();

    try {
      const user = this.repository.create({
        ...createUserDto,
        ownedQuestions: [],
      });

      await this.queryRunner.commitTransaction(user);

      // if user is candidate, check for pending invitations
      if (user.roles.includes("candidate")) {
        const invitations = await this.examInvitationService.findPending(
          "email",
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
    } catch (err) {
      // rollback changes made in case of error
      await this.queryRunner.rollbackTransaction();
      throw new BadRequestException(err.message);
    } finally {
      // release queryRunner after transaction
      await this.queryRunner.release();
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User | null> {
    // update user
    const data = await this.repository
      .createQueryBuilder()
      .update()
      .set(updateUserDto)
      .where("id = :id", { id })
      .execute();

    // check if user was updated
    if (!data.affected) throw new NotFoundException("User not found.");

    return await this.findOne("id", id);
  }

  // internal use only
  async findOne(
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<User | null> {
    const queryBuilder = this.repository
      .createQueryBuilder("user")
      .where(`user.${key} = :${key}`, { [key]: value });

    if (relations)
      for (const relation of relations) {
        map
          ? queryBuilder.leftJoinAndSelect(`user.${relation}`, `${relation}`)
          : queryBuilder.loadRelationIdAndMap(
              `${relation}Ref`,
              `user.${relation}`
            );
      }

    return await queryBuilder.getOne();
  }

  /** custom methods */
  async profile(id: number): Promise<User> {
    const user = (await this.findOne("id", id)) as User;

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

    return (await _query.where("user.id = :id", { id }).getOne()) as User;
  }

  async updateProfile(
    id: number,
    updateUserDto?: UpdateUserDto,
    file?: Express.Multer.File
  ): Promise<User | null> {
    if (!updateUserDto && !file)
      throw new UnauthorizedException("Nothing to update");

    if (updateUserDto) {
      // check if user is trying to update password
      if (updateUserDto.password || updateUserDto.passwordConfirm)
        throw new NotImplementedException(
          "Password update is not implemented yet"
        );

      // check if user is trying to update email
      if (updateUserDto.email)
        throw new NotImplementedException(
          "Email update is not implemented yet"
        );

      // check if user is trying to update roles
      if (updateUserDto.roles)
        throw new NotImplementedException(
          "Roles update is not implemented yet"
        );
    }

    const _updateUserDto = updateUserDto || {};

    if (file) {
      const format = file.mimetype.split("/")[1];
      const nodeEnv = this.configService.get("NODE_ENV")!;

      if (nodeEnv === "test") {
        _updateUserDto.logo = `https://example.com/${id}.png`;
      }
      if (nodeEnv === "dev") {
        const filePath = path.join(__dirname, `../../logo/${id}.${format}`);
        await fs.appendFile(filePath, file.buffer);

        _updateUserDto.logo = `https://wallpapers.com/images/featured-full/cool-profile-picture-87h46gcobjl5e4xu.jpg`;
      }
      if (nodeEnv === "prod") {
        const bucket = this.configService.get("AWS_S3_BUCKET_NAME");
        const s3Key = `logo/${id}.${format}`;

        await this.awsService.uploadFileToS3(s3Key, file);

        _updateUserDto.logo = `https://${bucket}.s3.sa-east-1.amazonaws.com/logo/${id}.${format}`;
      }
    }

    // return updated user
    return this.update(id, _updateUserDto);
  }

  async addQuestion(id: number, addQuestionDto: AddQuestionDto): Promise<void> {
    const data = await this.repository
      .createQueryBuilder()
      .update()
      .set(addQuestionDto as unknown as Record<string, unknown>)
      .where("id = :id", { id })
      .execute();

    // check if update was successful
    if (!data.affected) throw new NotFoundException("Update failed.");
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
