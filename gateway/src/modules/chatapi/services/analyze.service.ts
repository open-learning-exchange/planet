import { AIProvider, ProviderName } from '../models/chat.model';
import { instructionsForLocale } from '../prompts/default-prompts';
import { analysisJsonSchema, AnalyzeExam, AnalyzeQuestion, buildSurveyAnalysisPrompt } from '../prompts/survey-analysis';
import { providerSupports, runProviderChat } from '../providers';
import { HttpError, toHttpError } from '../utils/http-error';
import { resolveProviderName } from '../utils/provider-name';
import { getAIConfig } from './config.service';

const MAX_ANALYSIS_PAYLOAD_BYTES = 512 * 1024;

export interface AnalyzePayload {
  exam: AnalyzeExam;
  questions: AnalyzeQuestion[];
  aiProvider?: AIProvider;
  locale?: string;
}

export interface AnalysisSection {
  title: string;
  content: string;
}

export interface AnalysisResult {
  provider: ProviderName;
  sections: AnalysisSection[];
}

const isValidSection = (section: any): section is AnalysisSection =>
  section && typeof section.title === 'string' && typeof section.content === 'string';

const parseSections = (text: string): AnalysisSection[] | null => {
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed?.sections) && parsed.sections.length > 0 && parsed.sections.every(isValidSection)
      ? parsed.sections
      : null;
  } catch (error) {
    return null;
  }
};

/** Generate survey/exam analysis, using strict structured output where supported. */
export async function analyze(payload: AnalyzePayload, signal?: AbortSignal): Promise<AnalysisResult> {
  if (!payload?.exam?.name || typeof payload.exam.name !== 'string') {
    throw new HttpError(400, '"exam.name" is a required string field');
  }
  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    throw new HttpError(400, '"questions" must be a non-empty array');
  }
  if (Buffer.byteLength(JSON.stringify(payload), 'utf8') > MAX_ANALYSIS_PAYLOAD_BYTES) {
    throw new HttpError(413, 'Survey analysis input is too large');
  }

  const config = await getAIConfig();
  const providerName = resolveProviderName(payload.aiProvider);
  const runtime = config.providers[providerName];
  if (!runtime.enabled || !runtime.client || !runtime.defaultModel) {
    throw new HttpError(503, `AI provider "${providerName}" is not configured`);
  }
  const request = {
    'model': runtime.defaultModel,
    'messages': [ { 'role': 'user' as const, 'content': buildSurveyAnalysisPrompt(payload.exam, payload.questions) } ],
    'instructions': instructionsForLocale(config.promptProfiles.survey_analysis, payload.locale),
    signal
  };

  try {
    const usesStructuredOutput = providerSupports(providerName, 'structuredOutput');
    const result = await runProviderChat(runtime, usesStructuredOutput
      ? { ...request, 'jsonSchema': analysisJsonSchema }
      : request);
    const sections = usesStructuredOutput ? parseSections(result.text) : null;
    if (usesStructuredOutput && !sections) {
      throw new HttpError(502, 'AI analysis returned no usable sections');
    }
    return {
      'provider': providerName,
      'sections': sections || [ { 'title': 'AI Analysis', 'content': result.text } ]
    };
  } catch (error) {
    throw toHttpError(error, 'AI analysis failed');
  }
}
