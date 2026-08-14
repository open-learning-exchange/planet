// System prompts now live in the gateway as prompt profiles (gateway/src/modules/chatapi/prompts/default-prompts.ts)
// and can be overridden per community from Manager Settings -> AI Configurations.
// Only client-side context builders belong here.

export const coursesStepPrompt = (stepTitle, stepDescription) =>
  $localize`The following information is a course step from the "${stepTitle}" course with a description "${stepDescription}".
  Be sure to assist the learner in the best way you can. `;
