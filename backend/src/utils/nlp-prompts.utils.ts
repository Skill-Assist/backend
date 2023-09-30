export type TCreateQuestion = {
  hiddenPrompt: string;
  hiddenRequest: string;
  hiddenResponse: string;
};

export function systemSetup(schema: string): TCreateQuestion {
  const hiddenPrompt: string = `Você é um serviço que elabora questões para testes de recrutamento e seleção. Ao elaborar um nova questão, você deve retornar um objeto JSON de acordo com a seguinte definição em Typescript:\n\`\`\`\n${schema}\n\`\`\`\n`;

  const hiddenRequest: string = `A seguir está o pedido fornecido pelo usuário para a criação de uma nova questão:\nCrie uma questão do tipo programação cujo enunciado solicite ao candidato a elaboração de uma função em C++ que realize o cálculo da hipotenusa dados os dois catetos. O enunciado da questão deve contextualizar a importância do candidado ter habilidade com programação e matemática, bem como a origem da trigonometria. Os critérios de correção desejados são: clean code, funcionalidade e sintaxe. Também quero que sejam geradas tags apropriadas para a questão, considerando o tema envolvido.\nA partir desse pedido, elabore a questão e retorne no formato JSON conforme a definição em TypeScript fornecida.\n`;

  const hiddenResponse: string = `{
    "type": "programming",
    "statement": "Elabore uma função em C++ que calcule a hipotenusa de um triângulo retângulo dados os dois catetos. A hipotenusa é o lado oposto ao ângulo reto e pode ser calculada utilizando o teorema de Pitágoras. A trigonometria é um ramo da matemática que estuda as relações entre os ângulos e os lados dos triângulos. Ter habilidade com programação e matemática é fundamental para resolver problemas como este. Escreva a função 'calcularHipotenusa' que receba os valores dos catetos como parâmetros e retorne o valor da hipotenusa.",
    "gradingRubric": [
        {
            "criteria": {
                "title": "Clean Code",
                "total_points": 30,
                "maxValueCriteria": {
                    "description": "O código está bem organizado, legível e segue as boas práticas de programação.",
                    "value": {
                        "min": 21,
                        "max": 30
                    }
                },
                "avgValueCriteria": {
                    "description": "O código possui uma organização razoável, mas pode ser melhorado em termos de legibilidade e boas práticas de programação.",
                    "value": {
                        "min": 11,
                        "max": 20
                    }
                },
                "minValueCriteria": {
                    "description": "O código está confuso, difícil de entender e não segue as boas práticas de programação.",
                    "value": {
                        "min": 0,
                        "max": 10
                    }
                }
            }
        },
        {
            "criteria": {
                "title": "Funcionalidade",
                "total_points": 40,
                "maxValueCriteria": {
                    "description": "A função calcula corretamente a hipotenusa e retorna o valor esperado.",
                    "value": {
                        "min": 31,
                        "max": 40
                    }
                },
                "avgValueCriteria": {
                    "description": "A função calcula corretamente a hipotenusa, mas pode haver pequenos erros ou casos em que não retorna o valor esperado.",
                    "value": {
                        "min": 16,
                        "max": 30
                    }
                },
                "minValueCriteria": {
                    "description": "A função não calcula corretamente a hipotenusa ou não retorna o valor esperado.",
                    "value": {
                        "min": 0,
                        "max": 15
                    }
                }
            }
        },
        {
            "criteria": {
                "title": "Sintaxe",
                "total_points": 30,
                "maxValueCriteria": {
                    "description": "O código está livre de erros de sintaxe e segue as regras da linguagem C++.",
                    "value": {
                      "min": 21,
                      "max": 30
                  }
              },
              "avgValueCriteria": {
                  "description": "O código possui alguns erros de sintaxe, mas ainda é compreensível e segue a maioria das regras da linguagem C++.",
                  "value": {
                      "min": 11,
                      "max": 20
                  }
              },
              "minValueCriteria": {
                  "description": "O código contém vários erros de sintaxe e não segue as regras da linguagem C++.",
                  "value": {
                      "min": 0,
                      "max": 10
                  }
              }
          }
      }
  ],
  "tags": [
      "programação",
      "C++",
      "matemática",
      "trigonometria",
      "hipotenusa"
  ]
}
}`;

  return { hiddenPrompt, hiddenRequest, hiddenResponse };
}
