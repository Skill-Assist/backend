import { Exclude, Transform } from "class-transformer";
import { Index, Column, Entity, OneToMany, ManyToMany } from "typeorm";

import { Exam } from "../../exam/entities/exam.entity";
import { SQLBaseEntity } from "../../utils/base.entity";
import { AnswerSheet } from "../../answer-sheet/entities/answer-sheet.entity";
import { ExamInvitation } from "../../exam-invitation/entities/exam-invitation.entity";
////////////////////////////////////////////////////////////////////////////////

export enum UserRole {
  CANDIDATE = "candidate",
  RECRUITER = "recruiter",
  ADMIN = "admin",
}

@Entity()
export class User extends SQLBaseEntity {
  @Transform(({ value }) => value.split(" ")[0], { toPlainOnly: true })
  @Column()
  name: string;

  @Column()
  @Index({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Column({ type: "simple-array" })
  roles: string[];

  @Column({ type: "simple-array", nullable: true })
  ownedQuestions: string[];

  @Exclude()
  @Column({ default: true })
  isActive: boolean;

  /** relations */
  @OneToMany(() => Exam, (exam) => exam.createdBy)
  ownedExams: Promise<Exam[]>;

  @OneToMany(() => ExamInvitation, (examInvitation) => examInvitation.user)
  invitations: Promise<ExamInvitation[]>;

  @ManyToMany(() => Exam, (exam) => exam.enrolledUsers)
  enrolledExams: Promise<Exam[]>;

  @OneToMany(() => AnswerSheet, (answerSheet) => answerSheet.user)
  answerSheets: Promise<AnswerSheet[]>;

  /** constructor */
  constructor(partial: Partial<User>) {
    super();
    Object.assign(this, partial);
  }
}
