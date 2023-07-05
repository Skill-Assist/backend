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
import * as AWS from "aws-sdk";
import { AxiosResponse } from "axios";

/** utils */
import { fetchUnzippedDocumentaryFromS3 } from "../utils/aws.utils";
////////////////////////////////////////////////////////////////////////////////

/** types */
type Criteria = [string, number | { min: number; max: number }][];

type GradingRubric = {
  [category: string]: {
    total_points: number;
    [criterion: string]: number | { min: number; max: number };
  };
};

export type ChatCompletionResponse = {
  [key: string]: CreateChatCompletionResponse;
};
////////////////////////////////////////////////////////////////////////////////

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

  /** content manipulation methods */
  async fetchUnzippedDocumentary(pathToZip: string): Promise<any> {
    const credentials = new AWS.Credentials({
      accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID")!,
      secretAccessKey: this.configService.get<string>("AWS_SECRET_ACCESS_KEY")!,
    });

    const s3 = new AWS.S3({
      credentials: credentials,
      region: "sa-east-1",
    });

    const getObjectParams = {
      Bucket: this.configService.get<string>("AWS_S3_BUCKET_NAME")!,
      Key: pathToZip,
    };

    return await fetchUnzippedDocumentaryFromS3(s3, getObjectParams);
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

      const response: AxiosResponse<CreateChatCompletionResponse> =
        await this.openAiApi.createChatCompletion({
          model,
          messages: chatHistory,
          temperature: 0,
          n: 1,
        });

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
