import { Exclude } from "class-transformer";
import { Column, Entity, ManyToOne, OneToMany } from "typeorm";

import { Exam } from "../../exam/entities/exam.entity";
import { SQLBaseEntity } from "../../utils/base.entity";
import { SectionToAnswerSheet } from "../../section-to-answer-sheet/entities/section-to-answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class Section extends SQLBaseEntity {
  /** columns */
  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
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
  questionId: { id: string; weight: number }[];

  @Exclude()
  @Column({ default: true })
  isActive: boolean;

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
