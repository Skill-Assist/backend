export interface AnswerSchema {
  data: GradedAnswerSchema | UnprocessableAnswerSchema;
}

export interface GradedAnswerSchema {
  type: "graded";
  grade: number;
  feedback: string;
}

export interface UnprocessableAnswerSchema {
  type: "unprocessable";
  reason: string;
  text: string;
}
