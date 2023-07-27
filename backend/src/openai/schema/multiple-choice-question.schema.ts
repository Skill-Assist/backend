export interface MultipleChoiceQuestionSchema {
  type: "multipleChoice";
  statement: string; // enunciado da questão (pergunta)
  options: {
    // alternativas da questão (respostas)
    a: string; // alternativa a
    b: string; // alternativa b
    c?: string; // alternativa c (opcional)
    d?: string; // alternativa d (opcional)
    e?: string; // alternativa e (opcional)
  };
  gradingRubric: { answer: { option: string } }; // resposta correta da questão (alternativa)
}
