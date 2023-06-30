import { Exclude } from "class-transformer";
import { Column, Entity, ManyToOne, OneToMany } from "typeorm";

import { User } from "../../user/entities/user.entity";
import { Exam } from "../../exam/entities/exam.entity";
import { SQLBaseEntity } from "../../utils/base.entity";
import { SectionToAnswerSheet } from "../../section-to-answer-sheet/entities/section-to-answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class AnswerSheet extends SQLBaseEntity {
  /** columns */
  @Column({ default: () => "CURRENT_TIMESTAMP" })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ nullable: true })
  deadline: Date;

  @Exclude()
  @Column({ default: true })
  isActive: boolean;

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
