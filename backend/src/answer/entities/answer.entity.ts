import { Column, Entity, ManyToOne } from "typeorm";

import { SQLBaseEntity } from "../../utils/base.entity";
import { SectionToAnswerSheet } from "../../section-to-answer-sheet/entities/section-to-answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class Answer extends SQLBaseEntity {
  /** columns */
  @Column({ update: false })
  questionRef: string;

  @Column({ nullable: true, type: "longtext" })
  content: string;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 0 })
  aiScore: number;

  @Column({ nullable: true, type: "longtext" })
  aiFeedback: string;

  @Column({
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  revisedScore: number;

  @Column({ nullable: true, type: "longtext" })
  revisedFeedback: string;

  /** relations */
  @ManyToOne(
    () => SectionToAnswerSheet,
    (sectionToAnswerSheet) => sectionToAnswerSheet.answers
  )
  sectionToAnswerSheet: Promise<SectionToAnswerSheet>;

  /** constructor */
  constructor(partial: Partial<Answer>) {
    super();
    Object.assign(this, partial);
  }
}
