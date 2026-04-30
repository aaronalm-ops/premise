// Text extractors for document ingestion.
// PDF -> pdf-parse; DOCX -> mammoth; .md and .txt -> raw bytes decoded as UTF-8.
//
// All extractors run on the Node.js runtime (not Edge) — pdf-parse uses
// Buffer + fs, mammoth uses zlib. Route handlers using these need the
// default Node runtime.

import mammoth from "mammoth";

export type ExtractedDocument = {
  title: string | null;
  text: string;
  mimeType: string;
};

const TXT_LIKE = new Set([
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "application/json",
  "text/csv",
]);

const PDF_MIME = "application/pdf";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractFromFile(input: {
  filename: string;
  mimeType: string;
  bytes: ArrayBuffer;
}): Promise<ExtractedDocument> {
  const lower = input.filename.toLowerCase();
  const buffer = Buffer.from(input.bytes);

  // PDF
  if (input.mimeType === PDF_MIME || lower.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(buffer);
    return {
      title: input.filename.replace(/\.pdf$/i, ""),
      text: result.text.trim(),
      mimeType: PDF_MIME,
    };
  }

  // DOCX
  if (
    input.mimeType === DOCX_MIME ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return {
      title: input.filename.replace(/\.docx?$/i, ""),
      text: result.value.trim(),
      mimeType: DOCX_MIME,
    };
  }

  // Plain text / markdown / generic
  if (
    TXT_LIKE.has(input.mimeType) ||
    lower.endsWith(".md") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".markdown")
  ) {
    return {
      title: input.filename
        .replace(/\.(md|markdown|txt)$/i, "")
        .replace(/[_-]/g, " "),
      text: new TextDecoder("utf-8").decode(buffer),
      mimeType: lower.endsWith(".md") ? "text/markdown" : "text/plain",
    };
  }

  throw new Error(
    `Unsupported file type: ${input.mimeType || lower}. Supported: PDF, DOCX, .txt, .md`,
  );
}
