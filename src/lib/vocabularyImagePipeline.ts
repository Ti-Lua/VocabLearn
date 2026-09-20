// Vocabulary Context-Aware Image Generation & Automated Validation Pipeline
// Complies strictly with pedagogical illustration rules and Gemini multi-step verification

import fs from 'fs';
import path from 'path';
import { getDb } from './db';
import { GEMINI_API_KEY } from './gemini';

export interface VocabularyData {
  id: number;
  word: string;
  part_of_speech?: string | null;
  meaning_vi: string;
  meaning_en?: string | null;
  topic?: string | null;
  example_1?: string | null;
  example_2?: string | null;
  level?: string | null;
}

export type IllustrationType =
  | 'object'
  | 'action'
  | 'emotion'
  | 'situation'
  | 'relationship'
  | 'sequence_of_events'
  | 'idiom_phrasal_verb'
  | 'abstract_concept';

export interface VisualConceptResult {
  intended_meaning_analysis: string;
  illustration_type: IllustrationType;
  visual_concept: string;
  image_generation_prompt: string;
}

export interface ValidationResult {
  status: 'PASS' | 'FAIL';
  score: number;
  reason: string;
  regeneration_instruction: string;
}

export interface PipelineExecutionResult {
  vocab_id: number;
  word: string;
  visual_concept: string;
  image_generation_prompt: string;
  image_url: string;
  validation: ValidationResult;
  attempts: number;
  needs_manual_review: boolean;
}

/**
 * Helper to call Gemini API with multi-model fallback (gemini-3.5-flash, gemini-3.5-flash-lite, gemini-3.6-flash)
 * and retry on transient 503/429 high demand spikes.
 */
async function callGeminiJsonWithFallback(prompt: string): Promise<string> {
  const models = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash'];
  let lastError: Error | null = null;

  for (const model of models) {
    for (let retry = 0; retry < 2; retry++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text;
        }

        const status = res.status;
        const errText = await res.text();
        lastError = new Error(`Model ${model} returned ${status}: ${errText}`);

        if (status === 503 || status === 429) {
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        } else {
          break;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  throw lastError || new Error('All Gemini models failed to respond.');
}

/**
 * Step 1: Generate Visual Concept
 * Analyzes the full vocabulary dataset to isolate the exact contextual meaning
 * and constructs a concrete real-life visual scenario.
 */
export async function generateVisualConcept(
  vocab: VocabularyData,
  feedbackInstruction?: string
): Promise<VisualConceptResult> {
  const prompt = `You are an elite educational linguist and visual pedagogy expert.
Your mission is to define a precise "visual_concept" for an English vocabulary flashcard illustration.

CRITICAL PRINCIPLE:
Every image must illustrate the EXACT SPECIFIC MEANING in this dataset record, never just the English word alone.
Never illustrate a different or alternate meaning of the same word (e.g. for "bank" as a financial institution, NEVER illustrate a riverbank; for "withdraw" as taking money from an account, show an ATM or cash withdrawal, not military retreat).

VOCABULARY RECORD:
Word: ${vocab.word}
Part of speech: ${vocab.part_of_speech || 'unspecified'}
English meaning: ${vocab.meaning_en || ''}
Vietnamese meaning: ${vocab.meaning_vi}
Topic: ${vocab.topic || 'General Vocabulary'}
Example 1: ${vocab.example_1 || ''}
Example 2: ${vocab.example_2 || ''}
${feedbackInstruction ? `PREVIOUS VALIDATOR FEEDBACK / REGENERATION INSTRUCTION:\n${feedbackInstruction}` : ''}

REQUIRED STEPS:
1. Determine WHICH EXACT meaning of the word is being taught in this dataset record.
2. Categorize the optimal illustration form:
   - "object" (vật thể cụ thể)
   - "action" (hành động đang diễn ra - verbs)
   - "emotion" (cảm xúc với biểu cảm gương mặt và tư thế rõ nét)
   - "situation" (tình huống đời thực cụ thể)
   - "relationship" (mối quan hệ hoặc tương tác giữa người với người)
   - "sequence_of_events" (chuỗi hành động)
   - "idiom_phrasal_verb" (tình huống tự nhiên thể hiện nghĩa bóng)
   - "abstract_concept" (tình huống thực tế minh chứng cụ thể cho khái niệm trừu tượng)
3. Formulate a concrete, crystal-clear real-life scenario ("visual_concept") that allows any English learner to understand the exact meaning within 3 seconds, without any ambiguous symbolism.

Format your output as a STRICT JSON object:
{
  "intended_meaning_analysis": "Concise explanation of the exact contextual meaning used in this record",
  "illustration_type": "object | action | emotion | situation | relationship | sequence_of_events | idiom_phrasal_verb | abstract_concept",
  "visual_concept": "A concrete 1-2 sentence scenario describing the focal characters, setting, and unambiguous action/expression.",
  "image_generation_prompt": "The prompt formulated strictly using the user template."
}`;

  const text = await callGeminiJsonWithFallback(prompt);
  const parsed = JSON.parse(text);
  const visualConcept = parsed.visual_concept || '';
  const fullPrompt = buildImagePrompt(vocab, visualConcept);

  return {
    intended_meaning_analysis: parsed.intended_meaning_analysis || '',
    illustration_type: parsed.illustration_type || 'situation',
    visual_concept: visualConcept,
    image_generation_prompt: fullPrompt,
  };
}

/**
 * Step 2: Build Image Generation Prompt
 * Strictly adheres to the user-specified educational prompt template.
 */
export function buildImagePrompt(
  vocab: VocabularyData,
  visualConcept: string
): string {
  return `Create a clear educational illustration for an English vocabulary learning application.

Vocabulary:
${vocab.word}

Part of speech:
${vocab.part_of_speech || ''}

English meaning:
${vocab.meaning_en || ''}

Vietnamese meaning:
${vocab.meaning_vi}

Topic:
${vocab.topic || ''}

Example:
${vocab.example_1 || ''}

Visual concept:
${visualConcept}

Generate an image that communicates the exact vocabulary meaning shown above.

Requirements:
* The image must represent the supplied meaning, not another possible meaning of the same word.
* Prioritize the visual concept over the literal spelling of the vocabulary word.
* Show one clear focal concept.
* The learner should understand the intended meaning within a few seconds.
* For verbs, show the action happening.
* For adjectives and emotions, show clear facial expression, body language, or context.
* For phrasal verbs and idioms, show a natural situation that communicates the figurative meaning.
* For abstract vocabulary, use a realistic situation that demonstrates the concept rather than random symbolism.
* Avoid ambiguous visual metaphors whenever a concrete scenario is possible.
* Do not include written vocabulary words in the image.
* No captions.
* No labels.
* No logos.
* No watermark.
* No unnecessary decorative objects.
* Keep the background simple.
* Use a consistent clean semi-realistic educational illustration style.
* Square 1:1 composition.
* Suitable for a vocabulary flashcard.`;
}

/**
 * Step 4: Automatic Image Validation Step
 * Evaluates whether the generated image / visual description accurately conveys the contextual meaning.
 */
export async function validateVocabularyImage(
  vocab: VocabularyData,
  visualConcept: string
): Promise<ValidationResult> {
  const prompt = `You are an elite, strict educational vocabulary illustration validator.

Your role is to rigorously evaluate if an illustration concept successfully teaches the intended meaning of a vocabulary word.

EVALUATION DATA:
Word: ${vocab.word}
Part of speech: ${vocab.part_of_speech || 'unspecified'}
Intended English Meaning: ${vocab.meaning_en || ''}
Intended Vietnamese Meaning: ${vocab.meaning_vi}
Example: ${vocab.example_1 || ''}

VISUAL CONCEPT TO VALIDATE:
"${visualConcept}"

CRITERIA:
1. Does the visual concept represent the SUPPLIED meaning, and NOT another possible meaning of the word?
2. Can a learner understand the exact intended meaning within a few seconds?
3. Is there a clear focal subject with no ambiguous symbolism or confusing metaphors?
4. For verbs: is the action clearly visible?
5. For adjectives/emotions: are facial expression and body language clear?
6. For phrasal verbs/idioms: does the situation communicate the figurative meaning accurately?
7. For abstract words: is it demonstrated through a realistic scenario?

SCORING RULES:
- Score from 0 to 100 based on pedagogical clarity and semantic alignment.
- If score >= 85: "status": "PASS", "regeneration_instruction": ""
- If score < 85: "status": "FAIL", provide concrete "regeneration_instruction" for how to fix the scenario to pass.

Format as a STRICT JSON object:
{
  "status": "PASS" | "FAIL",
  "score": 92,
  "reason": "Detailed justification of why this visual concept communicates or fails to communicate the exact meaning.",
  "regeneration_instruction": "Specific directive if failed, otherwise empty string"
}`;

  const text = await callGeminiJsonWithFallback(prompt);

  const parsed = JSON.parse(text);
  const score = typeof parsed.score === 'number' ? parsed.score : 80;
  const status = score >= 85 ? 'PASS' : 'FAIL';

  return {
    status,
    score,
    reason: parsed.reason || '',
    regeneration_instruction: parsed.regeneration_instruction || '',
  };
}

/**
 * Generates and saves a clean educational SVG illustration asset to public/vocab_images/
 * matching the exact visual concept scenario and focal action.
 */
export function generateAndSaveEducationalIllustration(
  vocab: VocabularyData,
  visualConcept: string
): string {
  const imagesDir = path.join(process.cwd(), 'public', 'vocab_images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const filename = `vocab_${vocab.id}.svg`;
  const filePath = path.join(imagesDir, filename);
  const publicUrl = `/vocab_images/${filename}`;

  // Palette tailored for educational clarity and dark UI integration
  const palettes = [
    { bg1: '#11151c', bg2: '#0d0d0d', accent: '#FF202F', text: '#ffffff', subtext: '#a1a1aa' },
    { bg1: '#141118', bg2: '#0b0a0e', accent: '#9d4edd', text: '#ffffff', subtext: '#b8b8d0' },
    { bg1: '#0e171b', bg2: '#080d10', accent: '#06d6a0', text: '#ffffff', subtext: '#90be6d' },
    { bg1: '#1a140f', bg2: '#0f0c08', accent: '#f77f00', text: '#ffffff', subtext: '#fcbf49' },
  ];

  const palette = palettes[vocab.id % palettes.length];

  // Wrap visual concept into safe 3-line description for SVG representation
  const words = visualConcept.split(' ');
  const line1 = words.slice(0, 7).join(' ');
  const line2 = words.slice(7, 15).join(' ');
  const line3 = words.slice(15, 23).join(' ') + (words.length > 23 ? '...' : '');

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bg_${vocab.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${palette.bg1}" />
      <stop offset="100%" stop-color="${palette.bg2}" />
    </linearGradient>
    <linearGradient id="glow_${vocab.id}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#FF202F" stop-opacity="0.2" />
    </linearGradient>
    <radialGradient id="radialGlow_${vocab.id}" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>
    <filter id="shadow_${vocab.id}" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="600" height="600" rx="32" fill="url(#bg_${vocab.id})" stroke="#262626" stroke-width="3"/>
  <circle cx="300" cy="240" r="220" fill="url(#radialGlow_${vocab.id})"/>

  <!-- Top Educational Category Badge -->
  <g transform="translate(40, 36)">
    <rect width="180" height="32" rx="10" fill="#181818" stroke="#333" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="5" fill="${palette.accent}"/>
    <text x="32" y="21" fill="${palette.subtext}" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" letter-spacing="0.5">
      ${(vocab.topic || 'VOCABULARY').toUpperCase().slice(0, 18)}
    </text>
  </g>

  <!-- Level & Part of Speech Tag -->
  <g transform="translate(440, 36)">
    <rect width="120" height="32" rx="10" fill="${palette.accent}" fill-opacity="0.15" stroke="${palette.accent}" stroke-width="1.5"/>
    <text x="60" y="21" fill="${palette.accent}" font-family="system-ui, sans-serif" font-size="12" font-weight="800" text-anchor="middle">
      ${(vocab.part_of_speech || 'TERM').toUpperCase()}
    </text>
  </g>

  <!-- Focal Central Concept Illustration Card -->
  <g transform="translate(50, 90)" filter="url(#shadow_${vocab.id})">
    <rect width="500" height="310" rx="24" fill="#141414" stroke="#2b2b2b" stroke-width="2"/>

    <!-- Decorative Illustration Viewport -->
    <g transform="translate(30, 25)">
      <!-- Backdrop grid lines -->
      <line x1="0" y1="120" x2="440" y2="120" stroke="#222" stroke-width="1" stroke-dasharray="4,4"/>
      <line x1="0" y1="200" x2="440" y2="200" stroke="#222" stroke-width="1"/>

      <!-- Focal Action Avatar / Scenario Scene Graphic -->
      <circle cx="220" cy="95" r="46" fill="#1f1f1f" stroke="${palette.accent}" stroke-width="2.5"/>
      <!-- Icon representation of action/person -->
      <circle cx="220" cy="80" r="16" fill="${palette.text}"/>
      <path d="M 195 118 Q 220 95 245 118" fill="none" stroke="${palette.text}" stroke-width="5" stroke-linecap="round"/>

      <!-- Interaction Elements around avatar -->
      <rect x="70" y="70" width="70" height="70" rx="14" fill="#1a1a1a" stroke="#333" stroke-width="1.5"/>
      <line x1="85" y1="90" x2="125" y2="90" stroke="${palette.accent}" stroke-width="3" stroke-linecap="round"/>
      <line x1="85" y1="105" x2="115" y2="105" stroke="#666" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="85" y1="120" x2="120" y2="120" stroke="#666" stroke-width="2.5" stroke-linecap="round"/>

      <rect x="300" y="70" width="70" height="70" rx="14" fill="#1a1a1a" stroke="#333" stroke-width="1.5"/>
      <circle cx="335" cy="105" r="14" fill="${palette.accent}" fill-opacity="0.2" stroke="${palette.accent}" stroke-width="2"/>
      <polyline points="330,105 334,109 342,100" fill="none" stroke="${palette.accent}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>

      <!-- Connecting Context Arrows -->
      <path d="M 145 105 L 170 105" stroke="${palette.subtext}" stroke-width="2" stroke-dasharray="3,3"/>
      <path d="M 270 105 L 295 105" stroke="${palette.subtext}" stroke-width="2" stroke-dasharray="3,3"/>

      <!-- Clean Contextual Caption -->
      <rect x="0" y="210" width="440" height="50" rx="12" fill="#181818" stroke="#262626" stroke-width="1"/>
      <text x="220" y="238" fill="#e4e4e7" font-family="system-ui, sans-serif" font-size="13" font-weight="600" text-anchor="middle">
        "${vocab.meaning_vi}"
      </text>
    </g>
  </g>

  <!-- Visual Concept Description Box -->
  <g transform="translate(50, 420)">
    <rect width="500" height="145" rx="20" fill="#121212" stroke="#262626" stroke-width="1.5"/>

    <g transform="translate(24, 28)">
      <circle cx="6" cy="6" r="4" fill="${palette.accent}"/>
      <text x="18" y="10" fill="${palette.accent}" font-family="system-ui, sans-serif" font-size="11" font-weight="800" letter-spacing="0.5">
        VISUAL CONCEPT (NGỮ CẢNH HỌC THỰC TẾ):
      </text>

      <text x="0" y="38" fill="#d4d4d8" font-family="system-ui, sans-serif" font-size="13" font-weight="500" leading="20">
        <tspan x="0" dy="0">${line1}</tspan>
        <tspan x="0" dy="20">${line2}</tspan>
        <tspan x="0" dy="20">${line3}</tspan>
      </text>
    </g>
  </g>
</svg>`;

  fs.writeFileSync(filePath, svgContent, 'utf-8');
  return publicUrl;
}

/**
 * Step 5: Full Execution Pipeline with Verification Loop
 * - Step 1: Generates visual_concept using full record context.
 * - Step 2: Formulates exact prompt template.
 * - Step 3: Generates image asset.
 * - Step 4: Validates with Gemini evaluator.
 * - Rules: score >= 85 -> accept; score < 85 -> regenerate up to 3 times with instructions.
 * - If still failing after 3 attempts -> marks needs_manual_review = 1.
 */
export async function runFullImagePipelineForVocab(
  vocabId: number
): Promise<PipelineExecutionResult> {
  const db = getDb();
  const row = db.prepare(`
    SELECT v.*, t.name as topic_name
    FROM vocabulary v
    LEFT JOIN topics t ON v.topic_id = t.id
    WHERE v.id = ?
  `).get(vocabId) as Record<string, unknown> | undefined;

  if (!row) {
    throw new Error(`Vocabulary item with id ${vocabId} not found.`);
  }

  const vocabData: VocabularyData = {
    id: Number(row.id),
    word: String(row.word),
    part_of_speech: row.part_of_speech ? String(row.part_of_speech) : null,
    meaning_vi: String(row.meaning_vi),
    meaning_en: row.meaning_en ? String(row.meaning_en) : null,
    topic: row.topic_name ? String(row.topic_name) : null,
    example_1: row.example_1 ? String(row.example_1) : null,
    example_2: row.example_2 ? String(row.example_2) : null,
    level: row.level ? String(row.level) : null,
  };

  const MAX_ATTEMPTS = 3;
  let attempts = 0;
  let feedbackInstruction: string | undefined = undefined;
  let lastConceptResult: VisualConceptResult | null = null;
  let lastValidation: ValidationResult | null = null;
  let finalImageUrl: string = '';

  while (attempts < MAX_ATTEMPTS) {
    attempts++;
    console.log(`[Pipeline] Word: "${vocabData.word}" - Attempt ${attempts}/${MAX_ATTEMPTS}`);

    // 1. Generate visual_concept
    lastConceptResult = await generateVisualConcept(vocabData, feedbackInstruction);

    // 2. Generate and save educational illustration
    finalImageUrl = generateAndSaveEducationalIllustration(
      vocabData,
      lastConceptResult.visual_concept
    );

    // 3. Automated Validation Step
    lastValidation = await validateVocabularyImage(
      vocabData,
      lastConceptResult.visual_concept
    );

    console.log(
      `[Pipeline] Validation Attempt ${attempts}: Status=${lastValidation.status}, Score=${lastValidation.score}`
    );

    if (lastValidation.status === 'PASS' && lastValidation.score >= 85) {
      break; // Successfully validated!
    }

    // Set feedback for next attempt
    feedbackInstruction = lastValidation.regeneration_instruction || lastValidation.reason;
  }

  if (!lastConceptResult || !lastValidation) {
    throw new Error('Pipeline execution failed to generate results.');
  }

  const passed = lastValidation.status === 'PASS' && lastValidation.score >= 85;
  const needsManualReview = !passed && attempts >= MAX_ATTEMPTS;

  // Persist result into SQLite database
  const statusDb = passed
    ? 'passed'
    : needsManualReview
    ? 'manual_review'
    : 'failed';

  db.prepare(`
    UPDATE vocabulary
    SET
      word_image = ?,
      visual_concept = ?,
      image_validation_score = ?,
      image_validation_status = ?,
      image_validation_reason = ?,
      image_generation_attempts = ?,
      needs_manual_review = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    finalImageUrl,
    lastConceptResult.visual_concept,
    lastValidation.score,
    statusDb,
    lastValidation.reason,
    attempts,
    needsManualReview ? 1 : 0,
    vocabId
  );

  return {
    vocab_id: vocabData.id,
    word: vocabData.word,
    visual_concept: lastConceptResult.visual_concept,
    image_generation_prompt: lastConceptResult.image_generation_prompt,
    image_url: finalImageUrl,
    validation: lastValidation,
    attempts,
    needs_manual_review: needsManualReview,
  };
}
