/** nestjs */
import { Test, TestingModule } from "@nestjs/testing";

/** controllers */
import { ExamController } from "./exam.controller";

/** providers */
import { ExamService } from "./exam.service";

/** utils */
import { PassportRequest } from "../utils/api-types.utils";
////////////////////////////////////////////////////////////////////////////////

/** --- mock data ------------------------------------------------------------*/
const mockCreateExamDto = {
  jobTitle: expect.any(String),
  jobLevel: "trainee",
  description: expect.any(String),
  durationInHours: expect.any(Number),
  submissionInHours: expect.any(Number),
  showScore: expect.any(Boolean),
  isPublic: expect.any(Boolean),
};

/** --- mock providers -------------------------------------------------------*/
const mockExamService = {
  create: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  findOne: jest.fn().mockReturnThis(),
  fetchOwn: jest.fn().mockReturnThis(),
  switchStatus: jest.fn().mockReturnThis(),
  fetchCandidates: jest.fn().mockReturnThis(),
  sendInvitations: jest.fn().mockReturnThis(),
  getDaysRemaining: jest.fn().mockReturnThis(),
  suggestDescription: jest.fn().mockReturnThis(),
};

/** --- setup ----------------------------------------------------------------*/
let controller: ExamController;

beforeAll(async () => {
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [ExamController],
    providers: [{ provide: ExamService, useValue: mockExamService }],
  }).compile();

  controller = moduleRef.get<ExamController>(ExamController);
});

/** --- test suite -----------------------------------------------------------*/
describe("ExamController", () => {
  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST / endpoint", () => {
    it("should create an exam", async () => {
      mockExamService.create.mockResolvedValueOnce({
        id: expect.any(Number),
        ...mockCreateExamDto,
      });

      await expect(
        controller.create(
          { user: { id: expect.any(Number) } } as PassportRequest,
          mockCreateExamDto
        )
      ).resolves.toEqual({
        id: expect.any(Number),
        ...mockCreateExamDto,
      });
    });
  });

  describe("PATCH / endpoint", () => {
    it("should update an exam", async () => {
      mockExamService.update.mockResolvedValueOnce({
        id: expect.any(Number),
        ...mockCreateExamDto,
        ...{ jobLevel: "júnior" },
      });

      await expect(
        controller.update(
          { user: { id: expect.any(Number) } } as PassportRequest,
          expect.any(Number),
          { jobLevel: "júnior" }
        )
      ).resolves.toEqual({
        id: expect.any(Number),
        ...mockCreateExamDto,
        ...{ jobLevel: "júnior" },
      });
    });
  });

  describe("DELETE / endpoint", () => {
    it("should delete an exam", async () => {
      mockExamService.delete.mockResolvedValueOnce(undefined);

      await expect(
        controller.delete(
          { user: { id: expect.any(Number) } } as PassportRequest,
          expect.any(Number)
        )
      ).resolves.toBeUndefined();
    });
  });

  describe("GET /findOne endpoint", () => {
    it("should return null if no exam was found", async () => {
      mockExamService.findOne.mockResolvedValueOnce(null);

      await expect(
        controller.findOne(
          { user: { id: expect.any(Number) } } as PassportRequest,
          "id",
          expect.any(Number)
        )
      ).resolves.toBeNull();
    });

    it("should return an exam", async () => {
      mockExamService.findOne.mockResolvedValueOnce({
        id: expect.any(Number),
        ...mockCreateExamDto,
      });

      await expect(
        controller.findOne(
          { user: { id: expect.any(Number) } } as PassportRequest,
          "id",
          expect.any(Number)
        )
      ).resolves.toEqual({
        id: expect.any(Number),
        ...mockCreateExamDto,
      });
    });

    it("should return an exam with relations", async () => {
      mockExamService.findOne.mockResolvedValueOnce({
        id: expect.any(Number),
        ...mockCreateExamDto,
      });

      await controller.findOne(
        { user: { id: expect.any(Number) } } as PassportRequest,
        "id",
        expect.any(Number),
        "x,y,z"
      );

      expect(mockExamService.findOne).toHaveBeenCalledWith(
        expect.any(Number),
        "id",
        expect.any(Number),
        ["x", "y", "z"],
        undefined
      );
    });

    it("should return an exam with mapped relations", async () => {
      mockExamService.findOne.mockResolvedValueOnce({
        id: expect.any(Number),
        ...mockCreateExamDto,
      });

      await controller.findOne(
        { user: { id: expect.any(Number) } } as PassportRequest,
        "id",
        expect.any(Number),
        "x,y,z",
        true
      );

      expect(mockExamService.findOne).toHaveBeenCalledWith(
        expect.any(Number),
        "id",
        expect.any(Number),
        ["x", "y", "z"],
        true
      );
    });
  });

  describe("POST /suggestDescription endpoint", () => {
    it("should return a suggestion for an exam's description based on job title and job level", async () => {
      mockExamService.suggestDescription.mockResolvedValueOnce(
        "Suggested description"
      );

      await expect(
        controller.suggestDescription({
          jobTitle: expect.any(String),
          jobLevel: expect.any(String),
        })
      ).resolves.toEqual("Suggested description");
    });
  });

  describe("GET /fetchOwn endpoint", () => {
    it("should return an array of exams", async () => {
      mockExamService.fetchOwn.mockResolvedValueOnce([
        {
          id: expect.any(Number),
          ...mockCreateExamDto,
        },
      ]);

      await expect(
        controller.fetchOwn({
          user: { id: expect.any(Number) },
        } as PassportRequest)
      ).resolves.toEqual([
        {
          id: expect.any(Number),
          ...mockCreateExamDto,
        },
      ]);
    });
  });

  describe("GET /switchStatus endpoint", () => {
    it("should return a string", async () => {
      mockExamService.switchStatus.mockResolvedValueOnce("string");

      await expect(
        controller.switchStatus(
          { user: { id: expect.any(Number) } } as PassportRequest,
          expect.any(Number),
          expect.any(String)
        )
      ).resolves.toEqual("string");
    });
  });

  describe("GET /getDaysRemaining endpoint", () => {
    it("should return an object with a number", async () => {
      mockExamService.getDaysRemaining.mockResolvedValueOnce({
        daysRemaining: expect.any(Number),
      });

      await expect(
        controller.getDaysRemaining(
          { user: { id: expect.any(Number) } } as PassportRequest,
          expect.any(Number)
        )
      ).resolves.toEqual({
        daysRemaining: expect.any(Number),
      });
    });
  });

  describe("POST /sendInvitations endpoint", () => {
    it("should return a string", async () => {
      mockExamService.sendInvitations.mockResolvedValueOnce("string");

      await expect(
        controller.sendInvitations(
          { user: { id: expect.any(Number) } } as PassportRequest,
          expect.any(Number),
          expect.any(Object)
        )
      ).resolves.toEqual("string");
    });
  });

  describe("GET /fetchCandidates endpoint", () => {
    it("should return an array of candidates", async () => {
      mockExamService.fetchCandidates.mockResolvedValueOnce([{}]);

      await expect(
        controller.fetchCandidates(
          { user: { id: expect.any(Number) } } as PassportRequest,
          expect.any(Number)
        )
      ).resolves.toEqual([{}]);
    });
  });
});
