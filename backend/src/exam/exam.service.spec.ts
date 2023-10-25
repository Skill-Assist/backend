/** nestjs */
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Test, TestingModule } from "@nestjs/testing";

/** external providers */
import { LLMChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

/** providers */
import { ExamService } from "./exam.service";
import { UserService } from "../user/user.service";
import { AnswerSheetService } from "../answer-sheet/answer-sheet.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";
import { ExamInvitationService } from "../exam-invitation/exam-invitation.service";

/** entities */
import { Exam } from "./entities/exam.entity";
//////////////////////////////////////////////////////////////////////////////////

/** --- mock modules ------------------------------------------------------------
 *
 * Intercepting JavaScript imports with jest.mock
 *
 * jest.mock should be called before importing the module under test (which
 * itself imports the module just mocked)
 *
 * in practice, Babel ESM -> CommonJS transpilation hoists the jest.mock call
 * so this may not be an issue 🤷‍♀
 *
 * see: https://codewithhugo.com/jest-mock-spy-module-import
 */
jest.mock("langchain/llms/openai", () => {
  return { OpenAI: jest.fn(() => new (class {})()) };
});

jest.mock("@pinecone-database/pinecone", () => {
  class VectorStore {
    index = jest.fn().mockReturnThis();
    query = jest
      .fn()
      .mockReturnValueOnce(
        Promise.resolve({ matches: [{ score: 0.95, id: expect.any(Number) }] })
      )
      .mockReturnValue(undefined);
  }

  return { Pinecone: jest.fn(() => new VectorStore()) };
});

jest.mock("langchain/embeddings/openai", () => {
  class Embeddings {
    embedQuery(text: string) {
      return jest.fn().mockReturnValue(Promise.resolve([0.1, 0.2, 0.3]));
    }
  }

  return { OpenAIEmbeddings: jest.fn(() => new Embeddings()) };
});

jest.mock("langchain/chains", () => {
  class LLMChain {
    call(payload: any) {
      return jest
        .fn()
        .mockReturnValueOnce(Promise.resolve({ text: "a".repeat(401) }))
        .mockReturnValueOnce(Promise.resolve({ text: "test" }));
    }
  }

  return { LLMChain: jest.fn(() => new LLMChain()) };
});

/** --- mock providers -------------------------------------------------------*/
const mockRepository = {
  createQueryBuilder: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockReturnThis(),
};

const mockConfigService = { get: jest.fn().mockReturnValue("") };

/** --- setup ----------------------------------------------------------------*/
let service: ExamService;

beforeAll(async () => {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      ExamService,
      { provide: getRepositoryToken(Exam), useValue: mockRepository },
      { provide: ConfigService, useValue: mockConfigService },
      { provide: UserService, useValue: {} },
      { provide: AnswerSheetService, useValue: {} },
      { provide: ExamInvitationService, useValue: {} },
      { provide: QueryRunnerService, useValue: {} },
    ],
  }).compile();

  service = moduleRef.get<ExamService>(ExamService);
});

beforeEach(() => {
  jest.clearAllMocks();
});

/** --- test suite -----------------------------------------------------------*/
describe("ExamService", () => {
  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create method", () => {
    it("should create a new exam", async () => {});

    it("should add exam's metadata to the vector store", async () => {});

    it("should set relation to the user who created the exam", async () => {});

    it("should rollback changes if an error occurs", async () => {});

    it("should release the query runner", async () => {});
  });

  describe("suggestDescription method", () => {
    it("should return a suggested description from SQL database", async () => {
      mockRepository.getOne.mockResolvedValueOnce({ description: "test" });

      await expect(
        service.suggestDescription({
          jobTitle: "",
          jobLevel: "",
        })
      ).resolves.toBe("test");

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.select).toHaveBeenCalledWith("exam.description");
      expect(mockRepository.where).toHaveBeenCalledWith(
        "exam.jobTitle = :jobTitle",
        { jobTitle: "" }
      );
      expect(mockRepository.andWhere).toHaveBeenCalledWith(
        "exam.jobLevel = :jobLevel",
        { jobLevel: "" }
      );
      expect(mockRepository.getOne).toHaveBeenCalled();
    });

    it("should return a suggested description from vector store", async () => {
      mockRepository.getOne
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ description: "test" });

      await expect(
        service.suggestDescription({
          jobTitle: "",
          jobLevel: "",
        })
      ).resolves.toBe("test");

      expect(service.vectorStore.index).toHaveBeenCalled();
      expect(OpenAIEmbeddings).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenNthCalledWith(2, "user.id = :id", {
        id: expect.any(Number),
      });
      expect(mockRepository.getOne).toHaveBeenCalledTimes(2);
    });

    it("should throw an error if the vector store returns an invalid exam id", async () => {
      mockRepository.getOne.mockResolvedValue(undefined);

      await expect(
        service.suggestDescription({
          jobTitle: "",
          jobLevel: "",
        })
      ).rejects.toThrow();

      expect(service.vectorStore.index).toHaveBeenCalled();
      expect(OpenAIEmbeddings).toHaveBeenCalled();
    });

    it("should return a suggested description from LLM model call with validated length", async () => {
      async () => {
        mockRepository.getOne.mockResolvedValue(undefined);

        await expect(
          service.suggestDescription({
            jobTitle: "",
            jobLevel: "",
          })
        ).resolves.toBe("test");

        expect(service.vectorStore.index).toHaveBeenCalled();
        expect(OpenAIEmbeddings).toHaveBeenCalled();
        expect(LLMChain).toHaveBeenCalled();
      };
    });
  });
});
