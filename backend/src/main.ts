/** nestjs */
import {
  SwaggerModule,
  OpenAPIObject,
  DocumentBuilder,
  SwaggerDocumentOptions,
} from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { NestFactory, Reflector } from "@nestjs/core";
import { ValidationPipe, INestApplication } from "@nestjs/common";

/** modules */
import { AppModule } from "./app.module";

/** external dependencies */
import helmet from "helmet";
import * as compression from "compression";
import * as session from "express-session";
import * as cookieParser from "cookie-parser";

/** dtos */
import { SigninDto } from "./auth/dto/signin.dto";

/** guards */
import { RolesGuard } from "./user/guards/roles.guard";
////////////////////////////////////////////////////////////////////////////////

/** bootstrap project */
(async function () {
  /** instantiate new project */
  const app: INestApplication = await NestFactory.create(AppModule, {
    cors: true,
  });

  /** get config service */
  const configService = app.get(ConfigService);

  /** set global prefix */
  app.setGlobalPrefix("api/v1");

  /** generic middleware */
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET!,
      cookie: {
        maxAge: 3600000,
        secure: process.env.NODE_ENV === "prod" ? true : false,
      },
      resave: false, // TODO : check store if this is needed
      saveUninitialized: false,
      store: new session.MemoryStore(), // TODO : redis+elastiCache
    })
  );

  /** empty global validation pipe; configured at handler level */
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages:
        app.get(ConfigService).get("NODE_ENV") === "prod" ? true : false,
    })
  );

  /** authorization guard */
  app.useGlobalGuards(new RolesGuard(new Reflector()));

  /** swagger */
  const config = new DocumentBuilder()
    .setTitle("Skill Assist API")
    .setDescription("The Skill Assist API description")
    .setVersion("1.0")
    .addTag("Endpoints")
    .build();

  const swaggerOptions: SwaggerDocumentOptions = {
    extraModels: [SigninDto],
  };

  const document: OpenAPIObject = SwaggerModule.createDocument(
    app,
    config,
    swaggerOptions
  );

  SwaggerModule.setup("swagger", app, document);

  /** start server listener */
  await app.listen(configService.get("PORT")!);
  console.log(`Application is running on: ${await app.getUrl()}`);
})();
