import { Exclude } from "class-transformer";
import { Column, Entity, ManyToOne, OneToMany } from "typeorm";

import { SQLBaseEntity } from "../../utils/base.entity";
import { Answer } from "../../answer/entities/answer.entity";
import { Section } from "../../section/entities/section.entity";
import { AnswerSheet } from "../../answer-sheet/entities/answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class SectionToAnswerSheet extends SQLBaseEntity {
  /** columns */
  @Column({ default: () => "CURRENT_TIMESTAMP" })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Exclude()
  @Column({ default: true })
  isActive: boolean;

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
