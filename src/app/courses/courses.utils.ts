export const stepHasExam = (step: any) => !!step?.exam?.questions?.length;

const requiresPass = (step: any) => stepHasExam(step) && !!step.passingRequired;

// myPlanet sends marks as '' and scores each such question as 1
export const questionMarks = ({ marks }: any) => marks === '' ? 1 : Number(marks);

// Judged against the test as the learner took it, so a later edit never takes a pass away
export const attemptPasses = ({ status, grade, parent: { questions, passingPercentage } }: any) => {
  // Planet's copy has no totalMarks, so the marks are summed. myPlanet sends the pass mark as '' and scores it as 100.
  const totalMarks = questions.reduce((total: number, question: any) => total + questionMarks(question), 0);
  const passMark = passingPercentage === '' ? 100 : passingPercentage ?? 100;
  // Compared without dividing: 29 / 50 * 100 is 57.99999999999999 and would miss a 58% pass mark
  return status === 'complete' && totalMarks > 0 && grade * 100 >= passMark * totalMarks;
};

const stepPassed = (progress: any[], stepNum: number) => progress.some((p: any) => p.stepNum === stepNum && p.passed);

// Index of the first step whose exam must be passed and isn't (-1 when none); every later step is locked behind it
export const blockingStepIndex = (steps: any[], progress: any[]) =>
  (steps || []).findIndex((step, index) => requiresPass(step) && !stepPassed(progress || [], index + 1));

// A step can have several progress docs; a passed one wins
export const stepProgress = (progress: any[], stepNum: number) =>
  (progress || []).find((p: any) => p.stepNum === stepNum && p.passed) || (progress || []).find((p: any) => p.stepNum === stepNum);

export const openableResources = (step: any, library: Map<string, any>) => {
  const resources = step.resources.map((resource: any) => library.get(resource._id)).filter((resource: any) => resource?._attachments);
  return { resources, unavailableResources: step.resources.length - resources.length };
};

export const stepLocked = (steps: any[], progress: any[], stepIndex: number) => {
  const blocking = blockingStepIndex(steps, progress);
  return blocking > -1 && stepIndex > blocking;
};
