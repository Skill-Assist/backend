/** nestjs */
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Test, TestingModule } from "@nestjs/testing";

/** external dependencies */
import * as path from "path";
import { promises as fs } from "fs";

/** providers */
import { UserService } from "./user.service";
import { AwsService } from "../aws/aws.service";
import { ExamService } from "../exam/exam.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";
import { AnswerSheetService } from "../answer-sheet/answer-sheet.service";
import { ExamInvitationService } from "../exam-invitation/exam-invitation.service";

/** entities */
import { User } from "./entities/user.entity";
////////////////////////////////////////////////////////////////////////////////

/** --- mock data ------------------------------------------------------------*/
const mockUser: Partial<User> = {
  id: 1,
  email: "user@example.com",
  password: "Test1234!",
  roles: ["recruiter"],
  ownedQuestions: [],
};

const mockUserDB: Partial<User>[] = [mockUser];

/** --- mock providers -------------------------------------------------------*/
const mockRepository = {
  set: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  leftJoinAndMapOne: jest.fn().mockReturnThis(),
  createQueryBuilder: jest.fn().mockReturnThis(),
  leftJoinAndMapMany: jest.fn().mockReturnThis(),
  loadRelationIdAndMap: jest.fn().mockReturnThis(),
  create: jest.fn().mockImplementation(function (this: any) {
    const { email, password, roles, ownedQuestions } =
      this.create.mock.lastCall[0];

    const user = {
      id: mockUserDB.length + 1,
      email,
      password,
      roles,
      ownedQuestions,
    };
    mockUserDB.push(user);

    return user;
  }),
  execute: jest.fn().mockImplementation(function (this: any) {
    const { id } = this.where.mock.lastCall[1];
    const updateDto = Object.entries(this.set.mock.lastCall[0]);

    const user = mockUserDB.find((u: User) => u.id === id);
    if (!user)
      return Promise.resolve({
        affected: 0,
      });

    updateDto.forEach(([key, value]) => {
      key === "ownedQuestions"
        ? (value as any[]).forEach((q: any) => (user as any)[key].push(q))
        : ((user as any)[key] = value);
    });

    return Promise.resolve({ affected: 1 });
  }),
  getOne: jest.fn().mockImplementation(function (this: any) {
    const lastCallKey = Object.keys(this.where.mock.lastCall[1])[0];
    const lastCallValue = Object.values(this.where.mock.lastCall[1])[0];

    const user = mockUserDB.find(
      (u: User) => (u as any)[lastCallKey] === lastCallValue
    );

    return user || null;
  }),
};

const mockQueryRunner = {
  connect: jest.fn().mockReturnThis(),
  release: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),
  commitTransaction: jest.fn().mockReturnThis(),
  rollbackTransaction: jest.fn().mockReturnThis(),
};

const mockExamInvitationService = {
  update: jest.fn().mockReturnThis(),
  reject: jest.fn().mockReturnThis(),
  findPending: jest.fn().mockResolvedValue([{ id: 1 }]),
  accept: jest.fn().mockImplementation(() => Promise.resolve({ exam: "test" })),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue("test"),
};

const mockExamService = {
  enrollUser: jest.fn().mockReturnThis(),
};

const mockAnswerSheetService = {
  create: jest.fn().mockReturnThis(),
};

const mockAwsService = {
  uploadFileToS3: jest.fn().mockReturnThis(),
};

/** --- setup ----------------------------------------------------------------*/
let service: UserService;

const originalCreateMock = mockRepository.create;
const originalEnv = mockConfigService.get;

beforeAll(async () => {
  const moduleRef: TestingModule = await Test.createTestingModule({
    providers: [
      UserService,
      {
        provide: getRepositoryToken(User),
        useValue: mockRepository,
      },
      { provide: AwsService, useValue: mockAwsService },
      { provide: ExamService, useValue: mockExamService },
      { provide: ConfigService, useValue: mockConfigService },
      { provide: QueryRunnerService, useValue: mockQueryRunner },
      { provide: AnswerSheetService, useValue: mockAnswerSheetService },
      { provide: ExamInvitationService, useValue: mockExamInvitationService },
    ],
  }).compile();

  service = moduleRef.get<UserService>(UserService);
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  mockRepository.create = jest.fn().mockImplementation(originalCreateMock);
  mockConfigService.get = jest.fn().mockImplementation(originalEnv);
});

/** --- test suite -----------------------------------------------------------*/
describe("UserService", () => {
  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create method", () => {
    it("should throw an error if email already exists", async () => {
      await expect(
        service.create({
          email: "user@example.com",
          password: "Test1234!",
          passwordConfirm: "Test1234!",
          roles: ["recruiter"],
        })
      ).rejects.toThrowError("Email already exists");
    });

    it("should throw an error if multiple roles are provided", async () => {
      await expect(
        service.create({
          email: "user1@example.com",
          password: "Test1234!",
          passwordConfirm: "Test1234!",
          roles: ["recruiter", "candidate"],
        })
      ).rejects.toThrowError("Multiple roles are not implemented yet");
    });

    it("should create a user", async () => {
      const partialPayload = {
        email: "user1@example.com",
        password: "Test1234!",
        roles: ["recruiter"],
      };

      const payload = {
        ...partialPayload,
        passwordConfirm: "Test1234!",
      };

      expect(await service.create(payload)).toEqual({
        ...partialPayload,
        ownedQuestions: [],
        id: mockUserDB.length,
      });

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...payload,
        ownedQuestions: [],
      });
    });

    it("if user is candidate, should check for pending invitations and set relation between invitation and user", async () => {
      const payload = {
        email: "user2@example.com",
        password: "Test1234!",
        passwordConfirm: "Test1234!",
        roles: ["candidate"],
      };

      const user = await service.create(payload);

      expect(mockExamInvitationService.findPending).toHaveBeenCalledWith(
        "email",
        "user2@example.com"
      );
      expect(mockExamInvitationService.update).toHaveBeenCalledWith(
        user.id,
        1,
        {
          user,
        }
      );
    });

    it("should rollback gracefully in case of error", async () => {
      mockRepository.create.mockImplementation(() => {
        throw new Error("Something went wrong");
      });

      await expect(
        service.create({
          email: "fail@example.com",
          password: "Test1234!",
          passwordConfirm: "Test1234!",
          roles: ["recruiter"],
        })
      ).rejects.toThrowError("Something went wrong");

      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe("update method", () => {
    it("should update a user based on provided update dto", async () => {
      expect(
        await service.update(mockUser.id!, {
          nickname: "Test User",
        })
      ).toEqual({
        ...mockUser,
        nickname: "Test User",
      });
    });

    it("should throw an error if user is not found", async () => {
      await expect(
        service.update(999, {
          nickname: "Test User",
        })
      ).rejects.toThrowError("User not found.");
    });
  });

  describe("findOne method", () => {
    it("should return a user if found", async () => {
      const result = await service.findOne("email", "user@example.com");
      expect(result).toEqual(mockUser);

      expect(mockRepository.getOne).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("user");
      expect(mockRepository.where).toHaveBeenCalledWith("user.email = :email", {
        email: "user@example.com",
      });
    });

    it("should return null if no user is found", async () => {
      const result = await service.findOne("email", "user@test.com");
      expect(result).toBeNull();
    });

    it("should return a user with relations", async () => {
      await service.findOne("email", "user@example.com", ["", "", "", ""]);

      expect(mockRepository.loadRelationIdAndMap).toHaveBeenCalledTimes(4);
      expect(mockRepository.leftJoinAndSelect).toHaveBeenCalledTimes(0);
    });

    it("should return a user with relations mapped", async () => {
      await service.findOne(
        "email",
        "user@example.com",
        ["", "", "", ""],
        true
      );

      expect(mockRepository.leftJoinAndSelect).toHaveBeenCalledTimes(4);
      expect(mockRepository.loadRelationIdAndMap).toHaveBeenCalledTimes(0);
    });
  });

  describe("profile method", () => {
    it("should return the profile of a recruiter", async () => {
      const user = await service.profile(mockUser.id!);
      expect(user).toBeDefined();

      expect(mockRepository.leftJoinAndMapMany).toHaveBeenCalledWith(
        "user.ownedExamsRef",
        "user.ownedExams",
        "exam"
      );
      expect(mockRepository.where).toHaveBeenCalledWith("user.id = :id", {
        id: mockUser.id!,
      });
      expect(mockRepository.getOne).toHaveBeenCalled();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("user");
    });

    it("should return the profile of a candidate", async () => {
      const user = await service.profile(3);
      expect(user).toBeDefined();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith("user");
      expect(mockRepository.leftJoinAndMapMany).toHaveBeenCalledWith(
        "user.invitationsRef",
        "user.invitations",
        "invitations"
      );
      expect(mockRepository.leftJoinAndMapOne).toHaveBeenCalledTimes(3);
      expect(mockRepository.leftJoinAndMapOne).toHaveBeenNthCalledWith(
        1,
        "invitations.examRef",
        "invitations.exam",
        "exam"
      );
      expect(mockRepository.leftJoinAndMapOne).toHaveBeenNthCalledWith(
        2,
        "exam.createdByRef",
        "exam.createdBy",
        "createdBy"
      );
      expect(mockRepository.leftJoinAndMapOne).toHaveBeenNthCalledWith(
        3,
        "exam.answerSheetsRef",
        "exam.answerSheets",
        "answerSheets",
        "answerSheets.user = :id",
        { id: 3 }
      );
      expect(mockRepository.where).toHaveBeenCalledWith("user.id = :id", {
        id: 3,
      });
      expect(mockRepository.getOne).toHaveBeenCalled();
    });
  });

  describe("updateProfile method", () => {
    it("should throw an error if no data is provided", async () => {
      await expect(service.updateProfile(mockUser.id!)).rejects.toThrowError(
        "Nothing to update"
      );
    });

    it("should throw an error if user is trying to update password", async () => {
      await expect(
        service.updateProfile(mockUser.id!, {
          password: "Test1234!",
          passwordConfirm: "Test1234!",
        })
      ).rejects.toThrowError("Password update is not implemented yet");
      await expect(
        service.updateProfile(mockUser.id!, {
          password: "Test1234!",
        })
      ).rejects.toThrowError("Password update is not implemented yet");
      await expect(
        service.updateProfile(mockUser.id!, {
          passwordConfirm: "Test1234!",
        })
      ).rejects.toThrowError("Password update is not implemented yet");
    });

    it("should throw an error if user is trying to update email", async () => {
      await expect(
        service.updateProfile(mockUser.id!, {
          email: "user@example.com",
        })
      ).rejects.toThrowError("Email update is not implemented yet");
    });

    it("should throw an error if user is trying to update roles", async () => {
      await expect(
        service.updateProfile(mockUser.id!, {
          roles: ["candidate"],
        })
      ).rejects.toThrowError("Roles update is not implemented yet");
    });

    it("should update a user based on provided update dto", async () => {
      expect(
        await service.updateProfile(1, {
          name: "Test User",
        })
      ).toEqual({
        ...mockUser,
        name: "Test User",
      });
    });

    it("should update a user based on provided file and store file accordingly", async () => {
      const file = {
        mimetype: "image/png",
      } as Express.Multer.File;

      // "test" environment
      expect(
        await service.updateProfile(mockUser.id!, undefined, file)
      ).toEqual({
        ...mockUser,
        logo: `https://example.com/${mockUser.id}.png`,
      });

      // "dev" environment
      mockConfigService.get.mockReturnValue("dev");
      const joinMock = jest.spyOn(path, "join");
      joinMock.mockImplementation(() => "");

      const appendFileMock = jest.spyOn(fs, "appendFile");
      appendFileMock.mockImplementation(async () => Promise.resolve());

      expect(
        await service.updateProfile(mockUser.id!, undefined, file)
      ).toEqual({
        ...mockUser,
        logo: "https://wallpapers.com/images/featured-full/cool-profile-picture-87h46gcobjl5e4xu.jpg",
      });

      expect(joinMock).toHaveBeenCalled();
      expect(appendFileMock).toHaveBeenCalled();

      joinMock.mockRestore();
      appendFileMock.mockRestore();

      // "prod" environment
      mockConfigService.get
        .mockReturnValueOnce("prod")
        .mockReturnValue("bucket");

      expect(
        await service.updateProfile(mockUser.id!, undefined, file)
      ).toEqual({
        ...mockUser,
        logo: "https://bucket.s3.sa-east-1.amazonaws.com/logo/1.png",
      });
    });

    it("should throw an error if user is not found", async () => {
      await expect(service.updateProfile(999, {})).rejects.toThrowError(
        "User not found"
      );
    });
  });

  describe("addQuestion method", () => {
    it("should add a question to user's owned questions", async () => {
      const questionDto = { ownedQuestions: ["mongoId"] };
      await service.addQuestion(mockUser.id!, questionDto);
      expect(mockUserDB[mockUser.id! - 1].ownedQuestions).toEqual(
        questionDto.ownedQuestions
      );
    });

    it("should throw an error if user is not found", async () => {
      await expect(
        service.addQuestion(999, { ownedQuestions: ["mongoId"] })
      ).rejects.toThrowError("Update failed.");
    });
  });

  describe("acceptInvitation method", () => {
    it("should accept an invitation", async () => {
      const user = await service.findOne("id", mockUser.id!);
      await service.acceptInvitation(mockUser.id!, user!);

      expect(mockExamInvitationService.accept).toHaveBeenCalled();
      expect(mockExamService.enrollUser).toHaveBeenCalled();
      expect(mockAnswerSheetService.create).toHaveBeenCalled();
    });
  });

  describe("rejectInvitation method", () => {
    it("should reject an invitation", async () => {
      const user = await service.findOne("id", mockUser.id!);
      service.rejectInvitation(mockUser.id!, user!);

      expect(mockExamInvitationService.reject).toHaveBeenCalled();
    });
  });
});
