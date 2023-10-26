/** nestjs */
import { ModuleRef } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Test, TestingModule } from "@nestjs/testing";

/** external providers */
import { LLMChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

/** providers */
import { ExamService } from "./exam.service";
import { UserService } from "../user/user.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";
import { AnswerSheetService } from "../answer-sheet/answer-sheet.service";
import { ExamInvitationService } from "../exam-invitation/exam-invitation.service";

/** entities */
import { Exam } from "./entities/exam.entity";

/** dto */
import { CreateExamDto } from "./dto/create-exam.dto";
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
    embedQuery() {
      return jest.fn().mockReturnValue(Promise.resolve([0.1, 0.2, 0.3]));
    }
  }

  return { OpenAIEmbeddings: jest.fn(() => new Embeddings()) };
});

jest.mock("langchain/chains", () => {
  class LLMChain {
    call() {
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
  of: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockReturnThis(),
  create: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  execute: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  relation: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  createQueryBuilder: jest.fn().mockReturnThis(),
  loadRelationIdAndMap: jest.fn().mockReturnThis(),
};

const mockQueryRunner = {
  connect: jest.fn().mockReturnThis(),
  release: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),
  commitTransaction: jest.fn().mockReturnThis(),
  rollbackTransaction: jest.fn().mockReturnThis(),
};

const mockAnswerSheetService = {};
const mockExamInvitationService = {};
const mockUserService = { findOne: jest.fn().mockReturnThis() };
const mockConfigService = { get: jest.fn().mockReturnValue("") };

const mockModuleRef = {
  get: jest.fn().mockImplementation((provider: any) => {
    switch (provider) {
      case UserService:
        return mockUserService;
      case AnswerSheetService:
        return mockAnswerSheetService;
      case ExamInvitationService:
        return mockExamInvitationService;
      default:
        return {};
    }
  }),
};

/** --- setup ----------------------------------------------------------------*/
let service: ExamService;

beforeAll(async () => {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      ExamService,
      { provide: ModuleRef, useValue: mockModuleRef },
      { provide: ConfigService, useValue: mockConfigService },
      { provide: QueryRunnerService, useValue: mockQueryRunner },
      { provide: getRepositoryToken(Exam), useValue: mockRepository },
    ],
  }).compile();

  service = moduleRef.get<ExamService>(ExamService);
  service.onModuleInit();
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
    it("should create a new exam, add its metadata to vector store and set relation to its owner", async () => {
      mockUserService.findOne.mockResolvedValueOnce({});
      mockRepository.create.mockResolvedValueOnce({ id: expect.any(Number) });
      jest.spyOn(service, "manageVectorStore").mockResolvedValueOnce(undefined);

      await expect(
        service.create(expect.any(Number), {} as CreateExamDto)
      ).resolves.toBeDefined();

      expect(mockRepository.of).toHaveBeenCalled();
      expect(mockRepository.set).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockUserService.findOne).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockRepository.relation).toHaveBeenCalled();
      expect(service.manageVectorStore).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith({});
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it("should rollback changes if an error occurs", async () => {
      mockUserService.findOne.mockRejectedValueOnce({});

      await expect(
        service.create(expect.any(Number), {} as CreateExamDto)
      ).rejects.toThrow();

      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe("findAll method", () => {
    it("should throw an error if key is provided but value is not", async () => {});

    it("should return an array of exams", async () => {});

    it("should return an array of exams filtered by key and value", async () => {});

    it("should return an array of exams with relations", async () => {});

    it("should return an array of exams with relations mapped", async () => {});
  });

  describe("findOne method", () => {
    it("should throw an error if the exam does not exist", async () => {
      mockRepository.getOne.mockResolvedValueOnce(undefined);

      await expect(
        service.findOne(expect.any(Number), "id", expect.any(Number))
      ).rejects.toThrow();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(Number),
      });
      expect(mockRepository.getOne).toHaveBeenCalled();
    });

    it("should throw an error if the user is not the owner or not enrolled", async () => {
      mockRepository.getOne.mockResolvedValueOnce({
        createdBy: Promise.resolve({ id: 1 }),
        enrolledUsers: Promise.resolve([{ id: 2 }]),
      });

      await expect(
        service.findOne(3, "id", expect.any(Number))
      ).rejects.toThrow();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(Number),
      });
      expect(mockRepository.getOne).toHaveBeenCalled();
    });

    it("should return an exam if found and user is the owner", async () => {
      mockRepository.getOne
        .mockResolvedValueOnce({
          createdBy: Promise.resolve({ id: 1 }),
          enrolledUsers: Promise.resolve([{ id: 2 }]),
        })
        .mockResolvedValueOnce({});

      await expect(
        service.findOne(1, "id", expect.any(Number))
      ).resolves.toBeDefined();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(Number),
      });
      expect(mockRepository.getOne).toHaveBeenCalledTimes(2);
    });

    it("should return an exam if one is found and user is enrolled", async () => {
      mockRepository.getOne
        .mockResolvedValueOnce({
          createdBy: Promise.resolve({ id: 1 }),
          enrolledUsers: Promise.resolve([{ id: 2 }]),
        })
        .mockResolvedValueOnce({});

      await expect(
        service.findOne(2, "id", expect.any(Number))
      ).resolves.toBeDefined();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(Number),
      });
      expect(mockRepository.getOne).toHaveBeenCalledTimes(2);
    });

    it("should return an exam with relations", async () => {
      mockRepository.getOne
        .mockResolvedValueOnce({ createdBy: Promise.resolve({ id: 1 }) })
        .mockResolvedValueOnce({});

      await expect(
        service.findOne(1, "id", expect.any(Number), ["createdBy"])
      ).resolves.toBeDefined();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(Number),
      });
      expect(mockRepository.getOne).toHaveBeenCalled();
      expect(mockRepository.loadRelationIdAndMap).toHaveBeenCalledWith(
        "createdByRef",
        "exam.createdBy"
      );
    });

    it("should return an exam with relations mapped", async () => {
      mockRepository.getOne
        .mockResolvedValueOnce({ createdBy: Promise.resolve({ id: 1 }) })
        .mockResolvedValueOnce({});

      await expect(
        service.findOne(1, "id", expect.any(Number), ["createdBy"], true)
      ).resolves.toBeDefined();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(Number),
      });
      expect(mockRepository.getOne).toHaveBeenCalled();
      expect(mockRepository.leftJoinAndSelect).toHaveBeenCalledWith(
        "exam.createdBy",
        "createdBy"
      );
    });
  });

  describe("update method", () => {
    it("should throw an error if the exam is in draft status", async () => {
      jest
        .spyOn(service, "findOne")
        .mockResolvedValueOnce({ status: "published" } as Exam);

      await expect(
        service.update(expect.any(Number), expect.any(Number), {})
      ).rejects.toThrow("Exam is not in draft status. Process was aborted.");
    });

    it("should update the exam", async () => {
      const mockUpdateExamDto = { status: "draft" } as Exam;

      jest.spyOn(service, "findOne").mockResolvedValue(mockUpdateExamDto);

      jest.spyOn(service, "manageVectorStore").mockResolvedValueOnce(undefined);

      await expect(
        service.update(expect.any(Number), expect.any(Number), {})
      ).resolves.toEqual(mockUpdateExamDto);
    });

    it("should update exam's metadata in vector store", async () => {
      const mockUpdateExamDto = {
        status: "draft",
        id: 1,
        jobTitle: "",
        jobLevel: "",
        description: "",
      } as Exam;

      jest.spyOn(service, "findOne").mockResolvedValue(mockUpdateExamDto);

      jest.spyOn(service, "manageVectorStore").mockResolvedValueOnce(undefined);

      await expect(
        service.update(expect.any(Number), expect.any(Number), {})
      ).resolves.toEqual(mockUpdateExamDto);

      expect(service.manageVectorStore).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        mockUpdateExamDto.id,
        mockUpdateExamDto.jobTitle,
        mockUpdateExamDto.jobLevel,
        mockUpdateExamDto.description
      );
    });
  });

  describe("delete method", () => {});

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

  describe("fetchOwn method", () => {});
  describe("switchStatus", () => {});
  describe("checkIfArchivable", () => {});
  describe("sendInvitations", () => {});
  describe("enrollUser", () => {});
  describe("fetchCandidates", () => {});
  describe("findSimilarSections", () => {});
  describe("manageVectorStore", () => {});
});
