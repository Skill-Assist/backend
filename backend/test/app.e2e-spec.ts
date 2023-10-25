/**
 * container setup:
 *
 * docker run --name mysql -p 3306:3306
 * -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=db
 * -d mysql:latest
 *
 * docker run --name mongodb -p 27017:27017 -d mongo:latest
 */

/** nestjs */
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

/** external dependencies */
import * as request from "supertest";

/** modules */
import { AppModule } from "../src/app.module";
////////////////////////////////////////////////////////////////////////////////

/** --- setup ----------------------------------------------------------------*/
let app: INestApplication;

beforeAll(async () => {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();

  await app.init();
});

/** --- teardown -------------------------------------------------------------*/
afterAll(async () => {
  await app.close();
});

/** --- test suite -----------------------------------------------------------*/
describe("Application (e2e)", () => {
  let accessTokenArr: string[] = [];

  it("should be defined", () => {
    expect(app).toBeDefined();
  });

  describe("User registration and onboarding", () => {
    it("should create five new recruiters with minimal information and return their access tokens and user roles", async () => {
      const initialTokenArrayLength = accessTokenArr.length;

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post("/auth/signup")
          .send({
            email: `recruiter-${initialTokenArrayLength + i}@example.com`,
            password: "password",
            passwordConfirm: "password",
            roles: ["recruiter"],
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toMatchObject({
              access_token: expect.any(String),
              userRole: ["recruiter"],
            });
          })
          .then((res) => accessTokenArr.push(res.body.access_token));
      }

      expect(accessTokenArr.length).toBe(initialTokenArrayLength + 5);
    });

    it("should create five new candidates with minimal information and return their access tokens and user roles", async () => {
      const initialTokenArrayLength = accessTokenArr.length;

      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post("/auth/signup")
          .send({
            email: `candidate-${initialTokenArrayLength + i}@example.com`,
            password: "password",
            passwordConfirm: "password",
            roles: ["candidate"],
          })
          .expect(201)
          .expect((res) => {
            expect(res.body).toMatchObject({
              access_token: expect.any(String),
              userRole: ["candidate"],
            });
          })
          .then((res) => accessTokenArr.push(res.body.access_token));
      }

      expect(accessTokenArr.length).toBe(initialTokenArrayLength + 5);
    });

    it("should create a new recruiter and set nickname to 'Recrutador' if name is provided but nickname is not", async () => {
      const initialTokenArrayLength = accessTokenArr.length;

      await request(app.getHttpServer())
        .post("/auth/signup")
        .send({
          name: "Test Recruiter",
          email: `recruiter-${initialTokenArrayLength}@example.com`,
          password: "password",
          passwordConfirm: "password",
          roles: ["recruiter"],
        })
        .expect(201)
        .then((res) => accessTokenArr.push(res.body.access_token));

      expect(accessTokenArr.length).toBe(initialTokenArrayLength + 1);

      await request(app.getHttpServer())
        .get("/user/profile")
        .set(
          "Authorization",
          `Bearer ${accessTokenArr[accessTokenArr.length - 1]}`
        )
        .expect(200)
        .expect((res) => expect(res.body.nickname).toBe("Recrutador"));
    });

    it("should create a new candidate and set nickname to first name if name is provided but nickname is not", async () => {
      const initialTokenArrayLength = accessTokenArr.length;

      await request(app.getHttpServer())
        .post("/auth/signup")
        .send({
          name: "Test Candidate",
          email: `candidate-${initialTokenArrayLength}@example.com`,
          password: "password",
          passwordConfirm: "password",
          roles: ["candidate"],
        })
        .expect(201)
        .then((res) => accessTokenArr.push(res.body.access_token));

      expect(accessTokenArr.length).toBe(initialTokenArrayLength + 1);

      await request(app.getHttpServer())
        .get("/user/profile")
        .set(
          "Authorization",
          `Bearer ${accessTokenArr[accessTokenArr.length - 1]}`
        )
        .expect(200)
        .expect((res) => expect(res.body.nickname).toBe("Test"));
    });

    it("should sign in an user and return an object containing an access token and the user role", async () => {
      await request(app.getHttpServer())
        .post("/auth/signin")
        .send({
          email: "recruiter-0@example.com",
          password: "password",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toMatchObject({
            access_token: expect.any(String),
            userRole: ["recruiter"],
          });
        })
        .then((res) => (accessTokenArr[0] = res.body.access_token));
    });
  });

  describe("Profile customization", () => {
    it("should return the current user's profile based on access token", async () => {
      await request(app.getHttpServer())
        .get("/user/profile")
        .set("Authorization", `Bearer ${accessTokenArr[0]}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body).toMatchObject({
            id: expect.any(Number),
            name: null,
            nickname: null,
            email: "recruiter-0@example.com",
            mobilePhone: null,
            nationalId: null,
            logo: "https://i.imgur.com/6VBx3io.png",
            roles: ["recruiter"],
            ownedQuestions: [],
            ownedExamsRef: [],
          });
        });
    });

    it("should update current user's profile based on access token", async () => {
      const payload = {
        name: "Test User",
        nickname: "Test",
        mobilePhone: "123456789",
        nationalId: "123456789",
      };

      await request(app.getHttpServer())
        .patch("/user/updateProfile")
        .set("Authorization", `Bearer ${accessTokenArr[0]}`)
        .send(payload)
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body).toMatchObject(payload);
        });
    });

    it("should accept a new profile picture and return the updated profile", async () => {
      await request(app.getHttpServer())
        .patch("/user/updateProfile")
        .set("Authorization", `Bearer ${accessTokenArr[0]}`)
        .attach("file", "test/assets/profile-picture.jpg")
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeDefined();
          expect(res.body).toMatchObject({
            logo: expect.not.stringContaining(
              "https://i.imgur.com/6VBx3io.png"
            ),
          });
        });
    });
  });

  describe("Exam creation and configuration", () => {
    describe("Functional requirements", () => {
      it("should suggest an exam description based on a Job Title and a Job Level", async () => {});

      it("should not suggest an exam description if called by a candidate", async () => {});

      it("should throw an exception if the job title is too short or too long", async () => {
        // await expect(
        //   controller.suggestDescription({
        //     jobTitle: "",
        //     jobLevel: "estágio",
        //   })
        // ).rejects.toThrow();
        // await expect(
        //   controller.suggestDescription({
        //     jobTitle: "a".repeat(51),
        //     jobLevel: "estágio",
        //   })
        // ).rejects.toThrow();
      });

      it("should trim the job title before using it to generate the description", async () => {
        // await expect(
        //   controller.suggestDescription({
        //     jobTitle: "  Test title  ",
        //     jobLevel: "estágio",
        //   })
        // ).resolves.toEqual("Suggested description");
      });

      it("should throw an exception if the job level is not one of the allowed values", async () => {
        // ["estágio", "trainee", "júnior", "pleno", "sênior", "outro"]
        // await expect(
        //   controller.suggestDescription({
        //     jobTitle: "Test title",
        //     jobLevel: "invalid",
        //   })
        // ).rejects.toThrow();
      });

      it("should create a new exam and return it", async () => {});

      it("should update an existing exam and return it", async () => {});

      it("should delete an existing exam and return it", async () => {});

      it("should find an existing exam and return it", async () => {});

      it("should return a list of all exams created by the current user", async () => {});
    });

    describe("Non-functional requirements", () => {
      it("POST /exam/suggestDescription should respond within predefined latency limits", async () => {});
    });
  });

  describe("Section management and organization", () => {});
  describe("Question bank and content upload", () => {});
  describe("Exam scheduling and enrollment", () => {});
  describe("Taking an exam and answering questions", () => {});
  describe("Grading and results reporting", () => {});
  describe("Feedback and review process", () => {});
  describe("User log-off and data privacy", () => {});
});
