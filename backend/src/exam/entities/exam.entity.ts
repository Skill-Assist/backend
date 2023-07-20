import {
  Column,
  Entity,
  OneToMany,
  JoinTable,
  ManyToOne,
  ManyToMany,
} from "typeorm";

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

  @Column({ type: "decimal", precision: 6, scale: 3 })
  durationInHours: number;

  @Column({ type: "decimal", precision: 6, scale: 3 })
  submissionInHours: number;

  @Column({ nullable: true })
  dateToArchive: Date;

  @Column({ default: true })
  showScore: boolean;

  @Column({ default: false })
  isPublic: boolean;

  @Column({ default: "draft" })
  status: string;

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

  /** constructor */
  constructor(partial: Partial<Exam>) {
    super();
    Object.assign(this, partial);
  }
}
