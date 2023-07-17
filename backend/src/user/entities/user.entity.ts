import {
  Index,
  Column,
  Entity,
  OneToMany,
  ManyToMany,
  BeforeInsert,
} from "typeorm";
import { Exclude } from "class-transformer";
import * as bcrypt from "bcrypt";

import { Exam } from "../../exam/entities/exam.entity";
import { SQLBaseEntity } from "../../utils/base.entity";
import { AnswerSheet } from "../../answer-sheet/entities/answer-sheet.entity";
import { ExamInvitation } from "../../exam-invitation/entities/exam-invitation.entity";
import { UnauthorizedException } from "@nestjs/common";
////////////////////////////////////////////////////////////////////////////////

export enum UserRole {
  CANDIDATE = "candidate",
  RECRUITER = "recruiter",
  ADMIN = "admin",
}

@Entity()
export class User extends SQLBaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  nickname: string;

  @Column()
  @Index({ unique: true })
  email: string;

  @Exclude()
  @Column()
  password: string;

  @Exclude()
  @Column()
  passwordConfirm: string;

  @Column({ nullable: true })
  mobilePhone: string;

  @Column({ nullable: true })
  nationalId: string;

  @Column({ default: "#000000" })
  color: string;

  @Column({ default: "https://i.imgur.com/6VBx3io.png" })
  logo: string;

  @Column({ type: "simple-array" })
  roles: string[];

  @Column({ type: "simple-array" })
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

  /** hooks */
  @BeforeInsert()
  async insertionHook() {
    this.nickname = this.name.split(" ")[0];

    await passwordMatch.call(this);
  }

  /** constructor */
  constructor(partial: Partial<User>) {
    super();
    Object.assign(this, partial);
  }
}

/** helper authentication methods */
export async function passwordMatch(this: Partial<User>) {
  if (this.password !== this.passwordConfirm) {
    throw new UnauthorizedException(
      "Password and password confirmation must match"
    );
  }

  this.password = await encryptPassword(this.password!);
  this.passwordConfirm = "";

  return this;
}

export async function encryptPassword(password: string): Promise<string> {
  const saltOrRounds = 10;
  const salt = await bcrypt.genSalt();
  console.log("salt: ", salt);
  return await bcrypt.hash(password, saltOrRounds);
}

export async function decryptPassword(
  payload: string,
  password: string
): Promise<boolean> {
  return await bcrypt.compare(payload, password);
}
