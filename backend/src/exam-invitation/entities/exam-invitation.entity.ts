import { Column, Entity, ManyToOne } from "typeorm";
import { Exclude } from "class-transformer";

import { Exam } from "../../exam/entities/exam.entity";
import { SQLBaseEntity } from "../../utils/base.entity";
import { User } from "../../user/entities/user.entity";
////////////////////////////////////////////////////////////////////////////////

@Entity()
export class ExamInvitation extends SQLBaseEntity {
  /** columns */
  @Column()
  email: string;

  @Column({ default: 24 })
  expirationInHours: number;

  @Column({ default: false })
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
