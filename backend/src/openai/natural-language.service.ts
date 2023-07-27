/** nestjs */
import { ConfigService } from "@nestjs/config";
import { Injectable } from "@nestjs/common";

/** external dependencies */
import * as axios from "axios";
import * as ts from "typescript";
import { GenerateQuestionDto } from "../question/dto/generate-question.dto";
////////////////////////////////////////////////////////////////////////////////

type Success<T> = {
  success: true;
  data: T;
};

type Error = {
  success: false;
  message: string;
};

type Result<T> = Success<T> | Error;

function success<T>(data: T): Success<T> {
  return { success: true, data };
}

function error(message: string): Error {
  return { success: false, message };
}

// function getData<T>(result: Result<T>) {
//   if (result.success) {
//     return result.data;
//   }
//   throw new BadRequestException(result.message);
// }

// =============================================================================

interface LanguageModel {
  retryMaxAttempts?: number;
  retryPauseMs?: number;
  models(): Promise<Result<any>>;
  complete(prompt: string): Promise<Result<string>>;
}

interface JsonValidator<T extends object> {
  schema: string;
  typeName: string;
  stripNulls: boolean;
  createModuleTextFromJson(jsonObject: object): Result<string>;
  validate(jsonText: string): Result<T>;
}

interface JsonTranslator<T extends object> {
  model: LanguageModel;
  validator: JsonValidator<T>;
  attemptRepair: boolean;
  stripNulls: boolean;
  createRequestPrompt(request: string): string;
  translate(generateQuestionDto: GenerateQuestionDto): Promise<Result<T>>;
}

// =============================================================================

function isTransientHttpError(code: number): boolean {
  switch (code) {
    case 429: // TooManyRequests
    case 500: // InternalServerError
    case 502: // BadGateway
    case 503: // ServiceUnavailable
    case 504: // GatewayTimeout
      return true;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripNulls(obj: any) {
  let keysToDelete: string[] | undefined;
  for (const k in obj) {
    const value = obj[k];
    if (value === null) {
      (keysToDelete ??= []).push(k);
    } else {
      if (Array.isArray(value)) {
        if (value.some((x) => x === null)) {
          obj[k] = value.filter((x) => x !== null);
        }
      }
      if (typeof value === "object") {
        stripNulls(value);
      }
    }
  }
  if (keysToDelete) {
    for (const k of keysToDelete) {
      delete obj[k];
    }
  }
}

// =============================================================================

const libText = `interface Array<T> { length: number, [n: number]: T }
interface Object { toString(): string }
interface Function { prototype: unknown }
interface CallableFunction extends Function {}
interface NewableFunction extends Function {}
interface String { readonly length: number }
interface Boolean { valueOf(): boolean }
interface Number { valueOf(): number }
interface RegExp { test(s: string): boolean }`;

// =============================================================================

@Injectable()
export class NaturalLanguageService {
  constructor(private readonly configService: ConfigService) {}

  createLanguageModel(openAiModel: string): LanguageModel {
    const client = axios.default.create({
      headers: {
        Authorization: `Bearer ${this.configService.get<string>(
          "OPENAI_API_KEY"
        )}`,
      },
    });

    const model: LanguageModel = { complete, models };
    return model;

    async function models(): Promise<Result<any>> {
      const result = await client.get("https://api.openai.com/v1/models", {
        validateStatus: () => true,
      });
      if (result.status === 200) {
        return success(result.data);
      }
      return error(`Rest API error: ${result.status}: ${result.statusText}`);
    }

    async function complete(prompt: string): Promise<Result<string>> {
      let retryCount = 0;
      const retryMaxAttempts = model.retryMaxAttempts ?? 3;
      const retryPauseMs = model.retryPauseMs ?? 1000;

      while (true) {
        const params = {
          model: openAiModel,
          messages: [{ role: "user", content: prompt }],
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
            `Rest API error: ${result.status}: ${result.statusText}`
          );
        }

        await sleep(retryPauseMs);
        retryCount++;
      }
    }
  }

  createJsonValidator<T extends object = object>(
    schema: string,
    typeName: string
  ): JsonValidator<T> {
    const options = {
      ...ts.getDefaultCompilerOptions(),
      strict: true,
      skipLibCheck: true,
      noLib: true,
      types: [],
    };

    const rootProgram = createProgramFromModuleText("");

    const validator: JsonValidator<T> = {
      schema,
      typeName,
      stripNulls: false,
      createModuleTextFromJson,
      validate,
    };
    return validator;

    function createModuleTextFromJson(jsonObject: object): Success<string> {
      return success(
        `import { ${typeName} } from "./schema";\nconst json: ${typeName} = ${JSON.stringify(
          jsonObject,
          undefined,
          2
        )};\n`
      );
    }

    function validate(jsonText: string): Result<T> {
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
        console.log("diagnostics: ", diagnostics);
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
    model: LanguageModel,
    schema: string,
    typeName: string
  ): JsonTranslator<T> {
    const validator = this.createJsonValidator<T>(schema, typeName);

    const translator: JsonTranslator<T> = {
      model,
      validator,
      attemptRepair: true,
      stripNulls: false,
      createRequestPrompt,
      translate,
    };
    return translator;

    function createRequestPrompt(request: string): string {
      return (
        `Você é um serviço que elabora questões para testes de recrutamento e seleção. As questões contém enunciados (ou statements). As questões devem ser traduzidas para objeto JSON de acordo com a seguinte definição em Typescript:\n` +
        `\`\`\`\n${validator.schema}\n\`\`\`\n` +
        `A seguir está o pedido (prompt) fornecido pelo usuário:\n` +
        `"""\n${request}\n"""\n` +
        `A partir desse pedido, elabore a questão e retorne no formato JSON conforme a definição em TypeScript fornecida.\n`
      );
    }

    async function translate(
      generateQuestionDto: GenerateQuestionDto
    ): Promise<any> {
      let prompt = translator.createRequestPrompt(
        generateQuestionDto.statement
      );

      let attemptRepair = translator.attemptRepair;

      while (true) {
        const response = await model.complete(prompt);
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
          console.log(validation);
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
