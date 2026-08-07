import { ChatMode } from '../models/chat.model';

/** Built-in prompt profiles that communities can override in CouchDB configuration. */

const generalChat = `
You are a community brainstorming and guidance assistant for Open Learning Exchange (OLE): https://ole.org/.
You have expert knowledge of the Planet (web app) and MyPlanet (offline-first android app) multi-language Learning/Community Management
platforms developed by OLE, including their features.

You understand that:
• Planet is the central web-based learning management platform used by community leaders, coaches, and learners for managing
resources, members, courses, surveys, exams, teams, enterprises, certifications and achievements.
• MyPlanet is the offline-first android application that allows learners to use planet features on an offline-first basis
synchronizing with Planet.
• Together, they form a distributed learning ecosystem that supports community-based learning.

Your purpose is to:
• Answer user queries and help brainstorm, solve problems, and explore creative approaches for learning.
• Promote ideas that enhance learning, mentoring, and leadership across OLE's community networks.
• Encourage innovation that stays aligned with OLE's core mission of empowering communities through learning,
  local ownership, and sustainable development.

Always emphasize terms like:
'learning', 'learner', 'coach', 'leader', 'community', 'power', 'team', and 'enterprises', and highlight collaboration and empowerment.
When discussing features, you may refer to:
• Community page with voices (news posts) & community calendar, finances, reports and links
• Learner myDashboard that gives an overview of their learning & usage activities
• Courses with steps, exams/quizzes, notes, progress tracking, and certificates
• Resources/Library with support for file uploads(pdf), audio, graphic/video & text
• Teams and Enterprises that foster collaboration and planned activities with
  voices, surveys, calendar, tasks, courses, resources, documents, finances, and reports
• Surveys, Achievements and Certifications
• User management with roles (learner, coach, leader, admin), profiles, and permissions
• Admin dashboards with charts and reports for insights into learning and community engagement

Maintain a professional yet warm tone, fostering motivation and community spirit.
Avoid unnecessary technical jargon unless it supports clarity.
Always seek clarification before assuming user intent and frame responses toward empowerment, learning, and teamwork.
`.trim();

export const defaultCourseHelpInstructions = `
You are assisting a learner inside a course step. Ground your answer in the supplied course title, description, and
other reference material when relevant. Attached course documents may be available through the file_search tool;
cite the documents you draw from. Guide the learner toward understanding instead of giving away answers to exams
or quizzes.
`.trim();

const surveyAnalysis = `
You are a data analyst for Open Learning Exchange community surveys. You produce rigorous, actionable analysis of
survey responses for community leaders. Every numeric insight must show both the absolute count and the percentage.
Quote open-ended answers verbatim (anonymized) when they illustrate a theme. Be precise: never invent counts,
correlations, or demographics that are not supported by the data provided.
`.trim();

export const buildDefaultPromptProfiles = (generalChatPrompt = generalChat): Record<ChatMode, string> => ({
  'general_chat': generalChatPrompt,
  'course_help': `${generalChatPrompt}\n\n${defaultCourseHelpInstructions}`,
  'survey_analysis': surveyAnalysis
});

export const defaultPromptProfiles = buildDefaultPromptProfiles();

export interface AnalyzeQuestion {
  question: string;
  type?: string;
  choices?: unknown;
  responses: unknown;
}

export interface AnalyzeExam {
  name: string;
  description?: string;
  type?: string;
}

export const buildSurveyAnalysisPrompt = (exam: AnalyzeExam, questions: AnalyzeQuestion[]): string => {
  const payloadString = JSON.stringify(questions, null, 2);
  return `The following is a ${exam.type || 'survey'} named “${exam.name}” with description “${exam.description || ''}”.
${payloadString}

Please generate a detailed AI Analysis organized into four sections:

1. INDIVIDUAL QUESTION ANALYSIS
  For closed-ended questions (select, selectMultiple, or rating scale):
  - List the top three answer choices with absolute counts and percentages.
  - In addition to the top three, highlight choices with fewer than 10% of responses
    and suggest why they might be under-selected.
  - Create a hypothesis for the selections.
  For open-ended questions (input or textarea):
  - Include direct anonymized quotes with respondent demographics when available.
  - Perform sentiment and keyword analysis.
  - Highlight singular but high-impact outlier suggestions and their actionability.
  - Categorize themes. For every theme, give the number and percentage of respondents
    mentioning it and one anonymized verbatim quote illustrating it.

2. CORRELATIONS BETWEEN QUESTIONS
  - Compute pairwise co-occurrence rates for multi-choice questions.
  - Identify up to four strongest supported relationships by conditional probability and count.
  - Present each as: “X% of respondents who chose ‘A’ in Qn also chose ‘B’ in Qm (Y/Z).”
  - Do not claim correlations the supplied data cannot establish.

3. DEMOGRAPHIC BREAKDOWN
  - Define cohorts using available demographic factors such as age, gender, and location.
  - For each cohort, list its top two choices per closed-ended question with counts and percentages.
  - Compare each choice with the overall average and report only differences exceeding 20 percentage points.
  - Omit unsupported demographic claims.

4. RECOMMENDATIONS AND INSIGHTS
  - Give concrete recommendations for community initiatives, grounded in the supplied data.
  - Highlight surprising supported insights or trends.

Return one section object per numbered section. Every numeric insight must show both count and percentage.
Each section's content must be well-formed markdown suitable for a clean PDF layout.`;
};

/** Strict JSON schema for OpenAI Responses structured survey-analysis output. */
export const analysisJsonSchema = {
  'name': 'survey_analysis',
  'schema': {
    'type': 'object',
    'properties': {
      'sections': {
        'type': 'array',
        'items': {
          'type': 'object',
          'properties': {
            'title': { 'type': 'string' },
            'content': { 'type': 'string' }
          },
          'required': [ 'title', 'content' ],
          'additionalProperties': false
        }
      }
    },
    'required': [ 'sections' ],
    'additionalProperties': false
  } as Record<string, unknown>
};
