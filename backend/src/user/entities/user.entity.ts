import {
  Index,
  Column,
  Entity,
  OneToMany,
  ManyToMany,
  BeforeInsert,
} from "typeorm";
import * as bcrypt from "bcrypt";
import { Exclude } from "class-transformer";
import { UnauthorizedException } from "@nestjs/common";

import { Exam } from "../../exam/entities/exam.entity";
import { AnswerSheet } from "../../answer-sheet/entities/answer-sheet.entity";
import { ExamInvitation } from "../../exam-invitation/entities/exam-invitation.entity";

import { SQLBaseEntity } from "../../utils/base-entity.utils";
////////////////////////////////////////////////////////////////////////////////

export enum UserRole {
  CANDIDATE = "candidate",
  RECRUITER = "recruiter",
  ADMIN = "admin",
}

@Entity()
export class User extends SQLBaseEntity {
  /** properties */
  @Column({ nullable: true })
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
  @Column({ nullable: true })
  passwordConfirm: string;

  @Column({ nullable: true })
  mobilePhone: string;

  @Column({ nullable: true })
  nationalId: string;

  @Column({ default: "#285943" })
  color: string;

  @Column({ default: "https://i.imgur.com/6VBx3io.png" })
  logo: string;

  @Column({ type: "simple-array" })
  roles: string[];

  @Column({ type: "simple-array" })
  ownedQuestions: string[];

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
    // set nickname
    if (this.name && !this.nickname) this.nickname = this.name.split(" ")[0];

    // check password match and encrypt password
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
  if (!this.password || !this.passwordConfirm)
    throw new UnauthorizedException(
      "Password and password confirmation required"
    );

  if (this.password !== this.passwordConfirm) {
    throw new UnauthorizedException(
      "Password and password confirmation must match"
    );
  }

  this.password = await encryptPassword(this.password);
  this.passwordConfirm = undefined;

  return this;
}

export async function encryptPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function decryptPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}
