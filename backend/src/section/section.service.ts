/** nestjs */
import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { ModuleRef } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";

/** providers */
import { ExamService } from "../exam/exam.service";
import { QueryRunnerService } from "../query-runner/query-runner.service";

/** external dependencies */
import { ObjectId } from "mongodb";
import { Repository } from "typeorm";
import { Pinecone } from "@pinecone-database/pinecone";

import { PromptTemplate } from "langchain/prompts";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { RunnableSequence } from "langchain/schema/runnable";
// import { StructuredOutputParser } from "langchain/output_parsers";

/** entities */
import { Section } from "./entities/section.entity";

/** dtos */
import { AddQuestionDto } from "./dto/add-question.dto";
import { CreateSectionDto } from "./dto/create-section.dto";
import { UpdateSectionDto } from "./dto/update-section.dto";

/** utils */
import { _create, _findOne, _update } from "../utils/typeorm.utils";
////////////////////////////////////////////////////////////////////////////////

@Injectable()
export class SectionService implements OnModuleInit {
  private PINECONE_SECTION_INDEX_NAME: string = "vector-store";
  private PINECONE_SECTION_INDEX_DIMENSION: number = 1536;

  private examService: ExamService;

  private llm: ChatOpenAI = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0,
  });

  private vectorStore: Pinecone = new Pinecone({
    apiKey: this.configService.get<string>("PINECONE_API_KEY")!,
    environment: this.configService.get<string>("PINECONE_ENVIRONMENT")!,
  });

  constructor(
    @InjectRepository(Section)
    private readonly sectionRepository: Repository<Section>,
    private readonly moduleRef: ModuleRef,
    private readonly configService: ConfigService,
    private readonly queryRunner: QueryRunnerService
  ) {}

  onModuleInit() {
    this.examService = this.moduleRef.get(ExamService, {
      strict: false,
    });
  }

  /** basic CRUD methods */
  async create(
    userId: number,
    examId: number,
    createSectionDto: CreateSectionDto
  ): Promise<Section> {
    // check if exam exists and is owned by user
    const exam = await this.examService.findOne(userId, "id", examId);
    if (!exam) throw new NotFoundException("Exam not found.");

    // check if exam is in draft state
    if (exam.status !== "draft")
      throw new UnauthorizedException(
        "You cannot create a section for an exam that is not in draft state."
      );

    // check if exam's sections's weights are less than or equal to 1
    if (
      (await exam.sections).reduce(
        (acc, curr) => acc + +curr.weight,
        createSectionDto.weight
      ) > 1
    )
      throw new UnauthorizedException(
        "The sum of all sections' weights cannot be greater than 1."
      );

    // create section
    const section = (await _create(this.queryRunner, this.sectionRepository, {
      ...createSectionDto,
      questionId: [],
    })) as Section;

    // add exam's metadata to vector store
    await this.manageVectorStore(
      "upsert",
      this.PINECONE_SECTION_INDEX_NAME,
      section.id,
      section.name,
      section.description
    );

    // set relation between section and exam
    await _update(section.id, { exam }, this.sectionRepository, "section");

    // return updated section
    return await this.findOne(userId, "id", section.id);
  }

  async findOne(
    userId: number,
    key: string,
    value: unknown,
    relations?: string[],
    map?: boolean
  ): Promise<Section> {
    const section = (await _findOne(
      this.sectionRepository,
      "section",
      key,
      value
    )) as Section;

    // check if section exists
    if (!section) throw new NotFoundException("Section not found.");

    // check if user is authorized to access section
    const exam = await section.exam;
    if (
      (await exam.createdBy).id !== userId &&
      !(await exam.enrolledUsers).some((candidate) => candidate.id === userId)
    )
      throw new UnauthorizedException(
        "You are not authorized to access this section."
      );

    return (await _findOne(
      this.sectionRepository,
      "section",
      key,
      value,
      relations,
      map
    )) as Section;
  }

  async update(
    userId: number,
    sectionId: number,
    updateSectionDto: UpdateSectionDto
  ): Promise<Section> {
    // check if exam exists and is owned by user
    const section = await this.findOne(userId, "id", sectionId);

    // check if exam is in draft state
    if ((await section.exam).status !== "draft")
      throw new UnauthorizedException(
        "You cannot update a section for an exam that is not in draft state."
      );

    // check if exam's sections's weights are less than or equal to 1
    const updatedWeight =
      (await (await section.exam).sections).reduce((acc, curr, idx) => {
        return acc + +curr.weight;
      }, updateSectionDto.weight!) - section.weight;

    if (updateSectionDto.weight && updatedWeight > 1)
      throw new UnauthorizedException(
        "The sum of all sections' weights cannot be greater than 1."
      );

    // update exam
    await _update(
      sectionId,
      updateSectionDto as Record<string, unknown>,
      this.sectionRepository,
      "section"
    );

    // update section's metadata in vector store
    const updatedSection = await this.findOne(userId, "id", sectionId);
    this.manageVectorStore(
      "upsert",
      this.PINECONE_SECTION_INDEX_NAME,
      updatedSection.id,
      updatedSection.name,
      updatedSection.description
    );

    return updatedSection;
  }

  /** custom methods */
  async addtoQuestion(id: number, payload: AddQuestionDto): Promise<void> {
    await _update(
      id,
      payload as unknown as Record<string, Record<string, ObjectId | number>[]>,
      this.sectionRepository,
      "section"
    );
  }

  async manageVectorStore(
    mode: string = "upsert" || "delete",
    pineconeIdx: string,
    examId: number,
    name?: string,
    description?: string
  ): Promise<void> {
    const pineconeIndex = this.vectorStore.index(pineconeIdx);

    if (mode === "upsert") {
      const embeddings = new OpenAIEmbeddings();
      const embeddedDescription = await embeddings.embedDocuments([
        `${name}|${description}`,
      ]);

      if (embeddedDescription[0].length > this.PINECONE_SECTION_INDEX_DIMENSION)
        throw new Error(
          `Document dimension (${embeddedDescription[0].length}) is larger than index dimension (${this.PINECONE_SECTION_INDEX_DIMENSION}).`
        );

      const zerosArray: number[] = [];
      for (
        let i = 0;
        i <
        this.PINECONE_SECTION_INDEX_DIMENSION - embeddedDescription[0].length;
        i++
      ) {
        zerosArray.push(0);
      }
      embeddedDescription[0].push(...zerosArray);

      await pineconeIndex.upsert([
        {
          id: String(examId),
          values: embeddedDescription[0],
          metadata: {
            module: "section-description",
          },
        },
      ]);
    }

    if (mode === "delete") pineconeIndex.deleteOne(String(examId));
  }

  async suggestDescription(userId: number, examId: number) {
    const suggestedSectionsArr: any[] = [];

    // 1. MySQL database: return section suggestions based on job title and job level
    const sectionsFromEquivalentExams =
      await this.examService.findSimilarSections(userId, examId);

    suggestedSectionsArr.push(...sectionsFromEquivalentExams);

    if (suggestedSectionsArr.length > 2) return suggestedSectionsArr;

    // 2. Pinecone: if not enough similar sections, suggest based on vector similarity
    const exam = await this.examService.findOne(userId, "id", examId);

    const pineconeIndex = this.vectorStore.index(
      this.examService.PINECONE_INDEX_NAME
    );

    const embeddings = new OpenAIEmbeddings();
    const embeddedQuery = await embeddings.embedQuery(
      `${exam!.jobTitle}|${exam!.jobLevel}|${exam!.description}`
    );

    const queryResponse = await pineconeIndex.query({
      topK: 4,
      vector: embeddedQuery,
      filter: {
        module: { $eq: this.examService.PINECONE_INDEX_MODULE },
      },
    });

    if (queryResponse.matches) {
      const matches = queryResponse.matches.map((match) => {
        return { id: match.id, score: match.score };
      });

      for (let i = 0; i < matches.length; i++) {
        if (
          +matches[i].id !== examId &&
          matches[i].score &&
          +matches[i].score! >= 0.95
        ) {
          const suggestedSections = await this.examService.findSimilarSections(
            userId,
            +matches[i].id,
            "strict"
          );

          suggestedSectionsArr.push(...suggestedSections);
        }

        if (suggestedSectionsArr.length > 2) return suggestedSectionsArr;
      }
    }

    // 3. LLM call: if not enough similar sections, suggest based on LLM
    const basePrompt =
      "Sugira uma seção para um teste de recrutamento para uma vaga de {jobTitle} no nível de {jobLevel}. A seção deve ser um objeto JSON com as propriedades name e description. A seção sugerida deve conter uma descrição detalhada do conteúdo a ser testado pelo candidato e fazer sentido para a vaga, por exemplo, um engenheiro de software deve ter uma seção de programação, um contador deve ter uma seção de contabilidade, e assim por diante.";

    // const outputParser = StructuredOutputParser.fromNamesAndDescriptions({
    //   name: "nome da seção do teste de recrutamento",
    //   description: "descrição da seção do teste de recrutamento",
    // });

    const functionSchema = [
      {
        name: "sectionSuggestions",
        description: "sugere uma seção para um teste de recrutamento",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "nome da seção do teste de recrutamento",
            },
            description: {
              type: "string",
              description: "descrição da seção do teste de recrutamento",
            },
          },
          required: ["name", "description"],
        },
      },
    ];

    while (true) {
      const currentSections = suggestedSectionsArr
        .map((section) => {
          return section.name;
        })
        .join(", ");

      const prompt = PromptTemplate.fromTemplate(
        currentSections
          ? `${basePrompt} A seção sugerida não pode ser nenhuma das seguintes: ${currentSections}.`
          : basePrompt
      );

      const chain = RunnableSequence.from([
        prompt,
        this.llm.bind({
          functions: functionSchema,
          function_call: { name: "sectionSuggestions" },
        }),
      ]);

      const result = await chain.invoke({
        jobTitle: exam!.jobTitle,
        jobLevel: exam!.jobLevel,
      });

      suggestedSectionsArr.push(
        JSON.parse(result.additional_kwargs.function_call!.arguments)
      );

      if (suggestedSectionsArr.length > 2) return suggestedSectionsArr;
    }
  }
}
