/** entities */
import { Exam } from "../exam/entities/exam.entity";
import { User } from "../user/entities/user.entity";
import { Answer } from "../answer/entities/answer.entity";
import { Section } from "../section/entities/section.entity";
import { Question } from "../question/schemas/question.schema";
import { AnswerSheet } from "../answer-sheet/entities/answer-sheet.entity";
import { ExamInvitation } from "../exam-invitation/entities/exam-invitation.entity";
import { SectionToAnswerSheet } from "../section-to-answer-sheet/entities/section-to-answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

/** passport */
export interface PassportJwt {
  access_token: string;
}

export interface PassportRequest extends Request {
  user?: User;
}

/** session */
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
 * QueryRunnerEntity
 * @description this type defines the entities that can be passed to the
 * QueryRunnerFactory.
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
 * QueryRunnerInterface
 * @description this interface defines the methods that a query runner must implement.
 */
export interface QueryRunnerInterface {
  connect(): Promise<void>;
  startTransaction(): Promise<void>;
  commitTransaction(obj: QueryRunnerEntity): Promise<QueryRunnerEntity>;
  rollbackTransaction(): Promise<void>;
  release(): Promise<void>;
}
