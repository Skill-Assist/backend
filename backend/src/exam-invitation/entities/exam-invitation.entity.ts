import { Exclude } from "class-transformer";
import { Column, Entity, ManyToOne } from "typeorm";

import { Exam } from "../../exam/entities/exam.entity";
import { User } from "../../user/entities/user.entity";
import { SQLBaseEntity } from "../../utils/base.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class ExamInvitation extends SQLBaseEntity {
  /** columns */
  @Column()
  email: string;

  @Column({ type: "decimal", precision: 4, scale: 1, default: 24 })
  expirationInHours: number;

  @Column({ nullable: true })
  accepted: boolean;

  @Exclude()
  @Column({ default: true })
  isActive: boolean;

  /** relations */
  @ManyToOne(() => Exam, (exam) => exam.invitations)
  exam: Promise<Exam>;

  @ManyToOne(() => User, (user) => user.invitations)
  user: Promise<User>;

  /** constructor */
  constructor(partial: Partial<ExamInvitation>) {
    super();
    Object.assign(this, partial);
  }
}
