export interface MultipleChoiceQuestionSchema {
  type: "multipleChoice";
  statement: string; // enunciado da questão
  options: {
    identifier: string; // identificador da alternativa, exemplo: a, b, c, d, e
    description: string; // descrição da alternativa
  }[];
  gradingRubric: { answer: { option: string } }; // alternativa correta
  tags: string[]; // tags da questão
}
