import { AIProvider, ProviderName } from '../models/chat.model';
import { analysisJsonSchema, AnalyzeExam, AnalyzeQuestion, buildSurveyAnalysisPrompt } from '../prompts/default-prompts';
import { getAIConfig } from './config.service';
import { runProviderChat } from '../providers';
import { HttpError, toHttpError } from '../utils/http-error';

export interface AnalyzePayload {
  exam: AnalyzeExam;
  questions: AnalyzeQuestion[];
  aiProvider?: AIProvider;
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
    return Array.isArray(parsed?.sections) && parsed.sections.every(isValidSection) ? parsed.sections : null;
  } catch (error) {
    return null;
  }
};

/**
 * Survey/exam analysis with structured output. OpenAI runs with a strict JSON
 * schema so the client gets typed sections; other providers fall back to a
 * single markdown section.
 */
export async function analyze(payload: AnalyzePayload): Promise<AnalysisResult> {
  if (!payload?.exam?.name || typeof payload.exam.name !== 'string') {
    throw new HttpError(400, '"exam.name" is a required string field');
  }
  if (!Array.isArray(payload.questions) || payload.questions.length === 0) {
    throw new HttpError(400, '"questions" must be a non-empty array');
  }

  const config = await getAIConfig();
  const providerName: ProviderName = payload.aiProvider?.name && config.providers[payload.aiProvider.name]
    ? payload.aiProvider.name
    : 'openai';
  const runtime = config.providers[providerName];
  const request = {
    'model': payload.aiProvider?.model || runtime.defaultModel,
    'messages': [ { 'role': 'user' as const, 'content': buildSurveyAnalysisPrompt(payload.exam, payload.questions) } ],
    'instructions': config.promptProfiles.survey_analysis
  };

  try {
    if (providerName === 'openai') {
      const result = await runProviderChat(runtime, { ...request, 'jsonSchema': analysisJsonSchema });
      const sections = parseSections(result.text);
      return { 'provider': providerName, 'sections': sections || [ { 'title': 'AI Analysis', 'content': result.text } ] };
    }
    const result = await runProviderChat(runtime, request);
    return { 'provider': providerName, 'sections': [ { 'title': 'AI Analysis', 'content': result.text } ] };
  } catch (error) {
    throw toHttpError(error, 'AI analysis failed');
  }
}
