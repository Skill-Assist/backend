/**
 * test environment setup:
 *
 * remove all vectors from Pinecone
 *
 * docker run --name mysql -p 3306:3306
 * -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=db
 * -d --rm mysql:latest
 *
 * docker run --name mongodb -p 27017:27017 -d --rm mongo:latest
 */

/** nestjs */
import {
  ValidationPipe,
  INestApplication,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";

/** external dependencies */
import * as request from "supertest";

/** modules */
import { AppModule } from "../src/app.module";

/** guards */
import { AuthorizationGuard } from "../src/auth/guards/authorization.guard";

/** --- setup ----------------------------------------------------------------*/
let app: INestApplication;

beforeAll(async () => {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    })
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalGuards(new AuthorizationGuard(app.get(Reflector)));

  await app.init();
});

/** --- teardown -------------------------------------------------------------*/
afterAll(async () => {
  await app.close();
});

/** --- test suite -----------------------------------------------------------*/
describe("Application (e2e)", () => {
  let recruiterAccessTokenArr: string[] = [];
  let candidateAccessTokenArr: string[] = [];
  let examIdArr: number[] = [];

  it("should be defined", () => {
    expect(app).toBeDefined();
  });

  describe("User registration and onboarding", () => {
    it("should create five new recruiters with minimal information and return their access tokens and user roles", async () => {
      const initialTokenArrayLength = recruiterAccessTokenArr.length;

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
          .then((res) => recruiterAccessTokenArr.push(res.body.access_token));
      }

      expect(recruiterAccessTokenArr.length).toBe(initialTokenArrayLength + 5);
    });

    it("should create five new candidates with minimal information and return their access tokens and user roles", async () => {
      const initialTokenArrayLength = candidateAccessTokenArr.length;

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
          .then((res) => candidateAccessTokenArr.push(res.body.access_token));
      }

      expect(candidateAccessTokenArr.length).toBe(initialTokenArrayLength + 5);
    });

    it("should create a new recruiter and set nickname to 'Recrutador' if name is provided but nickname is not", async () => {
      const initialTokenArrayLength = recruiterAccessTokenArr.length;

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
        .then((res) => recruiterAccessTokenArr.push(res.body.access_token));

      expect(recruiterAccessTokenArr.length).toBe(initialTokenArrayLength + 1);

      await request(app.getHttpServer())
        .get("/user/profile")
        .set(
          "Authorization",
          `Bearer ${
            recruiterAccessTokenArr[recruiterAccessTokenArr.length - 1]
          }`
        )
        .expect(200)
        .expect((res) => expect(res.body.nickname).toBe("Recrutador"));
    });

    it("should create a new candidate and set nickname to first name if name is provided but nickname is not", async () => {
      const initialTokenArrayLength = candidateAccessTokenArr.length;

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
        .then((res) => candidateAccessTokenArr.push(res.body.access_token));

      expect(candidateAccessTokenArr.length).toBe(initialTokenArrayLength + 1);

      await request(app.getHttpServer())
        .get("/user/profile")
        .set(
          "Authorization",
          `Bearer ${
            candidateAccessTokenArr[candidateAccessTokenArr.length - 1]
          }`
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
        .then((res) => (recruiterAccessTokenArr[0] = res.body.access_token));
    });
  });

  describe("Profile customization", () => {
    it("should return the current user's profile based on access token", async () => {
      await request(app.getHttpServer())
        .get("/user/profile")
        .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
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
        .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
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
        .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
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
      it(
        "should suggest five exam descriptions based on LLM model",
        async () => {
          const startTime = Date.now();

          let suggestion: string = "";
          for (let i = 0; i < 4; i++)
            await request(app.getHttpServer())
              .post("/exam/suggestDescription")
              .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
              .send({
                jobTitle: "Engenheiro de software",
                jobLevel: "estágio",
              })
              .expect(200)
              .expect((res) => expect(res.text).toBeDefined())
              .then(async (res) => (suggestion = res.text));

          const endTime = Date.now();
          const elapsedTime = endTime - startTime;

          console.log("LLM model, total elapsed time: ", elapsedTime);

          console.log(
            "LLM model, elapsed time per suggestion (sec): ",
            Math.round(elapsedTime / 1000 / 5)
          );

          await request(app.getHttpServer())
            .post("/exam")
            .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
            .send({
              jobTitle: "Engenheiro de software",
              jobLevel: "estágio",
              description: suggestion,
              durationInHours: 1.25,
              submissionInHours: 4.125,
              showScore: true,
              isPublic: true,
            })
            .expect(201)
            .then((res) => examIdArr.push(res.body.id));
        },
        5 * 1000 * 1000
      );

      it("should suggest five exam descriptions based on SQL query", async () => {
        const startTime = Date.now();

        for (let i = 0; i < 4; i++)
          await request(app.getHttpServer())
            .post("/exam/suggestDescription")
            .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
            .send({
              jobTitle: "Engenheiro de software",
              jobLevel: "estágio",
            })
            .expect(200)
            .expect((res) => expect(res.text).toBeDefined());

        const endTime = Date.now();
        const elapsedTime = endTime - startTime;

        console.log("SQL query, total elapsed time: ", elapsedTime);
        console.log(
          "SQL query, elapsed time per suggestion (sec): ",
          Math.round(elapsedTime / 1000 / 5)
        );
      });

      it(
        "should suggest five exam descriptions based on vector similarity",
        () => {
          // this timer is required due to Pinecone's eventual consistency
          setTimeout(async () => {
            const startTime = Date.now();

            for (let i = 0; i < 4; i++)
              await request(app.getHttpServer())
                .post("/exam/suggestDescription")
                .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
                .send({
                  jobTitle: "Engenheira de software",
                  jobLevel: "estágio",
                })
                .expect(200)
                .expect((res) => expect(res.text).toBeDefined());

            const endTime = Date.now();
            const elapsedTime = endTime - startTime;

            console.log("vector similarity, total elapsed time: ", elapsedTime);

            console.log(
              "vector similarity, elapsed time per suggestion (sec): ",
              Math.round(elapsedTime / 1000 / 5)
            );
          }, 10 * 1000);
        },
        5 * 1000 * 1000
      );

      it("should not suggest an exam description if called by a candidate", async () => {
        await request(app.getHttpServer())
          .post("/exam/suggestDescription")
          .set("Authorization", `Bearer ${candidateAccessTokenArr[0]}`)
          .send({
            jobTitle: "Test Job Title",
            jobLevel: "estágio",
          })
          .expect(401);
      });

      it("should throw an exception if the job title is too long", async () => {
        await request(app.getHttpServer())
          .post("/exam")
          .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
          .send({
            jobTitle: "a".repeat(51),
            jobLevel: "estágio",
            description: "Test description",
            durationInHours: 1.25,
            submissionInHours: 4.125,
            showScore: true,
            isPublic: true,
          })
          .expect((res) => {
            expect(res.body).toBeDefined();
            expect(res.body).toMatchObject({
              statusCode: 400,
              message: [
                "jobTitle must be shorter than or equal to 50 characters",
              ],
              error: "Bad Request",
            });
          });
      });

      it("should throw an exception if the job level is not one of the allowed values", async () => {
        await request(app.getHttpServer())
          .post("/exam")
          .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
          .send({
            jobTitle: "Test Job Title",
            jobLevel: "junior",
            description: "Test description",
            durationInHours: 1.25,
            submissionInHours: 4.125,
            showScore: true,
            isPublic: true,
          })
          .expect((res) => {
            expect(res.body).toBeDefined();
            expect(res.body).toMatchObject({
              statusCode: 400,
              message: [
                "jobLevel must be one of the following values: estágio, trainee, júnior, pleno, sênior",
              ],
              error: "Bad Request",
            });
          });
      });

      it("should throw an exception if the description is too long", async () => {
        await request(app.getHttpServer())
          .post("/exam")
          .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
          .send({
            jobTitle: "Test Job Title",
            jobLevel: "estágio",
            description: "a".repeat(401),
            durationInHours: 1.25,
            submissionInHours: 4.125,
            showScore: true,
            isPublic: true,
          })
          .expect((res) => {
            expect(res.body).toBeDefined();
            expect(res.body).toMatchObject({
              statusCode: 400,
              message: [
                "description must be shorter than or equal to 400 characters",
              ],
              error: "Bad Request",
            });
          });
      });

      it(
        "should create three new exams for each recruiter and return them",
        async () => {
          const startTime = Date.now();

          for (let i = 0; i < recruiterAccessTokenArr.length; i++) {
            for (let j = 0; j < 3; j++) {
              const jobTitleTemplate = `Test Exam ${j} - Recruiter ${i}`;

              await request(app.getHttpServer())
                .post("/exam")
                .set("Authorization", `Bearer ${recruiterAccessTokenArr[i]}`)
                .send({
                  jobTitle: jobTitleTemplate,
                  jobLevel: "estágio",
                  description: "Test description",
                  durationInHours: 1.25,
                  submissionInHours: 4.125,
                  showScore: true,
                  isPublic: true,
                })
                .expect(201)
                .expect((res) => {
                  expect(res.body).toBeDefined();
                  expect(res.body).toMatchObject({
                    jobTitle: jobTitleTemplate.toLowerCase(),
                    durationInHours: 1.25,
                    submissionInHours: 4.125,
                    status: "draft",
                  });
                })
                .then((res) => examIdArr.push(res.body.id));
            }
          }

          const endTime = Date.now();
          const elapsedTime = endTime - startTime;
          console.log("exam creation, total elapsed time: ", elapsedTime);
          console.log(
            "exam creation, elapsed time per exam (sec): ",
            Math.round(elapsedTime / 1000 / 18)
          );
        },
        5 * 1000 * 1000
      );

      it("should not allow a candidate to create a new exam", async () => {
        await request(app.getHttpServer())
          .post("/exam")
          .set("Authorization", `Bearer ${candidateAccessTokenArr[0]}`)
          .send({
            jobTitle: "Test Exam - Candidate",
            jobLevel: "estágio",
            description: "Test description",
            durationInHours: 1.25,
            submissionInHours: 4.125,
            showScore: true,
            isPublic: true,
          })
          .expect(401);
      });

      it("should update an existing exam and return it", async () => {
        const payload = {
          description: "Test description - updated",
        };
        await request(app.getHttpServer())
          .patch(`/exam?id=${examIdArr[0]}`)
          .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
          .send(payload)
          .expect(200)
          .expect((res) => {
            expect(res.body).toBeDefined();
            expect(res.body).toMatchObject(payload);
          });
      });

      it("should not allow a candidate to update an existing exam", async () => {
        const payload = {
          description: "Test description - updated",
        };

        await request(app.getHttpServer())
          .patch(`/exam?id=${examIdArr[0]}`)
          .set("Authorization", `Bearer ${candidateAccessTokenArr[0]}`)
          .send(payload)
          .expect(401);
      });

      it("should delete an existing exam", async () => {
        await request(app.getHttpServer())
          .delete(`/exam?id=${examIdArr[0]}`)
          .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
          .expect(200);
        examIdArr.shift();
      });

      it("should not allow a candidate to delete an existing exam", async () => {
        await request(app.getHttpServer())
          .delete(`/exam?id=${examIdArr[0]}`)
          .set("Authorization", `Bearer ${candidateAccessTokenArr[0]}`)
          .expect(401);
      });

      it("should fetch a list of all exams created by the current user", async () => {
        await request(app.getHttpServer())
          .get("/exam/fetchOwn")
          .set("Authorization", `Bearer ${recruiterAccessTokenArr[0]}`)
          .expect(200)
          .expect((res) => {
            expect(res.body).toBeDefined();
            expect(res.body).toHaveLength(3);
          });
      });
    });

    // describe("Non-functional requirements", () => {
    //   it("POST /exam should send embeddings vector to a queue for further processing", async () => {});
    // });
  });

  // describe("Section management and organization", () => {});

  // describe("Question bank and content upload", () => {});

  // describe("Exam scheduling and enrollment", () => {
  // it("should fetch a list of all exams the current user is enrolled in", async () => {});

  //   it("should find an exam the user is enrolled in and return it", async () => {});

  //   it("should find an exam the user is enrolled in and return it with relations", async () => {});

  //   it("should find an exam the user is enrolled in and return it with relations mapped", async () => {});

  // it("should switch an exam's status between 'draft' and 'published'", async () => {});

  // it("should switch an exam's status between 'published' and 'archived'", async () => {});

  // it("should not allow a candidate to switch an exam's status", async () => {});

  // it("should get the days left until an exam can be switched to 'archived'", async () => {});

  // it("should send invitations to candidates to take an exam", async () => {});

  // it("should not allow a candidate to send invitations to candidates", async () => {});

  // it("should fetch a list of all candidates invited to take an exam", async () => {});

  // it("should find an exam created by the user and return it", async () => {});

  // it("should find an exam created by the user and return it with relations", async () => {});

  // it("should find an exam created by the user and return it with relations mapped", async () => {});
  // });

  // describe("Taking an exam and answering questions", () => {});

  // describe("Grading and results reporting", () => {});

  // describe("Feedback and review process", () => {});

  // describe("User log-off and data privacy", () => {});
});
