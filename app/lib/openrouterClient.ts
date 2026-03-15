/**
 * openrouterClient.ts
 *
 * Calls the OpenRouter chat completions API (OpenAI-compatible) with vision
 * to analyse a OneShot canvas image and generate a detailed implementation prompt.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `\
You are an expert software architect and senior engineer. \
You are analysing a OneShot whiteboard diagram that describes a system, product, user flow, or architecture.

Your job is to produce ONE comprehensive, highly detailed implementation prompt that a software development AI \
(Claude Code, GPT-4o, Gemini, etc.) can read and immediately use to build the complete system.

Rules for the prompt you generate:
1. Study the diagram image carefully — read every label, shape, arrow, frame, and annotation.
2. Infer intent where labels are ambiguous; make reasonable engineering assumptions and state them.
3. Describe every visible component, its purpose, and its technical role in full detail.
4. Detail all connections, data flows, APIs, and dependencies between components.
5. Specify data structures, interface contracts, event names, and error cases where you can infer them.
6. Include a logical implementation order (resolve dependencies first).
7. Include requirements for tests, error handling, logging, and edge cases.
8. Be exhaustive — the more specific detail, the better the downstream implementation.

Structure the prompt you output with these sections (use Markdown headings):
## Overview
## Architecture
## Components
## Data Flow & API Contracts
## Implementation Steps
## Testing Requirements

Output ONLY the implementation prompt text — no preamble, no meta-commentary.`;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OpenRouterGenerateOptions {
  apiKey: string;
  model: string;
  /** Base-64 encoded PNG of the canvas (no data-URI prefix). */
  imageBase64: string;
  /** Simplified JSON of the parsed canvas structure for extra context. */
  elementStructure: string;
}

// ─── API call ─────────────────────────────────────────────────────────────────

export async function generatePromptWithOpenRouter(
  opts: OpenRouterGenerateOptions,
): Promise<string> {
  const { apiKey, model, imageBase64, elementStructure } = opts;

  const body = {
    model,
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${imageBase64}`,
            },
          },
          {
            type: "text",
            text:
              `The following JSON is the parsed element structure of the canvas — use it as supplementary context alongside the image:\n\n` +
              "```json\n" +
              elementStructure +
              "\n```\n\n" +
              "Generate the comprehensive implementation prompt now.",
          },
        ],
      },
    ],
    max_tokens: 8192,
    temperature: 0.35,
  };

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const errJson = await response.json();
      detail =
        errJson?.error?.message ??
        errJson?.message ??
        (await response.text());
    } catch {
      detail = response.statusText;
    }
    throw new Error(`OpenRouter ${response.status}: ${detail}`);
  }

  const data = await response.json();
  const text: string | undefined =
    data?.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return text;
}
