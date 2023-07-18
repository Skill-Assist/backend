import { GradingRubric } from "../../utils/types.utils";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
////////////////////////////////////////////////////////////////////////////////

@Schema({ timestamps: true })
export class Question {
  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  statement: string;

  @Prop({ type: Object, nullable: true })
  options: Record<string, string>;

  @Prop({ type: Object, required: true })
  gradingRubric: GradingRubric;

  @Prop({ default: 2.5 })
  difficulty: number;

  @Prop({ type: [String], nullable: true, default: [] })
  tags: string[];

  @Prop({ default: true })
  isShareable: boolean;

  @Prop({ required: true })
  createdBy: number;

  @Prop({ type: [Number], nullable: true, default: [] })
  sections: number[];

  @Prop({ default: true })
  isActive: boolean;
}

export const QuestionSchema = SchemaFactory.createForClass(Question);
