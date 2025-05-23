export const surveyAnalysisPrompt = (examType, examName, examDescription, payloadString) => $localize`The following is a ${examType} with the name ${examName} and description ${examDescription}.
  Please provide a comprehensive analysis of the survey responses in three sections, formatted neatly for a pdf export:

  1. INDIVIDUAL QUESTION ANALYSIS: Insights for each question individually.

  2. CORRELATIONS BETWEEN QUESTIONS: Look for specific patterns in how people answered different questions together.
  Focus on finding the strongest correlations between specific answer choices across different questions.
  Highlight at least 3-5 significant correlations if they exist, especially ones that reveal important insights about the survey purpose.

  3. DEMOGRAPHIC BREAKDOWN: Group responses by demographic factors such as age ranges, gender, and other user inputted demographic information.
  For each demographic group, identify which answer choices were most common for each question.
  Only include demographic insights when there are clear differences between groups.

  ${payloadString}`;

export const coursesStepPrompt = (stepTitle, stepDescription) => $localize`The following information is a course step from the "${stepTitle}" course with a description "${stepDescription}". Be sure to assist the learner in the best way you can. `;
