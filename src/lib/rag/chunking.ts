// Chunking strategy for Premise.
//
// We split source text into paragraph-sized chunks (roughly 200-400 tokens each).
// Why this size: voyage-3 embeds best around 200-500 tokens; smaller chunks lose
// context, larger ones blur meaning. Paragraphs are a natural unit because
// researchers write one idea per paragraph.
//
// Algorithm:
//   1. Split on blank lines (paragraph boundaries).
//   2. Pack adjacent paragraphs together until we hit TARGET_CHARS.
//   3. Any single paragraph longer than MAX_CHARS gets split by sentence.

const TARGET_CHARS = 1200; // ~300 tokens
const MAX_CHARS = 2000; // ~500 tokens — never exceed

export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current) {
      chunks.push(current);
      current = "";
    }
  };

  for (const para of paragraphs) {
    if (para.length > MAX_CHARS) {
      flush();
      const sentences = para.split(/(?<=[.!?])\s+/);
      let buf = "";
      for (const s of sentences) {
        if (buf.length + s.length + 1 > TARGET_CHARS && buf) {
          chunks.push(buf);
          buf = s;
        } else {
          buf = buf ? `${buf} ${s}` : s;
        }
      }
      if (buf) chunks.push(buf);
      continue;
    }

    if (current.length + para.length + 2 > TARGET_CHARS && current) {
      flush();
    }
    current = current ? `${current}\n\n${para}` : para;
  }
  flush();

  return chunks;
}
