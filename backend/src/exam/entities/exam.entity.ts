import {
  Column,
  Entity,
  OneToMany,
  JoinTable,
  ManyToOne,
  ManyToMany,
  BeforeInsert,
  BeforeUpdate,
} from "typeorm";
import { Exclude } from "class-transformer";
import { BadRequestException } from "@nestjs/common";

import { User } from "../../user/entities/user.entity";
import { SQLBaseEntity } from "../../utils/base.entity";
import { Section } from "../../section/entities/section.entity";
import { AnswerSheet } from "../../answer-sheet/entities/answer-sheet.entity";
import { ExamInvitation } from "../../exam-invitation/entities/exam-invitation.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class Exam extends SQLBaseEntity {
  /** columns */
  @Column()
  title: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column({ nullable: true })
  level: string;

  @Column()
  durationInHours: number;

  @Column()
  submissionDeadlineInHours: number;

  @Column({ nullable: true })
  dateToArchive: Date;

  @Column({ default: true })
  showScore: boolean;

  @Column({ default: false })
  isPublic: boolean;

  @Column()
  status: string;

  @Exclude()
  @Column({ default: true })
  isActive: boolean;

  /** relations */
  @ManyToOne(() => User, (user) => user.ownedExams)
  createdBy: Promise<User>;

  @OneToMany(() => Section, (section) => section.exam)
  sections: Promise<Section[]>;

  @OneToMany(() => ExamInvitation, (examInvitation) => examInvitation.exam)
  invitations: Promise<ExamInvitation[]>;

  @ManyToMany(() => User, (user) => user.enrolledExams)
  @JoinTable()
  enrolledUsers: Promise<User[]>;

  @OneToMany(() => AnswerSheet, (answerSheet) => answerSheet.exam)
  answerSheets: Promise<AnswerSheet[]>;

  /** hooks */
  @BeforeInsert()
  @BeforeUpdate()
  validateStatus() {
    const validStatuses = ["draft", "published", "live", "archived"];

    if (!this.status) {
      this.status = "draft";
    }

    if (!validStatuses.includes(this.status)) {
      throw new BadRequestException("Invalid status value");
    }
  }

  /** constructor */
  constructor(partial: Partial<Exam>) {
    super();
    Object.assign(this, partial);
  }
}
