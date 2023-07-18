import { Column, Entity, ManyToOne, OneToMany } from "typeorm";

import { User } from "../../user/entities/user.entity";
import { Exam } from "../../exam/entities/exam.entity";
import { SQLBaseEntity } from "../../utils/base.entity";
import { SectionToAnswerSheet } from "../../section-to-answer-sheet/entities/section-to-answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class AnswerSheet extends SQLBaseEntity {
  /** columns */
  @Column({ nullable: true })
  startDate: Date;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  aiScore: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
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
