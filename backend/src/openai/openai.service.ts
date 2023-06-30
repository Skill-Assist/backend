/** nestjs */
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** dependencies */
import {
  OpenAIApi,
  Configuration,
  ChatCompletionRequestMessage,
  CreateChatCompletionResponse,
} from "openai";
import { AxiosResponse } from "axios";
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
  // set the OpenAI API key
  private _openAiApi: OpenAIApi;

  // inject the ConfigService
  constructor(private readonly configService: ConfigService) {}

  // create the OpenAI API instance
  get openAiApi(): OpenAIApi {
    if (!this._openAiApi) {
      const configuration = new Configuration({
        apiKey: this.configService.get<string>("OPENAI_API_KEY"),
      });
      this._openAiApi = new OpenAIApi(configuration);
    }

    return this._openAiApi;
  }

  // create the chat completion for the answer
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

  setPersona(role: string = "professor"): string {
    let institution: string;
    let user: string;

    switch (role) {
      case "professor":
        institution = "prestigious university";
        user = "student";
        break;
      case "HR manager":
        institution = "large company";
        user = "candidate";
        break;
      default:
        institution = "prestigious university";
        user = "student";
    }

    return `You are an experienced and respected ${role} at a ${institution} who is grading a ${user}'s answer to a question. You are known for your professionalism, attention to detail, and high standards. You are meticulous and thorough, leaving no stone unturned when it comes to test evaluation. Your approach to correcting tests is methodical and systematic. You value clarity, coherence, and logical reasoning`;
  }

  setGradingCriteria(criteria: any): string {
    let gradingCriteria: string = "";

    for (let i = 1; i < criteria.length; i++) {
      gradingCriteria += `If it ${criteria[i][0]}, you should grade it ${
        typeof criteria[i][1] === "number"
          ? `${criteria[i][1]}. `
          : `with a specific number between ${criteria[i][1].min} and ${criteria[i][1].max}, considering the level of detail of the answer. You should never return without a specific grade, even if it is a 0. `
      }`;
    }

    console.log(gradingCriteria);

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
        content: `${this.setPersona()}. This is the question currently being graded: ${questionStatement}. Given an answer, you will grade it in respect to its ${key}. ${this.setGradingCriteria(
          criteria
        )}. Finally, you should return some textual feedback explaining the grade.`,
      },
      {
        role: "user",
        content: `<<Consider that here should be a very complete answer, deserving the maximum score possible, which is ${criteria[0][1]}>>`,
      },
      {
        role: "assistant",
        content: `Grade: ${criteria[0][1]} | Feedback: <<some text with feedback about the answer>>`,
      },
      {
        role: "user",
        content: `<<Consider that here should be a somewhat complete answer, deserving a score between ${criteria[1][1].min} and ${criteria[1][1].max}>>`,
      },
      {
        role: "assistant",
        content: `Grade: ${Math.round(
          (criteria[1][1].min + criteria[1][1].max) / 2
        )} | Feedback: <<some text with feedback about the answer>>`,
      },
      {
        role: "user",
        content: `<<Consider that here should be a very incomplete answer, deserving a score between ${criteria[2][1].min} and ${criteria[2][1].max}>>`,
      },
      {
        role: "assistant",
        content: `Grade: ${Math.round(
          (criteria[2][1].min + criteria[2][1].max) / 2
        )} | Feedback: <<some text with feedback about the answer>>`,
      },
      {
        role: "user",
        content: `<<Consider that here should be an incomplete answer, deserving a score of 0>>`,
      },
      {
        role: "assistant",
        content: `Grade: 0 | Feedback: <<some text with feedback about the answer>>`,
      },
    ];
  }
}
