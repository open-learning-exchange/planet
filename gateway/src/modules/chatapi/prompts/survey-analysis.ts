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

/** Output contract requested from providers that support strict structured responses. */
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

export const buildSurveyAnalysisPrompt = (exam: AnalyzeExam, questions: AnalyzeQuestion[]): string => {
  const payloadString = JSON.stringify(questions);
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
