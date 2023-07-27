/**
 * @typedef {Object} TextQuestionSchema: Schema de questão do tipo "text" (texto).
 *
 * @property {string} type - tipo da questão: "text" (texto)
 * @property {string} statement - enunciado da questão (pergunta)
 * @property {Object} gradingRubric - A propriedade GradingRubric é definida como
 * um objeto aninhado. O nível exterior contém as definições dos critérios de correção
 * das respostas, tais como acurácia, explicação, completude, argumentos de suporte,
 * dentre outros que façam sentido para a questão sendo elaborada. As chaves do nível
 * interior contém a descrição detalhada dos critérios para correção das respostas e
 * devem seguir o padrão de nomenclatura: "total_points", maxValueCriteria",
 * "averageValueCriteria" e "minValueCriteria". A propriedade "total_points" deve
 * conter o valor total de pontos que a questão vale. As propriedades "maxValueCriteria",
 * "averageValueCriteria" e "minValueCriteria" devem conter a descrição ("description")
 * e o valor ("value") de cada critério, por exemplo, para uma questão que vale 100,
 * o maxValueCriteria seria 100, o averageValueCriteria poderia ter um mínimo de 50
 * e um máximo de 99 e o minValueCriteria poderia ter um mínimo de 0 e um máximo de 49.
 */
export interface TextQuestionSchema {
  type: "text";
  statement: string;
  gradingRubric: {
    criteria: {
      title: string;
      total_points: number;
      maxValueCriteria: {
        description: string;
        value: number;
      };
      averageValueCriteria: {
        description: string;
        value: { min: number; max: number };
      };
      minValueCriteria: {
        description: string;
        value: { min: number; max: number };
      };
    };
  }[];
}
