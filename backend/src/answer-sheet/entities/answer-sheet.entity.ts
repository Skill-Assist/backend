import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from "typeorm";

import { User } from "../../user/entities/user.entity";
import { Exam } from "../../exam/entities/exam.entity";
import { SQLBaseEntity } from "../../utils/base-entity.utils";
import { SectionToAnswerSheet } from "../../section-to-answer-sheet/entities/section-to-answer-sheet.entity";
import { ExamInvitation } from "../../exam-invitation/entities/exam-invitation.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class AnswerSheet extends SQLBaseEntity {
  /** columns */
  @Column({ nullable: true })
  startDate: Date;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  aiScore: number;

  @Column({ type: "decimal", precision: 5, scale: 2, nullable: true })
  revisedScore: number;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ nullable: true })
  deadline: Date;

  /** relations */
  @ManyToOne(() => User, (user) => user.answerSheets)
  user: Promise<User>;

  @ManyToOne(() => Exam, (exam) => exam.answerSheets)
  exam: Promise<Exam>;

  @OneToOne(
    () => ExamInvitation,
    (examInvitation) => examInvitation.answerSheet
  )
  @JoinColumn()
  invitation: Promise<ExamInvitation>;

  @OneToMany(
    () => SectionToAnswerSheet,
    (sectionToAnswerSheet) => sectionToAnswerSheet.answerSheet
  )
  sectionToAnswerSheets: Promise<SectionToAnswerSheet[]>;

  /** constructor */
  constructor(partial: Partial<AnswerSheet>) {
    super();
    Object.assign(this, partial);
  }
}
