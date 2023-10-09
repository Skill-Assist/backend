import {
  Column,
  Entity,
  OneToMany,
  JoinTable,
  ManyToOne,
  ManyToMany,
} from "typeorm";

import { User } from "../../user/entities/user.entity";
import { SQLBaseEntity } from "../../utils/base-entity.utils";
import { Section } from "../../section/entities/section.entity";
import { AnswerSheet } from "../../answer-sheet/entities/answer-sheet.entity";
import { ExamInvitation } from "../../exam-invitation/entities/exam-invitation.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class Exam extends SQLBaseEntity {
  /** properties */
  @Column()
  jobTitle: string;

  @Column()
  jobLevel: string;

  @Column("longtext")
  description: string;

  @Column()
  durationInHours: number;

  @Column()
  submissionInHours: number;

  @Column()
  showScore: boolean;

  @Column()
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
