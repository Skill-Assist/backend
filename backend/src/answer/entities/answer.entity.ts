import { Exclude } from "class-transformer";
import { Column, Entity, ManyToOne } from "typeorm";

import { SQLBaseEntity } from "../../utils/base.entity";
import { SectionToAnswerSheet } from "../../section-to-answer-sheet/entities/section-to-answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class Answer extends SQLBaseEntity {
  /** columns */
  @Column({ update: false })
  questionRef: string;

  @Column({ nullable: true })
  content: string;

  @Column({ nullable: true })
  aiScore: number;

  @Column({ nullable: true, type: "longtext" })
  aiFeedback: string;

  @Column({ nullable: true })
  revisedScore: number;

  @Column({ nullable: true })
  revisedFeedback: string;

  @Exclude()
  @Column({ default: true })
  isActive: boolean;

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
