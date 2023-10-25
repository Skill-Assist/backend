/** nestjs */
import { Test, TestingModule } from "@nestjs/testing";

/** controllers */
import { ExamController } from "./exam.controller";

/** providers */
import { ExamService } from "./exam.service";
// ////////////////////////////////////////////////////////////////////////////////

/** --- mock providers -------------------------------------------------------*/
const mockExamService: Partial<ExamService> = {
  suggestDescription: jest
    .fn()
    .mockReturnValue(Promise.resolve("Suggested description")),
};

/** --- setup ----------------------------------------------------------------*/
let controller: ExamController;

beforeAll(async () => {
  // initialize test module
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [ExamController],
    providers: [{ provide: ExamService, useValue: mockExamService }],
  }).compile();

  // initialize controller
  controller = moduleRef.get<ExamController>(ExamController);
});

// /** --- test suite -----------------------------------------------------------*/
describe("ExamController", () => {
  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST /suggestDescription endpoint", () => {
    it("should return a suggestion for an exam's description based on job title and job level", async () => {
      await expect(
        controller.suggestDescription({
          jobTitle: "",
          jobLevel: "",
        })
      ).resolves.toEqual("Suggested description");
    });
  });
});
