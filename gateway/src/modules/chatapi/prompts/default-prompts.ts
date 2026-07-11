import { ChatMode } from '../models/chat.model';

/**
 * Built-in prompt profiles. Each can be overridden per community by setting
 * `promptProfiles.<mode>` on the CouchDB configurations document (editable in
 * the manager "AI Configurations" screen).
 */

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

const courseHelp = `
${generalChat}

You are currently assisting a learner inside a course step. The conversation context includes the course step's
title and description, and may include the step's attached resource documents (searchable via the file_search tool).
Ground your answers in that material when it is relevant, cite the documents you draw from, and guide the learner
toward understanding rather than just giving away answers to exams or quizzes.
`.trim();

const surveyAnalysis = `
You are a data analyst for Open Learning Exchange community surveys. You produce rigorous, actionable analysis of
survey responses for community leaders. Every numeric insight must show both the absolute count and the percentage.
Quote open-ended answers verbatim (anonymized) when they illustrate a theme. Be precise: never invent counts,
correlations, or demographics that are not supported by the data provided.
`.trim();

export const defaultPromptProfiles: Record<ChatMode, string> = {
  'general_chat': generalChat,
  'course_help': courseHelp,
  'survey_analysis': surveyAnalysis
};

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

Please generate a detailed AI Analysis organized into 4 sections:

1. INDIVIDUAL QUESTION ANALYSIS
  If the question is a **Closed-ended question (type - select or selectMultiple or rating scale [1-9 choices]):**
      - List the top three answer choices with absolute counts and percentages.
      - In addition to the top three,
       highlight any answer choice with fewer than 10% of responses and suggest why it might be under-selected
      - Create a hypothesis for the selections
  If the question is an **Open-ended question (type - input or textarea):**
      - Require direct quotes with respondent demographics if available.
      - Perform sentiment and keyword analysis
      - Highlight any singular but high-impact outlier suggestions.
      - Highlight the actionability of the suggestions.
      - Force thematic categorization with absolute counts and percentage breakdowns i.e for each theme, provide:
        1. Number and percentage of respondents mentioning it.
        2. One anonymized verbatim quote illustrating the theme.

2. CORRELATIONS BETWEEN QUESTIONS
  - Compute pairwise co-occurrence rates for all multi-choice questions.
  - Identify the four strongest correlations by conditional probability and count.
  - Present each as:
    “X% of respondents who chose ‘A’ in Qn also chose ‘B’ in Qm (Y/Z).”

3. DEMOGRAPHIC BREAKDOWN
  - Define cohorts based on demographic factors such as:
    - **Age groups:** Compare each closed-ended choice across age, gender, and location segments,
      calling out where a choice is at least 15 percentage-points higher or lower than the overall average.
    - **Gender** (if available)
  - For each cohort, list their top two choices per closed-ended question (counts + percentages).
  - Report only differences from the overall sample exceeding 20 percentage points.

4. RECOMMENDATIONS AND INSIGHTS
  - Provide actionable recommendations based on the analysis:
    provide concrete recommendations for how a community initiative could address that top challenge—grounded in the data
  - Highlight any surprising insights or trends.

Return one section object per numbered section above. Each section's content must be well-formed markdown
(headers, paragraphs, unordered lists, numbered lists) suitable for a clean PDF layout.`;
};

/** Strict JSON schema for structured survey-analysis output (OpenAI Responses `text.format`). */
export const analysisJsonSchema = {
  'name': 'survey_analysis',
  'schema': {
    'type': 'object',
    'properties': {
      'sections': {
        'type': 'array',
        'description': 'Ordered analysis sections',
        'items': {
          'type': 'object',
          'properties': {
            'title': { 'type': 'string', 'description': 'Section heading' },
            'content': { 'type': 'string', 'description': 'Section body as markdown' }
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
