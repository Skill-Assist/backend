/** nestjs */
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/** external dependencies */
import * as AWS from "aws-sdk";
import { Readable } from "stream";
import * as unzipper from "unzipper";

/** utils */
import { Documentary, DocumentaryContent } from "../utils/types.utils";
////////////////////////////////////////////////////////////////////////////////

/**
 * @description AwsService is implemented as a helper service to enable
 * dependency injection of the AWS SDK into other services.
 */
@Injectable()
export class AwsService {
  private _s3: AWS.S3;

  constructor(private readonly configService: ConfigService) {}

  /** create the AWS S3 instance */
  get s3(): AWS.S3 {
    if (!this._s3) {
      this._s3 = new AWS.S3({
        credentials: new AWS.Credentials({
          accessKeyId: this.configService.get<string>("AWS_ACCESS_KEY_ID")!,
          secretAccessKey: this.configService.get<string>(
            "AWS_SECRET_ACCESS_KEY"
          )!,
        }),
        region: "sa-east-1",
      });
    }

    return this._s3;
  }

  async fetchUnzippedDocumentary(pathToZip: string): Promise<Documentary> {
    return await this.fetchZipFromS3(this.s3, {
      Bucket: this.configService.get<string>("AWS_S3_BUCKET_NAME")!,
      Key: pathToZip,
    });
  }

  async fetchZipFromS3(
    bucket: AWS.S3,
    getObjectParams: AWS.S3.GetObjectRequest
  ): Promise<Documentary> {
    try {
      // get the file from S3
      const response = await bucket.getObject(getObjectParams).promise();
      if (!response.Body) throw new Error("No file found in S3 bucket");

      // create a readable stream from the file
      const fileStream = new Readable();
      fileStream.push(response.Body);
      fileStream.push(null);

      // unzip the file
      const documentary = fileStream.pipe(
        unzipper.Parse({ forceStream: true })
      );

      // create object to store the documentary content and length
      let documentaryContent: DocumentaryContent = {};
      let projectContentLength: number = 0;

      // iterate over every file in the documentary
      for await (const entry of documentary) {
        const fileName: string = entry.path;
        const type: string = entry.type;
        const size: number = entry.vars.uncompressedSize;
        const content: Buffer = await entry.buffer();

        // ignore empty directories
        if (type === "Directory" && size === 0) continue;

        // macOS metadata files
        if (fileName.includes("MACOSX") || fileName.includes("DS_Store"))
          continue;

        // ignore hidden files and folders
        if (fileName.startsWith(".")) continue;

        // ignore node_modules folder
        if (fileName.includes("node_modules")) continue;

        // include the file in the documentary content
        documentaryContent[fileName] = { type, size };

        // ignore content of non-text files
        if (fileName.endsWith(".png")) continue;
        if (fileName.endsWith(".ico")) continue;

        // include the content of text files
        documentaryContent[fileName].content = content.toString("utf8");

        // update the project content length
        projectContentLength += content.toString("utf8").length;
      }

      // return the documentary content and length
      return { documentaryContent, projectContentLength };
    } catch (error) {
      console.error("Error retrieving file from S3:", error);
      throw error;
    }
  }
}
