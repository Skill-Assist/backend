import { Readable } from "stream";
import * as unzipper from "unzipper";
////////////////////////////////////////////////////////////////////////////////

type DocumentaryContent = Record<
  string,
  { type: string; size: number; content?: string }
>;

export async function fetchUnzippedDocumentaryFromS3(
  bucket: AWS.S3,
  getObjectParams: AWS.S3.GetObjectRequest
): Promise<Record<string, DocumentaryContent | number>> {
  try {
    // get the file from S3
    const response = await bucket.getObject(getObjectParams).promise();
    if (!response.Body) throw new Error("No file found in S3 bucket");

    // create a readable stream from the file
    const fileStream = new Readable();
    fileStream.push(response.Body);
    fileStream.push(null);

    // unzip the file
    const documentary = fileStream.pipe(unzipper.Parse({ forceStream: true }));

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
