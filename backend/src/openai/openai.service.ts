/** nestjs */
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** external dependencies */
import {
  OpenAIApi,
  Configuration,
  ChatCompletionRequestMessage,
  CreateChatCompletionResponse,
} from "openai";
import { AxiosResponse } from "axios";

/** utils */
import {
  Criteria,
  GradingRubric,
  ChatCompletionResponse,
} from "../utils/types.utils";
////////////////////////////////////////////////////////////////////////////////

/**
 * @description OpenAiService is implemented as a helper service to enable
 * the OpenAI API to be used throughout the application.
 */
@Injectable()
export class OpenaiService {
  private _openAiApi: OpenAIApi;

  constructor(private readonly configService: ConfigService) {}

  /** create the OpenAI API instance */
  get openAiApi(): OpenAIApi {
    if (!this._openAiApi) {
      const configuration = new Configuration({
        apiKey: this.configService.get<string>("OPENAI_API_KEY"),
      });
      this._openAiApi = new OpenAIApi(configuration);
    }

    return this._openAiApi;
  }

  /** prompt engineering methods */
  async createChatCompletion(
    questionStatement: string,
    questionGradingRubric: GradingRubric,
    answerContent: string,
    model: string | undefined = "gpt-3.5-turbo"
  ): Promise<ChatCompletionResponse> {
    let finalResponse: ChatCompletionResponse = {};

    for (const [key, value] of Object.entries(questionGradingRubric)) {
      const criteria: Criteria = Object.entries(value);
      const chatHistory: ChatCompletionRequestMessage[] = this.setChatHistory(
        questionStatement,
        key,
        criteria
      ).concat({
        role: "user",
        content: answerContent,
      });

      const response = (await this.openAiApi.createChatCompletion({
        model,
        messages: chatHistory,
        temperature: 0,
        n: 1,
      })) as AxiosResponse<CreateChatCompletionResponse>;

      finalResponse[key] = response.data;
    }

    return finalResponse;
  }

  setPersona(role: string = "gerente de RH"): string {
    let institution: string;
    let user: string;

    switch (role) {
      case "professor":
        institution = "universidade de prestígio";
        user = "estudante";
        break;
      case "gerente de RH":
        institution = "companhia de grande porte";
        user = "candidato";
        break;
      default:
        institution = "universidade de prestígio";
        user = "estudante";
    }

    return `Você é um ${role} respeitado e experiente em uma ${institution} e no momento você está corrigindo a resposta de um ${user} para uma questão de teste. Você é conhecido por seu profissionalismo, atenção aos detalhes e alto padrão de qualidade de suas correções e avaliações. Você é meticuloso e atento aos detalhes, não deixando nada sem ser analisado quando se diz respeito à correção de testes. Para corrigir testes você é metódico e sistemático. Você dá valor à clareza, coerência e pensamento lógico`;
  }

  setGradingCriteria(criteria: any): string {
    let gradingCriteria: string = "";

    for (let i = 1; i < criteria.length; i++) {
      gradingCriteria += `Se a resposta possui ${
        criteria[i][0]
      }, você deveria atribuir uma nota ${
        typeof criteria[i][1] === "number"
          ? `de ${criteria[i][1]}. `
          : `com um número específico entre ${criteria[i][1].min} e ${criteria[i][1].max}. `
      }`;
    }

    gradingCriteria += `Você deve sempre considerar o nível de detalhamento da resposta e nunca deve retornar a correção sem uma nota específica, ainda que seja 0. Além disso, notas fracionadas são preferíveis, por exemplo, 8.4 é melhor do que 8.0, 7.2 é melhor do que 7.0, e assim por diante. `;

    return gradingCriteria;
  }

  setChatHistory(
    questionStatement: any,
    key: any,
    criteria: any
  ): ChatCompletionRequestMessage[] {
    return [
      {
        role: "system",
        content: `${this.setPersona()}. Essa é a questão a ser corrigida no momento: ${questionStatement}. Considerando a resposta, você irá elaborar a correção com base em sua ${key}. ${this.setGradingCriteria(
          criteria
        )}. Finalmente, você deve retornar um feedback textual explicando a nota atribuída à resposta.`,
      },
      {
        role: "user",
        content: `<<Considere que aqui foi preenchida uma resposta totalmente completa, para a qual deveria ser atribuída a maior nota possível, que é ${criteria[0][1]}>>`,
      },
      {
        role: "assistant",
        content: `Nota: ${criteria[0][1]} | Feedback: <<Aqui deve constar um feedback textual sobre a resposta>>`,
      },
      {
        role: "user",
        content: `<<Considere que aqui foi preenchida uma resposta relativamente completa , para a qual deveria ser atribuída uma nota entre ${criteria[1][1].min} e ${criteria[1][1].max}>>`,
      },
      {
        role: "assistant",
        content: `Nota: ${(
          (criteria[1][1].min + criteria[1][1].max) /
          2
        ).toFixed(
          1
        )} | Feedback: <<Aqui deve constar um feedback textual sobre a resposta>>`,
      },
      {
        role: "user",
        content: `<<Considere que aqui foi preenchida uma resposta relativamente incompleta , para a qual deveria ser atribuída uma nota entre ${criteria[2][1].min} e ${criteria[2][1].max}>>`,
      },
      {
        role: "assistant",
        content: `Nota: ${(
          (criteria[2][1].min + criteria[2][1].max) /
          2
        ).toFixed(
          1
        )} | Feedback: <<Aqui deve constar um feedback textual sobre a resposta>>`,
      },
      {
        role: "user",
        content: `<<Considere que aqui foi preenchida uma resposta totalmente incompleta, para a qual deveria ser atribuída a menor nota possível, que é 0>>`,
      },
      {
        role: "assistant",
        content: `Grade: 0 | Feedback: <<Aqui deve constar um feedback textual sobre a resposta>>`,
      },
    ];
  }
}
