const requiresPass = (step: any) => !!(step?.exam?.questions?.length && step.passingRequired);

const stepPassed = (progress: any[], stepNum: number) => progress.some((p: any) => p.stepNum === stepNum && p.passed);

// Index of the first step whose exam must be passed and isn't (-1 when none); every later step is locked behind it
export const blockingStepIndex = (steps: any[], progress: any[]) =>
  (steps || []).findIndex((step, index) => requiresPass(step) && !stepPassed(progress || [], index + 1));

// A step can have several progress docs; a passed one wins
export const stepProgress = (progress: any[], stepNum: number) =>
  (progress || []).find((p: any) => p.stepNum === stepNum && p.passed) || (progress || []).find((p: any) => p.stepNum === stepNum);

export const stepLocked = (steps: any[], progress: any[], stepIndex: number) => {
  const blocking = blockingStepIndex(steps, progress);
  return blocking > -1 && stepIndex > blocking;
};
