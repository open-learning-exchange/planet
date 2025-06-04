export const surveyAnalysisPrompt = (examType, examName, examDescription, payloadString) => $localize`The following is a ${examType} named “${examName}” with description “${examDescription}”.
  ${payloadString}

  Please generate a detailed AI Analysis for PDF export, organized into three sections:

  1. INDIVIDUAL QUESTION ANALYSIS
    a. **Closed-ended questions:**
        - List the top three answer choices with absolute counts and percentages.
        - Call out any low-frequency responses (<10%) that reveal surprising insights.
    b. **Open-ended question(s):**
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
      - **Age groups:**
      - **Gender** (if available)
    - For each cohort, list their top two choices per closed-ended question (counts + percentages).
    - Report only differences from the overall sample exceeding 20 percentage points.

  Ensure every numeric insight shows both count and percentage. Use clear headings, subheadings, bullet points, and simple tables where helpful for a clean PDF layout.`;

export const coursesStepPrompt = (stepTitle, stepDescription) => $localize`The following information is a course step from the "${stepTitle}" course with a description "${stepDescription}". Be sure to assist the learner in the best way you can. `;
