import { Column, Entity, ManyToOne, OneToMany } from "typeorm";

import { SQLBaseEntity } from "../../utils/base.entity";
import { Answer } from "../../answer/entities/answer.entity";
import { Section } from "../../section/entities/section.entity";
import { AnswerSheet } from "../../answer-sheet/entities/answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class SectionToAnswerSheet extends SQLBaseEntity {
  /** columns */
  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  aiScore: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  revisedScore: number;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ nullable: true })
  deadline: Date;

  /** relations */
  @ManyToOne(() => Section)
  section: Promise<Section>;

  @ManyToOne(
    () => AnswerSheet,
    (answerSheet) => answerSheet.sectionToAnswerSheets
  )
  answerSheet: Promise<AnswerSheet>;

  @OneToMany(() => Answer, (answer) => answer.sectionToAnswerSheet)
  answers: Promise<Answer[]>;

  /** constructor */
  constructor(partial: Partial<SectionToAnswerSheet>) {
    super();
    Object.assign(this, partial);
  }
}
