import { Column, Entity, ManyToOne, OneToMany } from "typeorm";

import { Exam } from "../../exam/entities/exam.entity";
import { SQLBaseEntity } from "../../utils/base-entity.utils";
import { SectionToAnswerSheet } from "../../section-to-answer-sheet/entities/section-to-answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class Section extends SQLBaseEntity {
  /** columns */
  @Column()
  name: string;

  @Column("longtext")
  description: string;

  @Column({ type: "decimal", precision: 4, scale: 2 })
  weight: number;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  durationInHours: number;

  @Column({ default: true })
  isShuffleQuestions: boolean;

  @Column({ default: false })
  hasProctoring: boolean;

  @Column({ type: "json", nullable: true })
  questions: { id: string; weight: number }[];

  /** relations */
  @ManyToOne(() => Exam, (exam) => exam.sections)
  exam: Promise<Exam>;

  @OneToMany(
    () => SectionToAnswerSheet,
    (sectionToAnswerSheet) => sectionToAnswerSheet.section
  )
  sectionToAnswerSheets: Promise<SectionToAnswerSheet[]>;

  /** constructor */
  constructor(partial: Partial<Section>) {
    super();
    Object.assign(this, partial);
  }
}
