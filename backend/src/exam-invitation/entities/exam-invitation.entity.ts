import { Column, Entity, ManyToOne, OneToOne } from "typeorm";

import { Exam } from "../../exam/entities/exam.entity";
import { User } from "../../user/entities/user.entity";
import { SQLBaseEntity } from "../../utils/base.entity";
import { AnswerSheet } from "../../answer-sheet/entities/answer-sheet.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class ExamInvitation extends SQLBaseEntity {
  /** columns */
  @Column({ default: () => "CURRENT_TIMESTAMP" })
  inviteDate: Date;

  @Column()
  email: string;

  @Column({ type: "decimal", precision: 4, scale: 1, default: 24 })
  expirationInHours: number;

  @Column({ nullable: true })
  accepted: boolean;

  /** relations */
  @ManyToOne(() => Exam, (exam) => exam.invitations)
  exam: Promise<Exam>;

  @ManyToOne(() => User, (user) => user.invitations)
  user: Promise<User>;

  @OneToOne(() => AnswerSheet, (answerSheet) => answerSheet.invitation)
  answerSheet: Promise<AnswerSheet>;

  /** constructor */
  constructor(partial: Partial<ExamInvitation>) {
    super();
    Object.assign(this, partial);
  }
}
