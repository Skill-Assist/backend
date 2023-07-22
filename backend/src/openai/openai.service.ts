/** nestjs */
import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** external dependencies */
import {
  Result,
  createJsonTranslator,
  TypeChatLanguageModel,
  TypeChatJsonTranslator,
  createOpenAILanguageModel,
} from "typechat";
import * as fs from "fs";
import * as path from "path";

/** schemas */
import { AnswerSchema } from "./schemas/answer.schema";

/** utils */
import { Criteria, GradingRubric } from "../utils/api-types.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class OpenaiService {
  private _languageModel: TypeChatLanguageModel;

  constructor(private readonly configService: ConfigService) {}

  get languageModel(): TypeChatLanguageModel {
    if (!this._languageModel) {
      this._languageModel = createOpenAILanguageModel(
        this.configService.get<string>("OPENAI_API_KEY")!,
        "gpt-3.5-turbo"
      );
    }

    return this._languageModel;
  }

  set languageModel(model: TypeChatLanguageModel) {
    this._languageModel = model;
  }

  /** prompt engineering methods */
  async gradingResponse(
    questionStatement: string,
    questionGradingRubric: GradingRubric,
    answerContent: string,
    model: string | undefined = "gpt-3.5-turbo"
  ): Promise<any> {
    this.languageModel = createOpenAILanguageModel(
      this.configService.get<string>("OPENAI_API_KEY")!,
      model
    );

    try {
      let finalResponse: any = {};

      for (const [key, value] of Object.entries(questionGradingRubric)) {
        const criteria: Criteria = Object.entries(value);
        const chatHistory: string = this.setChatHistory(
          questionStatement,
          key,
          criteria,
          answerContent
        );

        console.log(chatHistory);
        const response = await this.generateGradingResponse(chatHistory);

        finalResponse[key] = response;
      }

      return finalResponse;
    } catch (error) {
      throw new ServiceUnavailableException(
        "OpenAI API is currently unavailable. Please try again later."
      );
    }
  }

  async generateGradingResponse(
    request: string
  ): Promise<Result<AnswerSchema>> {
    const schema = fs.readFileSync(
      path.join(__dirname, "schemas", "answer.schema.d.ts"),
      "utf8"
    );

    const translator: TypeChatJsonTranslator<AnswerSchema> =
      createJsonTranslator<AnswerSchema>(
        this.languageModel,
        schema,
        "AnswerSchema"
      );

    return await translator.translate(request);
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

    return `Você é um ${role} respeitado e experiente em uma ${institution} e no momento você está corrigindo a resposta de um ${user} para uma questão aplicada no contexto de um teste de recrutamento. Você é conhecido por seu profissionalismo, atenção aos detalhes e alto padrão de qualidade de suas correções e avaliações. Você dá valor à clareza, coerência e pensamento lógico`;
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

    gradingCriteria += `Você deve sempre considerar o nível de detalhamento da resposta e nunca deve retornar a correção sem uma nota específica, ainda que seja 0. Além disso, notas fracionadas são preferíveis, por exemplo, 8.4 é melhor do que 8.0, 7.2 é melhor do que 7.0, e assim por diante`;

    return gradingCriteria;
  }

  setChatHistory(
    questionStatement: any,
    key: any,
    criteria: any,
    answerContent: any
  ): string {
    return `${this.setPersona()}. Essa é a questão a ser corrigida no momento: ${questionStatement}. Considerando a resposta, você irá elaborar a correção com base em sua ${key}. ${this.setGradingCriteria(
      criteria
    )}. Finalmente, você deve retornar um feedback textual explicando a nota atribuída à seguinte resposta: ${answerContent}.`;
  }
}
