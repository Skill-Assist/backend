/** nestjs */
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";

/** external dependencies */
import * as axios from "axios";
import * as ts from "typescript";
import { GradingCriteria } from "../utils/api-types.utils";

/** utils */
import {
  sleep,
  error,
  success,
  libText,
  TResult,
  TSuccess,
  stripNulls,
  ILanguageModel,
  IJsonValidator,
  IJsonTranslator,
  isTransientHttpError,
} from "../utils/nlp-types.utils";
import { systemSetup, TPromptSetup } from "../utils/nlp-prompts.utils";

////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class NaturalLanguageService {
  constructor(private readonly configService: ConfigService) {}

  createLanguageModel(openAiModel: string): ILanguageModel {
    const client = axios.default.create({
      headers: {
        Authorization: `Bearer ${this.configService.get<string>(
          "OPENAI_API_KEY"
        )}`,
      },
    });

    const model: ILanguageModel = { complete };
    return model;

    async function complete(
      prompt: string,
      mode: "create" | "eval",
      schema: string
    ): Promise<TResult<string>> {
      let retryCount = 0;
      const retryMaxAttempts = model.retryMaxAttempts ?? 3;
      const retryPauseMs = model.retryPauseMs ?? 1000;

      const systemSetupPrompt: TPromptSetup = systemSetup(schema, mode);

      const hiddenPrompt: string =
        mode === "create" ? systemSetupPrompt.hiddenPrompt : "";

      const hiddenRequest: string =
        mode === "create" ? systemSetupPrompt.hiddenRequest : "";

      const hiddenResponse: string =
        mode === "create" ? systemSetupPrompt.hiddenResponse : "";

      while (true) {
        const messages =
          mode === "create"
            ? [
                { role: "system", content: hiddenPrompt },
                { role: "user", content: hiddenRequest },
                { role: "assistant", content: hiddenResponse },
                { role: "user", content: prompt },
                { role: "system", content: "" },
              ]
            : [{ role: "user", content: prompt }];

        const params = {
          model: openAiModel,
          messages,
          temperature: 0,
          n: 1,
        };

        const result = await client.post(
          "https://api.openai.com/v1/chat/completions",
          params,
          { validateStatus: () => true }
        );

        if (result.status === 200) {
          return success(result.data.choices[0].message?.content ?? "");
        }

        if (
          !isTransientHttpError(result.status) ||
          retryCount >= retryMaxAttempts
        ) {
          return error(
            `Rest API error: ${result.status}: ${result.statusText}. Attemps: ${retryCount}`
          );
        }

        await sleep(retryCount + 1 * retryPauseMs);
        retryCount++;
      }
    }
  }

  createJsonValidator<T extends object>(
    schema: string,
    typeName: string
  ): IJsonValidator<T> {
    const options = {
      ...ts.getDefaultCompilerOptions(),
      strict: true,
      skipLibCheck: true,
      noLib: true,
      types: [],
    };

    const rootProgram = createProgramFromModuleText("");

    const validator: IJsonValidator<T> = {
      schema,
      typeName,
      stripNulls: false,
      createModuleTextFromJson,
      validate,
    };
    return validator;

    function createModuleTextFromJson(jsonObject: object): TSuccess<string> {
      return success(
        `import { ${typeName} } from "./schema";\nconst json: ${typeName} = ${JSON.stringify(
          jsonObject,
          undefined,
          2
        )};\n`
      );
    }

    function validate(jsonText: string): TResult<T> {
      let jsonObject;
      try {
        jsonObject = JSON.parse(jsonText) as object;
      } catch (e) {
        return error(e instanceof SyntaxError ? e.message : "JSON parse error");
      }

      if (validator.stripNulls) {
        stripNulls(jsonObject);
      }

      const moduleResult = validator.createModuleTextFromJson(jsonObject);
      if (!moduleResult.success) {
        return moduleResult;
      }

      const program = createProgramFromModuleText(
        moduleResult.data,
        rootProgram
      );
      const syntacticDiagnostics = program.getSyntacticDiagnostics();
      const programDiagnostics = syntacticDiagnostics.length
        ? syntacticDiagnostics
        : program.getSemanticDiagnostics();
      if (programDiagnostics.length) {
        const diagnostics = programDiagnostics
          .map((d) =>
            typeof d.messageText === "string"
              ? d.messageText
              : d.messageText.messageText
          )
          .join("\n");
        return error(diagnostics);
      }

      return success(jsonObject as T);
    }

    function createProgramFromModuleText(
      moduleText: string,
      oldProgram?: ts.Program
    ) {
      const fileMap = new Map([
        createFileMapEntry("/lib.d.ts", libText),
        createFileMapEntry("/schema.ts", schema),
        createFileMapEntry("/json.ts", moduleText),
      ]);
      const host: ts.CompilerHost = {
        getSourceFile: (fileName) => fileMap.get(fileName),
        getDefaultLibFileName: () => "lib.d.ts",
        writeFile: () => {},
        getCurrentDirectory: () => "/",
        getCanonicalFileName: (fileName) => fileName,
        useCaseSensitiveFileNames: () => true,
        getNewLine: () => "\n",
        fileExists: (fileName) => fileMap.has(fileName),
        readFile: (fileName) => "",
      };
      return ts.createProgram(
        Array.from(fileMap.keys()),
        options,
        host,
        oldProgram
      );
    }

    function createFileMapEntry(
      filePath: string,
      fileText: string
    ): [string, ts.SourceFile] {
      return [
        filePath,
        ts.createSourceFile(filePath, fileText, ts.ScriptTarget.Latest),
      ];
    }
  }

  createJsonTranslator<T extends object>(
    model: ILanguageModel,
    schema: string,
    typeName: string
  ): IJsonTranslator<T> {
    const validator = this.createJsonValidator<T>(schema, typeName);

    const translator: IJsonTranslator<T> = {
      model,
      validator,
      attemptRepair: true,
      stripNulls: false,
      createRequestPrompt,
      translate,
    };
    return translator;

    function createRequestPrompt(
      request: string,
      mode: "create" | "eval",
      statement?: string,
      rubric?: GradingCriteria
    ): string {
      let prompt: string = "";

      if (mode === "create")
        prompt +=
          `A seguir está o pedido fornecido pelo usuário para geração de uma nova questão:\n` +
          `"""\n${request}\n"""\n` +
          `A partir desse pedido, elabore a questão e retorne no formato JSON conforme a definição em TypeScript fornecida.\n` +
          `\`\`\`\n${validator.schema}\n\`\`\`\n`;

      if (mode === "eval")
        prompt +=
          `A seguir está a questão a ser corrigida no momento:\n` +
          `\`\`\`\n${statement}\n\`\`\`\n` +
          `Considerando a resposta, a avaliação será elaborada com base em ${
            rubric!.criteria.title
          }. Se a resposta possui ${rubric!.criteria.maxValueCriteria.description.toLowerCase()}, deve ser atribuída uma nota entre ${
            rubric!.criteria.maxValueCriteria.value.min
          } e ${
            rubric!.criteria.maxValueCriteria.value.max
          }. Por outro lado, se a resposta possui ${rubric!.criteria.avgValueCriteria.description.toLowerCase()}, deve ser atribuída uma nota entre ${
            rubric!.criteria.avgValueCriteria.value.min
          } e ${
            rubric!.criteria.avgValueCriteria.value.max
          }. Por fim, se você entender que a resposta possui ${rubric!.criteria.minValueCriteria.description.toLowerCase()}, deve ser atribuída uma nota entre ${
            rubric!.criteria.minValueCriteria.value.min
          } e ${
            rubric!.criteria.minValueCriteria.value.max
          }. Um feedback textual deve ser retornado explicando a nota atribuída à seguinte resposta:\n` +
          `\`\`\`\n${request}\n\`\`\`\n` +
          `A partir desse pedido, elabore a correção e retorne no formato JSON conforme a definição em TypeScript fornecida:\n` +
          `\`\`\`\n${validator.schema}\n\`\`\`\n`;

      return prompt;
    }

    async function translate(
      request: string,
      mode: "create" | "eval",
      statement?: string,
      rubric?: GradingCriteria
    ): Promise<any> {
      let prompt = translator.createRequestPrompt(
        request,
        mode,
        statement,
        rubric
      );

      let attemptRepair = translator.attemptRepair;

      while (true) {
        const response = await model.complete(prompt, mode, validator.schema);
        if (!response.success) {
          return response;
        }

        const responseText = response.data;
        const startIndex = responseText.indexOf("{");
        const endIndex = responseText.lastIndexOf("}");
        if (!(startIndex >= 0 && endIndex > startIndex)) {
          return error(`Response is not JSON:\n${responseText}`);
        }
        const jsonText = responseText.slice(startIndex, endIndex + 1);
        const validation = validator.validate(jsonText);
        if (validation.success) {
          return validation;
        }
        if (!attemptRepair) {
          return error(
            `JSON validation failed: ${validation.message}\n${jsonText}`
          );
        }
        prompt += `\n\nComo exemplo, notar que o formato a seguir não pode ser retornado, pois não está de acordo com a definição Typescript fornecida:\n${responseText}\n`;
        attemptRepair = false;
      }
    }
  }
}
