/**
 * @typedef {Object} ProgrammingQuestionSchema: Schema de questão do tipo "programming" (programação).
 *
 * @property {string} type - tipo da questão: "programming" (programação)
 * @property {string} statement - enunciado da questão (pergunta)
 * @property {Object} gradingRubric - A propriedade GradingRubric contém um array com os
 * critérios de correção das respostas. As chaves do nível interior contém as seguintes propriedades:
 * - title: título dos critérios para correção das respostas, tais como acurácia, explicação, completude,
 * argumentos de suporte, dentre outros que façam sentido para a questão sendo elaborada
 * - total_points: contem o valor total de pontos que a questão vale, por examplo, 100
 * - maxValueCriteria: contém a descrição ("description") dos requisitos para atribuição
 * da pontuação máxima ("value") que pode variar entre o valor mínimo ("min") e o valor
 * máximo ("max"). Contudo, deve-se notar que o valor mínimo ("min") do maxValueCriteria deve ser maior
 * que o valor máximo ("max") do avgValueCriteria
 * - avgValueCriteria: contém a descrição ("description") dos requisitos para atribuição
 * da pontuação média ("value") que pode variar entre o valor mínimo ("min") e o valor
 * máximo ("max"). Da mesma forma, notar que o valor mínimo ("min") do avgValueCriteria deve ser maior
 * que o valor máximo ("max") do minValueCriteria e o valor máximo ("max") do avgValueCriteria deve ser
 * menor que o valor mínimo ("min") do maxValueCriteria
 * - minValueCriteria: contém a descrição ("description") dos requisitos para atribuição
 * da pontuação mínima ("value") que pode variar entre o valor mínimo ("min") e o valor
 * máximo ("max"). Por fim, notar que o valor máximo ("max") do minValueCriteria deve ser menor
 * que o valor mínimo ("min") do avgValueCriteria
 * @property {string[]} tags - array de tags que identificam a questão
 */
export interface ProgrammingQuestionSchema {
  type: "programming";
  statement: string;
  gradingRubric: {
    criteria: {
      title: string;
      total_points: number;
      maxValueCriteria: {
        description: string;
        value: { min: number; max: number };
      };
      avgValueCriteria: {
        description: string;
        value: { min: number; max: number };
      };
      minValueCriteria: {
        description: string;
        value: { min: number; max: number };
      };
    };
  }[];
  tags: string[];
}
