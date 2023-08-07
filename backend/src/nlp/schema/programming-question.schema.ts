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
 * máximo ("max")
 * - avgValueCriteria: contém a descrição ("description") dos requisitos para atribuição
 * da pontuação média ("value") que pode variar entre o valor mínimo ("min") e o valor
 * máximo ("max")
 * - minValueCriteria: contém a descrição ("description") dos requisitos para atribuição
 * da pontuação mínima ("value") que pode variar entre o valor mínimo ("min") e o valor
 * máximo ("max")
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
