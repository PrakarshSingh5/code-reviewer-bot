import Anthropic from '@anthropic-ai/sdk';
import { PRFile, ReviewComment, RepoConfig, Severity } from '../types';

const MODEL = 'claude-sonnet-4-20250514'; // LM-01
const MAX_TOKENS_PER_CHUNK = 8000; // LM-05: chunk threshold
const MAX_RETRIES = 1; // LM-06: retry once on invalid JSON

const SEVERITY_RANK: Record<Severity, number> = {
  bug: 0,
  security: 1,
  suggestion: 2,
  nitpick: 3,
};

const SYSTEM_PROMPT = `You are a senior software engineer reviewing a pull request.
Analyze the diff and return ONLY a JSON array of issues.
Each item: { "file": string, "line": number, "severity": "bug"|"security"|"suggestion"|"nitpick", "comment": string }
Be specific and actionable. Skip formatting/style nitpicks unless asked.
If no issues found, return an empty array: []
Return ONLY the JSON array. No preamble, no markdown fences.`;

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

function buildUserMessage(files: PRFile[]): string {
  return (
    'Review this diff:\n\n' +
    files.map((f) => `File: ${f.filename}\n${f.patch}`).join('\n\n---\n\n')
  );
}

/**
 * Call Claude and parse JSON response. Retries once on invalid JSON (LM-06).
 */
async function callLLM(userMessage: string, attempt = 0): Promise<ReviewComment[]> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text =
    response.content[0]?.type === 'text' ? (response.content[0].text ?? '').trim() : '';

  try {
    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error('LLM response is not an array');
    return parsed as ReviewComment[];
  } catch {
    if (attempt < MAX_RETRIES) {
      console.warn(`[LLM] Invalid JSON (attempt ${attempt + 1}) — retrying`);
      return callLLM(userMessage, attempt + 1);
    }
    console.error('[LLM] Failed to parse JSON after retries. Raw:', text.slice(0, 200));
    throw new Error('LLM returned invalid JSON');
  }
}

/**
 * Split files into chunks that fit within token budget (LM-05).
 * Rough estimate: 1 token ≈ 4 characters.
 */
function chunkFiles(files: PRFile[]): PRFile[][] {
  const chunks: PRFile[][] = [];
  let current: PRFile[] = [];
  let currentSize = 0;

  for (const file of files) {
    const estimatedTokens = Math.ceil((file.patch?.length ?? 0) / 4);
    if (currentSize + estimatedTokens > MAX_TOKENS_PER_CHUNK && current.length > 0) {
      chunks.push(current);
      current = [];
      currentSize = 0;
    }
    current.push(file);
    currentSize += estimatedTokens;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

/**
 * Filter comments by min_severity (CF-03) and cap at max_comments (CF-04).
 */
function filterComments(rawComments: ReviewComment[], config: Partial<RepoConfig>): ReviewComment[] {
  const minRank = SEVERITY_RANK[config.min_severity ?? 'suggestion'] ?? 2;
  const maxComments = config.max_comments ?? 10;

  return rawComments
    .filter((c) => {
      const rank = SEVERITY_RANK[c.severity];
      return rank !== undefined && rank <= minRank;
    })
    .slice(0, maxComments);
}

/**
 * Analyze all PR files using the LLM, chunking as needed.
 * Implements LM-01 through LM-06.
 */
export async function analyzeFiles(
  files: PRFile[],
  config: Partial<RepoConfig>,
): Promise<ReviewComment[]> {
  const chunks = chunkFiles(files);
  console.log(`[LLM] Sending ${chunks.length} chunk(s) to Claude`);

  const allComments: ReviewComment[] = [];

  for (let i = 0; i < chunks.length; i++) {
    console.log(`[LLM] Processing chunk ${i + 1}/${chunks.length}`);
    const userMessage = buildUserMessage(chunks[i]);
    const comments = await callLLM(userMessage);
    allComments.push(...comments);
  }

  return filterComments(allComments, config);
}
