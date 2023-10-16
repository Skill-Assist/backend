/** nestjs */
import { Test, TestingModule } from "@nestjs/testing";

/** controllers */
import { UserController } from "./user.controller";

/** providers */
import { UserService } from "./user.service";

/** entities */
import { User } from "./entities/user.entity";

/** dtos */
import { UpdateUserDto } from "./dto/update-user.dto";

/** utils */
import { PassportRequest } from "../utils/api-types.utils";
import {
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
////////////////////////////////////////////////////////////////////////////////

/** global test variables */
let controller: UserController;

/** mock data */
const mockUser = {
  id: 1,
  email: "user@example.com",
  password: "Test1234!",
  logo: "https://url.com.png",
  roles: ["recruiter"],
  ownedQuestions: [],
} as Partial<User>;

const mockUpdateUserDto = {
  name: "John Doe",
} as UpdateUserDto;

const mockRequest = {
  user: {
    id: 1,
  },
} as PassportRequest;

/** setup */
beforeAll(async () => {
  const mockUserService: Partial<UserService> = {
    profile: jest.fn().mockImplementation((mockRequest: PassportRequest) => {
      return Promise.resolve(mockUser);
    }),

    // prettier-ignore
    updateProfile: jest
      .fn()
      .mockImplementation(
        (mockRequest: PassportRequest, 
         mockUpdateUserDto: UpdateUserDto, 
         mockUploadedFile: Express.Multer.File) => {
          return Promise.resolve({ ...mockUser, ...mockUpdateUserDto });
        }
      ),

    acceptInvitation: jest
      .fn()
      .mockImplementation((invitationId: number, user: User) => {
        return Promise.resolve(mockUser);
      }),

    rejectInvitation: jest
      .fn()
      .mockImplementation((invitationId: number, user: User) => {
        return Promise.resolve(mockUser);
      }),
  };

  // initialize test module
  const moduleRef: TestingModule = await Test.createTestingModule({
    controllers: [UserController],
    providers: [{ provide: UserService, useValue: mockUserService }],
  }).compile();

  // initialize controller
  controller = moduleRef.get<UserController>(UserController);
});

/** test suite */
describe("UserController", () => {
  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("profile method", () => {
    it("should return a user profile", async () => {
      await expect(controller.profile(mockRequest)).resolves.toEqual(mockUser);
    });
  });

  describe("updateProfile method", () => {
    it("should throw an error if no data is provided", () => {
      try {
        expect(controller.updateProfile(mockRequest));

        // if no error is thrown, then the test fails
        fail("expected error to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(UnauthorizedException);
        expect(err.message).toEqual("No data provided");
      }
    });

    it("should throw an error if file is not an image", async () => {
      try {
        expect(
          controller.updateProfile(mockRequest, undefined, {
            mimetype: "application/pdf",
          } as Express.Multer.File)
        );

        //  if no error is thrown, then the test fails
        fail("expected error to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(UnprocessableEntityException);
        expect(err.message).toEqual("File must be an image and less than 10MB");
      }
    });

    it("should throw an error if file is an image larger than 10MB", async () => {
      try {
        expect(
          controller.updateProfile(mockRequest, undefined, {
            mimetype: "image/png",
            size: 100000000,
          } as Express.Multer.File)
        );

        // if no error is thrown, then the test fails
        fail("expected error to be thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(UnprocessableEntityException);
        expect(err.message).toEqual("File must be an image and less than 10MB");
      }
    });

    it("should return an updated user profile", async () => {
      await expect(
        controller.updateProfile(mockRequest, mockUpdateUserDto)
      ).resolves.toEqual({ ...mockUser, ...mockUpdateUserDto });
    });
  });

  describe("acceptInvitation method", () => {
    it("should return a user profile", async () => {
      await expect(
        controller.acceptInvitation(mockRequest, 1)
      ).resolves.toEqual(mockUser);
    });
  });
});
