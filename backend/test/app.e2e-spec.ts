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
  let access_token: string;

  it("should be defined", () => {
    expect(app).toBeDefined();
  });

  describe("Auth Module", () => {
    describe("POST /auth/signup", () => {
      it("should create a new user", async () => {
        await request(app.getHttpServer())
          .post("/auth/signup")
          .send({
            email: "user@example.com",
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
          .then((res) => (access_token = res.body.access_token));
      });
    });

    describe("POST /auth/signin", () => {
      it("should return a jwt token", async () => {
        await request(app.getHttpServer())
          .post("/auth/signin")
          .send({
            email: "user@example.com",
            password: "password",
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toMatchObject({
              access_token: expect.any(String),
              userRole: ["recruiter"],
            });
          })
          .then((res) => (access_token = res.body.access_token));
      });
    });
  });

  describe("User Module", () => {
    describe("GET /user/profile", () => {
      it("should return a user profile", async () => {
        await request(app.getHttpServer())
          .get("/user/profile")
          .set("Authorization", `Bearer ${access_token}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toBeDefined();
            expect(res.body).toMatchObject({
              id: expect.any(Number),
              name: null,
              nickname: null,
              email: "user@example.com",
              mobilePhone: null,
              nationalId: null,
              logo: "https://i.imgur.com/6VBx3io.png",
              roles: ["recruiter"],
              ownedQuestions: [],
              ownedExamsRef: [],
            });
          });
      });
    });

    describe("PATCH /user/updateProfile", () => {
      it("should update a user profile", async () => {
        await request(app.getHttpServer())
          .patch("/user/updateProfile")
          .set("Authorization", `Bearer ${access_token}`)
          .send({
            name: "Test User",
          })
          .expect(200)
          .expect((res) => {
            expect(res.body).toBeDefined();
            expect(res.body).toMatchObject({
              name: "Test User",
              // nickname: "Recrutador",
            });
          });
      });
    });
  });
});
