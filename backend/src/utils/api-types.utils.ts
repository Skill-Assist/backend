/** entities */
import { Exam } from "../exam/entities/exam.entity";
import { User } from "../user/entities/user.entity";
import { Answer } from "../answer/entities/answer.entity";
import { Section } from "../section/entities/section.entity";
import { Question } from "../question/schemas/question.schema";
import { AnswerSheet } from "../answer-sheet/entities/answer-sheet.entity";
import { ExamInvitation } from "../exam-invitation/entities/exam-invitation.entity";
import { SectionToAnswerSheet } from "../section-to-answer-sheet/entities/section-to-answer-sheet.entity";

/** dtos */
import { CreateExamDto } from "../exam/dto/create-exam.dto";
import { CreateUserDto } from "../user/dto/create-user.dto";
import { CreateAnswerDto } from "../answer/dto/create-answer.dto";
import { CreateSectionDto } from "../section/dto/create-section.dto";
import { CreateExamInvitationDto } from "../exam-invitation/dto/create-exam-invitation.dto";

/** external dependencies */
import { HydratedDocument } from "mongoose";
////////////////////////////////////////////////////////////////////////////////

/**
 * @description PassportJwt is used to define the shape of the data returned
 * from the passport-jwt strategy.
 */
export interface PassportJwt {
  access_token: string;
  userRole: string[];
}

/**
 * @description PassporRequest is used to define the shape of the request
 * object after the passport middleware has been applied.
 */
export interface PassportRequest extends Request {
  user?: User;
}

/**
 * @description SessionRequest is used to define the shape of the data stored
 * in the session object after the session middleware has been applied.
 */
export interface SessionRequest extends PassportRequest {
  session: {
    user: {
      [userId: number]: {
        visits: number;
      };
    };
  };
}

/**
 * @description DocumentaryContent is used to define the shape of the data returned
 * from the AWS S3 service, consisting of the unzipped file contents and metadata
 * about the file, such as the file name and file size.
 */
export type DocumentaryContent = Record<
  string,
  { type: string; size: number; content?: string }
>;

/**
 * @description Documentary is used to define the shape of the data returned
 * from the AWS S3 service, consisting of the unzipped file contents and metadata
 * about the file, such as the file name and file size.
 **/
export type Documentary = Record<string, DocumentaryContent | number>;

/**
 * @description QueryRunnerEntity defines the entities that can be passed to the
 * QueryRunnerService. The QueryRunnerService will use the type of the entity
 * to determine which repository to use to perform the database operation.
 */
export type QueryRunnerEntity =
  | User
  | Exam
  | Section
  | Question
  | Answer
  | AnswerSheet
  | SectionToAnswerSheet
  | ExamInvitation;

/**
 * @description QueryRunnerInterface defines the methods that must be implemented
 * by the QueryRunnerService. The QueryRunnerService will use the type of the
 * entity to determine which repository to use to perform the database operation.
 */
export interface QueryRunnerInterface {
  connect(): Promise<void>;
  startTransaction(): Promise<void>;
  commitTransaction(obj: QueryRunnerEntity): Promise<QueryRunnerEntity>;
  rollbackTransaction(): Promise<void>;
  release(): Promise<void>;
}

/**
 * @description HandlerEntity is used to define the entities that can
 * be passed to the TypeORM utils. The TypeORM utils will use the type of the
 * entity to determine which repository to use to perform the database operation.
 */
export type HandlerEntity =
  | User
  | Exam
  | Section
  | ExamInvitation
  | AnswerSheet
  | SectionToAnswerSheet
  | Answer;

/**
 * @description HandlerDto is used to define the dtos that can
 * be passed to the TypeORM utils. The TypeORM utils will use the type of the
 * dto to determine which repository to use to perform the database operation.
 */
export type HandlerDto =
  | CreateUserDto
  | (CreateUserDto & { ownedQuestions: [] })
  | CreateExamDto
  | (CreateSectionDto & { questionId: [] })
  | CreateExamInvitationDto
  | CreateAnswerDto;

/**
 * @description MultipleChoiceOption is used to define the shape of a given
 * option for a multiple choice question.
 */
export interface MultipleChoiceOption {
  identifier: string;
  description: string;
}

/**
 * @description MultipleChoiceGradingCriteria is used to define the shape of the
 * criteria used to grade the multiple choice question.
 */
export interface MultipleChoiceGradingCriteria {
  answer: {
    option: string;
  };
}

/**
 * @description GradingCriteria is used to define the shape of the criteria used
 * to grade the question, excluding the multiple choice question.
 **/
export interface GradingCriteria {
  criteria: {
    title: string;
    total_points: number;
    maxValueCriteria: {
      description: string;
      value: {
        min: number;
        max: number;
      };
    };
    avgValueCriteria: {
      description: string;
      value: {
        min: number;
        max: number;
      };
    };
    minValueCriteria: {
      description: string;
      value: {
        min: number;
        max: number;
      };
    };
  };
}

/**
 * @description QuestionDocument is used to define the shape of the data returned
 * from the Question Schema.
 * @see https://mongoosejs.com/docs/guide.html#options
 **/
export type QuestionDocument = HydratedDocument<Question>;
