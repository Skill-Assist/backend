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
import { User } from "../user/entities/user.entity";
import { AnswerSheet } from "../answer-sheet/entities/answer-sheet.entity";

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
    upsert = jest.fn().mockReturnThis();
    delete = jest.fn().mockReturnThis();
    deleteOne = jest.fn().mockReturnThis();
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
    embedDocuments() {
      return jest.fn().mockReturnValue(Promise.resolve([0.1, 0.2, 0.3]));
    }

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
  add: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  getOne: jest.fn().mockReturnThis(),
  create: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockReturnThis(),
  execute: jest.fn().mockReturnThis(),
  loadMany: jest.fn().mockReturnThis(),
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

const mockAnswerSheetService = {
  start: jest.fn().mockReturnThis(),
  submit: jest.fn().mockReturnThis(),
};

const mockExamInvitationService = {
  create: jest.fn().mockReturnThis(),
  reject: jest.fn().mockReturnThis(),
  findAll: jest.fn().mockReturnThis(),
  findPending: jest.fn().mockReturnThis(),
};

const mockUserService = { findOne: jest.fn().mockReturnThis() };

const mockConfigService = { get: jest.fn().mockReturnValue("") };

const mockModuleRef = {
  get: jest
    .fn()
    .mockImplementation(
      (
        provider:
          | typeof UserService
          | typeof AnswerSheetService
          | typeof ExamInvitationService
      ) => {
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
      }
    ),
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
    it("should throw an error if key is provided but value is not", async () => {
      await expect(service.findAll("id")).rejects.toThrow(
        "Key provided without value. Process aborted."
      );
    });

    it("should return an array of exams", async () => {
      mockRepository.getMany.mockResolvedValueOnce([]);

      await expect(service.findAll()).resolves.toEqual([]);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.getMany).toHaveBeenCalled();
    });

    it("should return an array of exams filtered by key and value", async () => {
      mockRepository.getMany.mockResolvedValueOnce([]);

      await expect(service.findAll("id", expect.any(String))).resolves.toEqual(
        []
      );

      expect(mockRepository.getMany).toHaveBeenCalled();
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(String),
      });
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
    });

    it("should return an array of exams with relations", async () => {
      mockRepository.getMany.mockResolvedValueOnce([]);

      await expect(
        service.findAll("id", expect.any(String), [expect.any(String)])
      ).resolves.toEqual([]);

      expect(mockRepository.getMany).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(String),
      });
      expect(mockRepository.loadRelationIdAndMap).toHaveBeenCalledWith(
        `${expect.any(String)}Ref`,
        `exam.${expect.any(String)}`
      );
    });

    it("should return an array of exams with relations mapped", async () => {
      mockRepository.getMany.mockResolvedValueOnce([]);

      await expect(
        service.findAll("id", expect.any(String), [expect.any(String)], true)
      ).resolves.toEqual([]);

      expect(mockRepository.getMany).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(String),
      });
      expect(mockRepository.leftJoinAndSelect).toHaveBeenCalledWith(
        `exam.${expect.any(String)}`,
        `${expect.any(String)}`
      );
    });
  });

  describe("findOne method", () => {
    it("should throw an error if the exam does not exist", async () => {
      mockRepository.getOne.mockResolvedValueOnce(undefined);

      await expect(
        service.findOne(expect.any(Number), "id", expect.any(Number))
      ).rejects.toThrow("Exam with given id not found.");

      expect(mockRepository.getOne).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(Number),
      });
    });

    it("should throw an error if the user is not the owner nor enrolled", async () => {
      mockRepository.getOne.mockResolvedValueOnce({
        createdBy: Promise.resolve({ id: 1 }),
        enrolledUsers: Promise.resolve([{ id: 2 }]),
      });

      await expect(
        service.findOne(3, "id", expect.any(Number))
      ).rejects.toThrow("You are not authorized to access this exam.");

      expect(mockRepository.getOne).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(Number),
      });
    });

    it("should return an exam if one is found and user is the owner", async () => {
      mockRepository.getOne
        .mockResolvedValueOnce({
          createdBy: Promise.resolve({ id: 1 }),
          enrolledUsers: Promise.resolve([{ id: 2 }]),
        })
        .mockResolvedValueOnce({});

      await expect(
        service.findOne(1, "id", expect.any(Number))
      ).resolves.toBeDefined();

      expect(mockRepository.getOne).toHaveBeenCalledTimes(2);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(Number),
      });
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

      expect(mockRepository.getOne).toHaveBeenCalledTimes(2);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(Number),
      });
    });

    it("should return an exam with relations", async () => {
      mockRepository.getOne
        .mockResolvedValueOnce({ createdBy: Promise.resolve({ id: 1 }) })
        .mockResolvedValueOnce({});

      await expect(
        service.findOne(1, "id", expect.any(Number), ["createdBy"])
      ).resolves.toBeDefined();

      expect(mockRepository.getOne).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(Number),
      });
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

      expect(mockRepository.getOne).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenCalledWith("exam.id = :id", {
        id: expect.any(Number),
      });
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

    it("should update the exam and its metadata in vector store", async () => {
      const mockUpdateExamDto = { status: "draft" } as Exam;
      jest.spyOn(service, "findOne").mockResolvedValue(mockUpdateExamDto);
      jest.spyOn(service, "manageVectorStore").mockResolvedValueOnce(undefined);

      await expect(
        service.update(expect.any(Number), expect.any(Number), {})
      ).resolves.toEqual(mockUpdateExamDto);

      expect(service.manageVectorStore).toHaveBeenCalled();
    });
  });

  describe("delete method", () => {
    it("should throw an error if exam is not in draft status", async () => {
      jest
        .spyOn(service, "findOne")
        .mockResolvedValueOnce({ status: "published" } as Exam);

      await expect(
        service.delete(expect.any(Number), expect.any(Number))
      ).rejects.toThrow("Exam is not in draft status. Process was aborted.");
    });

    it("should delete the exam and its metadata from vector store", async () => {
      jest
        .spyOn(service, "findOne")
        .mockResolvedValue({ status: "draft" } as Exam);
      jest.spyOn(service, "manageVectorStore").mockResolvedValueOnce(undefined);

      await expect(
        service.delete(expect.any(Number), expect.any(Number))
      ).resolves.toBeUndefined();

      expect(mockRepository.from).toHaveBeenCalled();
      expect(mockRepository.delete).toHaveBeenCalled();
      expect(mockRepository.execute).toHaveBeenCalled();
      expect(service.manageVectorStore).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith();
      expect(mockRepository.where).toHaveBeenCalledWith("id = :id", {
        id: expect.any(Number),
      });
    });
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

      expect(mockRepository.getOne).toHaveBeenCalled();
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

      expect(OpenAIEmbeddings).toHaveBeenCalled();
      expect(service.vectorStore.index).toHaveBeenCalled();
      expect(mockRepository.getOne).toHaveBeenCalledTimes(2);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.where).toHaveBeenNthCalledWith(2, "exam.id = :id", {
        id: expect.any(Number),
      });
    });

    it("should throw an error if the vector store returns an invalid exam id", async () => {
      mockRepository.getOne.mockResolvedValue(undefined);

      await expect(
        service.suggestDescription({
          jobTitle: "",
          jobLevel: "",
        })
      ).rejects.toThrow();

      expect(OpenAIEmbeddings).toHaveBeenCalled();
      expect(service.vectorStore.index).toHaveBeenCalled();
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

        expect(LLMChain).toHaveBeenCalled();
        expect(OpenAIEmbeddings).toHaveBeenCalled();
        expect(service.vectorStore.index).toHaveBeenCalled();
      };
    });
  });

  describe("fetchOwn method", () => {
    it("should return an array of exams created by user or in which user is enrolled, removing duplicates if any", async () => {
      jest.spyOn(service, "findAll").mockResolvedValueOnce([{ id: 1 } as Exam]);
      mockUserService.findOne
        .mockReset()
        .mockReturnValueOnce(Promise.resolve({ roles: ["candidate"] }));
      mockRepository.getMany.mockResolvedValueOnce([
        { id: 1 } as Exam,
        { id: 2 } as Exam,
      ]);

      await expect(service.fetchOwn(expect.any(Number))).resolves.toEqual([
        { id: 1 },
        { id: 2 },
      ]);
    });
  });

  describe("switchStatus method", () => {
    it("should throw an error if new status is neither published nor archived", async () => {
      jest.spyOn(service, "findOne").mockResolvedValueOnce({} as Exam);

      await expect(
        service.switchStatus(expect.any(Number), expect.any(Number), "draft")
      ).rejects.toThrow("Invalid status. Process was aborted.");
    });

    it("should throw an error if new status is published but exam has no sections", async () => {
      jest.spyOn(service, "findOne").mockResolvedValueOnce({
        sections: Promise.resolve([]),
      } as unknown as Exam);

      await expect(
        service.switchStatus(
          expect.any(Number),
          expect.any(Number),
          "published"
        )
      ).rejects.toThrow("Exam has no sections. Process was aborted.");
    });

    it("should throw an error if new status is published but exam has sections without questions", async () => {
      jest.spyOn(service, "findOne").mockResolvedValueOnce({
        sections: Promise.resolve([{}]),
      } as unknown as Exam);

      await expect(
        service.switchStatus(
          expect.any(Number),
          expect.any(Number),
          "published"
        )
      ).rejects.toThrow(
        "Exam has sections without questions. Process was aborted."
      );

      jest.spyOn(service, "findOne").mockResolvedValueOnce({
        sections: Promise.resolve([{ questions: [] }]),
      } as unknown as Exam);

      await expect(
        service.switchStatus(
          expect.any(Number),
          expect.any(Number),
          "published"
        )
      ).rejects.toThrow(
        "Exam has sections without questions. Process was aborted."
      );
    });

    it("should throw an error if new status is published but overall section's weights do not add to 1", async () => {
      jest.spyOn(service, "findOne").mockResolvedValueOnce({
        sections: Promise.resolve([
          { weight: 0.6, questions: [{}] },
          { weight: 0.3, questions: [{}] },
        ]),
      } as unknown as Exam);

      await expect(
        service.switchStatus(
          expect.any(Number),
          expect.any(Number),
          "published"
        )
      ).rejects.toThrow(
        "Exam has sections with weights that do not add to 1. Process was aborted."
      );
    });

    it("should throw an error if new status is archived but current status is not published", async () => {
      jest.spyOn(service, "findOne").mockResolvedValueOnce({
        status: "draft",
      } as Exam);

      await expect(
        service.switchStatus(expect.any(Number), expect.any(Number), "archived")
      ).rejects.toThrow("Exam is not published. Process was aborted.");
    });

    it("should throw an error if new status is archived but exam has pending answer sheets", async () => {
      jest
        .spyOn(service, "findOne")
        .mockResolvedValueOnce({ status: "published" } as Exam);

      jest
        .spyOn(service, "getDaysRemaining")
        .mockResolvedValueOnce({ daysRemaining: 24 * 60 * 60 * 1 });

      await expect(
        service.switchStatus(expect.any(Number), expect.any(Number), "archived")
      ).rejects.toThrow(
        "Exam is not archivable. 1 days remaining. Process was aborted."
      );
    });

    it("should switch status to published", async () => {
      jest.spyOn(service, "findOne").mockResolvedValueOnce({
        status: "draft",
        sections: Promise.resolve([
          { weight: 0.5, questions: [{}] },
          { weight: 0.5, questions: [{}] },
        ]),
      } as Exam);

      await expect(
        service.switchStatus(
          expect.any(Number),
          expect.any(Number),
          "published"
        )
      ).resolves.toEqual("Exam has been published.");

      expect(mockRepository.update).toHaveBeenCalled();
      expect(mockRepository.execute).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockRepository.set).toHaveBeenCalledWith({ status: "published" });
      expect(mockRepository.where).toHaveBeenCalledWith("id = :id", {
        id: expect.any(Number),
      });
    });

    it("should switch status to archived", async () => {
      jest.spyOn(service, "findOne").mockResolvedValueOnce({
        status: "published",
        answerSheets: Promise.resolve([] as AnswerSheet[]),
      } as Exam);

      jest
        .spyOn(service, "getDaysRemaining")
        .mockResolvedValueOnce({ daysRemaining: -1 });

      mockExamInvitationService.findPending.mockResolvedValueOnce([]);

      await expect(
        service.switchStatus(expect.any(Number), expect.any(Number), "archived")
      ).resolves.toEqual("Exam has been archived.");

      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
      expect(mockRepository.update).toHaveBeenCalled();
      expect(mockRepository.execute).toHaveBeenCalled();
      expect(mockRepository.set).toHaveBeenCalledWith({ status: "archived" });
      expect(mockRepository.where).toHaveBeenCalledWith("id = :id", {
        id: expect.any(Number),
      });
    });

    it("should rekove pending invitations before switching to archived status", async () => {
      jest.spyOn(service, "findOne").mockResolvedValueOnce({
        status: "published",
        answerSheets: Promise.resolve([] as AnswerSheet[]),
      } as Exam);

      jest.spyOn(service, "getDaysRemaining").mockResolvedValueOnce({
        daysRemaining: 0,
      });

      mockExamInvitationService.findPending.mockResolvedValueOnce([
        { id: 1 },
        { id: 2 },
      ]);

      await service.switchStatus(
        expect.any(Number),
        expect.any(Number),
        "archived"
      );

      expect(mockExamInvitationService.findPending).toHaveBeenCalled();
      expect(mockExamInvitationService.reject).toHaveBeenCalledTimes(2);
    });

    it("should close all non-initiated answer sheets", async () => {
      jest.spyOn(service, "findOne").mockResolvedValueOnce({
        status: "published",
        answerSheets: Promise.resolve([{}, {}] as AnswerSheet[]),
      } as Exam);

      jest.spyOn(service, "getDaysRemaining").mockResolvedValueOnce({
        daysRemaining: -1,
      });

      mockExamInvitationService.findPending.mockResolvedValueOnce([]);

      await service.switchStatus(
        expect.any(Number),
        expect.any(Number),
        "archived"
      );

      expect(mockAnswerSheetService.start).toHaveBeenCalledTimes(2);
      expect(mockAnswerSheetService.submit).toHaveBeenCalledTimes(2);
    });
  });

  describe("getDaysRemaining method", () => {
    it("should return the number of days remaining before exam can be archived (given by max days for answer sheet submission)", async () => {
      jest.spyOn(service, "findOne").mockResolvedValueOnce({
        answerSheets: Promise.resolve([
          { deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2) },
          { deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 1) },
        ] as AnswerSheet[]),
      } as Exam);

      await expect(
        service.getDaysRemaining(expect.any(Number), expect.any(Number))
      ).resolves.toEqual({ daysRemaining: 60 * 60 * 24 * 2 });

      jest.spyOn(service, "findOne").mockResolvedValueOnce({
        answerSheets: Promise.resolve([] as AnswerSheet[]),
      } as Exam);

      await expect(
        service.getDaysRemaining(expect.any(Number), expect.any(Number))
      ).resolves.toEqual({ daysRemaining: 0 });
    });
  });

  describe("sendInvitations", () => {
    it("should throw an error if exam is not in published", async () => {
      jest
        .spyOn(service, "findOne")
        .mockResolvedValueOnce({ status: "draft" } as Exam);

      await expect(
        service.sendInvitations(expect.any(Number), expect.any(Number), {
          email: [expect.any(String)],
          expirationInHours: expect.any(Number),
        })
      ).rejects.toThrow("Exam is not published. Process was aborted.");
    });

    it("should throw an error in any of the invitees is already enrolled", async () => {
      jest
        .spyOn(service, "findOne")
        .mockResolvedValueOnce({ status: "published" } as Exam);

      mockRepository.getOne.mockResolvedValueOnce(expect.any(String));

      await expect(
        service.sendInvitations(expect.any(Number), expect.any(Number), {
          email: [expect.any(String)],
          expirationInHours: expect.any(Number),
        })
      ).rejects.toThrow(
        "Email address is already enrolled in exam. No invitation was sent. Process was aborted."
      );
    });

    it("should send invitations to invitees", async () => {
      jest
        .spyOn(service, "findOne")
        .mockResolvedValueOnce({ status: "published" } as Exam)
        .mockResolvedValueOnce(null);

      mockRepository.getOne.mockResolvedValueOnce(undefined);

      await expect(
        service.sendInvitations(expect.any(Number), expect.any(Number), {
          email: [expect.any(String)],
          expirationInHours: expect.any(Number),
        })
      ).resolves.toEqual("Invitations sent to 1 email addresses.");
    });
  });

  describe("enrollUser", () => {
    it("should enroll user in exam", async () => {
      jest.spyOn(service, "findOne").mockResolvedValueOnce({} as Exam);

      await expect(
        service.enrollUser({} as Exam, {} as User)
      ).resolves.not.toBeUndefined();

      expect(mockRepository.of).toHaveBeenCalled();
      expect(mockRepository.add).toHaveBeenCalled();
      expect(mockRepository.relation).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe("fetchCandidates", () => {
    it("should return an array of candidates", async () => {
      jest.spyOn(service, "findOne").mockResolvedValueOnce({} as Exam);

      function createMockExamInvitation(
        accepted: boolean | null,
        createdAtOffset: number
      ) {
        const commonUserProps = {
          name: expect.any(String),
          nickname: expect.any(String),
          logo: expect.any(String),
        };

        return {
          id: expect.any(Number),
          email: expect.any(String),
          user: Promise.resolve(commonUserProps),
          accepted,
          createdAt: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * createdAtOffset
          ),
          expirationInHours: 36,
          answerSheet: Promise.resolve({
            id: expect.any(Number),
            aiScore: expect.any(Number),
          }),
        };
      }

      mockExamInvitationService.findAll.mockResolvedValueOnce([
        createMockExamInvitation(true, 3),
        createMockExamInvitation(false, 2),
        createMockExamInvitation(null, 1),
        createMockExamInvitation(true, 3),
        createMockExamInvitation(false, 2),
        createMockExamInvitation(null, 1),
      ]);

      mockRepository.getMany.mockResolvedValueOnce([]);

      await expect(
        service.fetchCandidates(expect.any(Number), expect.any(Number))
      ).resolves.not.toBeUndefined();

      expect(service.findOne).toHaveBeenCalled();
      expect(mockExamInvitationService.findAll).toHaveBeenCalled();
    });
  });

  describe("findSimilarSections", () => {
    it("should return an empty array when no similar exams are found in 'general' mode", async () => {
      jest
        .spyOn(service, "findOne")
        .mockReset()
        .mockResolvedValueOnce({
          jobTitle: expect.any(String),
          jobLevel: expect.any(String),
        } as Exam);

      mockRepository.getMany.mockResolvedValueOnce([]);

      await expect(
        service.findSimilarSections(
          expect.any(Number),
          expect.any(Number),
          "general"
        )
      ).resolves.toEqual([]);

      expect(service.findOne).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.getMany).toHaveBeenCalled();
      expect(mockRepository.where).toHaveBeenCalledWith(
        "exam.jobTitle = :jobTitle",
        { jobTitle: expect.any(String) }
      );
      expect(mockRepository.andWhere).toHaveBeenNthCalledWith(
        1,
        "exam.jobLevel = :jobLevel",
        { jobLevel: expect.any(String) }
      );
      expect(mockRepository.andWhere).toHaveBeenNthCalledWith(
        2,
        "exam.id != :examId",
        { examId: expect.any(Number) }
      );
    });

    it("should return an array of similar sections when similar exams are found in 'general' mode", async () => {
      jest
        .spyOn(service, "findOne")
        .mockReset()
        .mockResolvedValueOnce({
          jobTitle: expect.any(String),
          jobLevel: expect.any(String),
        } as Exam);

      mockRepository.getMany
        .mockReset()
        .mockResolvedValueOnce([{ id: expect.any(Number) }]);

      mockRepository.loadMany.mockResolvedValue([
        {
          id: expect.any(Number),
          name: expect.any(String),
          description: expect.any(String),
        },
      ]);

      await expect(
        service.findSimilarSections(
          expect.any(Number),
          expect.any(Number),
          "general"
        )
      ).resolves.toEqual([
        {
          description: expect.any(String),
          id: expect.any(Number),
          name: expect.any(String),
        },
      ]);

      expect(service.findOne).toHaveBeenCalled();
      expect(mockRepository.loadMany).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("exam");
      expect(mockRepository.relation).toHaveBeenCalledWith(Exam, "sections");
      expect(mockRepository.of).toHaveBeenCalledWith({
        id: expect.any(Number),
      });
    });

    it("should return an array with all sections from a given exam when in 'strict' mode", async () => {
      jest
        .spyOn(service, "findOne")
        .mockReset()
        .mockResolvedValueOnce({
          jobTitle: expect.any(String),
          jobLevel: expect.any(String),
        } as Exam);

      mockRepository.loadMany.mockResolvedValue([
        {
          id: expect.any(Number),
          name: expect.any(String),
          description: expect.any(String),
        },
      ]);

      await expect(
        service.findSimilarSections(
          expect.any(Number),
          expect.any(Number),
          "strict"
        )
      ).resolves.toBeDefined();
    });
  });

  describe("manageVectorStore", () => {
    it("should upsert exam metadata in vector store", async () => {
      await expect(
        service.manageVectorStore(
          "upsert",
          expect.any(String),
          expect.any(Number)
        )
      ).resolves.toBeUndefined();

      expect(service.vectorStore.index).toHaveBeenCalled();
      expect(OpenAIEmbeddings).toHaveBeenCalled();
    });

    it("should delete exam metadata from vector store", async () => {
      await expect(
        service.manageVectorStore(
          "delete",
          expect.any(String),
          expect.any(Number)
        )
      ).resolves.toBeUndefined();

      expect(service.vectorStore.index).toHaveBeenCalled();
    });
  });
});
