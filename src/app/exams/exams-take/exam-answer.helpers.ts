import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { ExamQuestion } from '../exams.model';

export interface ExamAnswerOption {
  id: string;
  text: string;
  isOther?: boolean;
}

export type ExamOtherAnswerOption = ExamAnswerOption & { isOther: true };

export type ExamAnswerValue = string | ExamAnswerOption | ExamAnswerOption[] | null;

export interface StoredExamAnswer {
  value?: ExamAnswerValue;
  valid?: boolean;
}

export interface RestoredExamAnswer {
  value: ExamAnswerValue;
  checkboxState: Record<string, boolean>;
  currentOtherOption: ExamOtherAnswerOption;
}

type SharedExamQuestion = Pick<ExamQuestion, 'type' | 'choices'> & { hasOtherOption?: boolean };

export const createOtherAnswerOption = (text = ''): ExamOtherAnswerOption => ({
  id: 'other',
  text,
  isOther: true
});

export const isExamAnswerOption = (value: ExamAnswerValue | undefined): value is ExamAnswerOption => (
  !!value && !Array.isArray(value) && typeof value === 'object' && 'id' in value
);

export const isOtherAnswerOption = (value: ExamAnswerValue | undefined): value is ExamOtherAnswerOption => (
  isExamAnswerOption(value) && value.isOther === true
);

export const examAnswerValidator: ValidatorFn = (control: AbstractControl<ExamAnswerValue>): ValidationErrors | null => {
  const value = control.value;
  if (typeof value === 'string') {
    return value.trim() ? null : { required: true };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { required: true };
    }
    return value.some(option => isOtherAnswerOption(option) && !option.text.trim()) ? { required: true } : null;
  }

  if (isOtherAnswerOption(value)) {
    return value.text.trim() ? null : { required: true };
  }

  return value !== null && value !== undefined ? null : { required: true };
};

export const addCheckedAnswer = (
  currentValue: ExamAnswerValue,
  option: ExamAnswerOption,
  checked: boolean
): ExamAnswerOption[] | null => {
  const nextValue = Array.isArray(currentValue) ? [ ...currentValue ] : [];
  const optionIndex = nextValue.findIndex(value => value.id === option.id);

  if (checked && optionIndex === -1) {
    nextValue.push(option);
  } else if (checked && option.id === 'other' && optionIndex > -1) {
    nextValue[optionIndex] = option;
  } else if (!checked && optionIndex > -1) {
    nextValue.splice(optionIndex, 1);
  }

  return nextValue.length > 0 ? nextValue : null;
};

export const restoreExamAnswer = (
  question: SharedExamQuestion | null | undefined,
  storedAnswer?: StoredExamAnswer | null
): RestoredExamAnswer => {
  const currentOtherOption = createOtherAnswerOption();
  const answerValue = storedAnswer?.value;

  if (!question || answerValue === null || answerValue === undefined) {
    return { value: null, checkboxState: {}, currentOtherOption };
  }

  if (question.type === 'selectMultiple' && Array.isArray(answerValue)) {
    const checkboxState = answerValue.reduce<Record<string, boolean>>((state, option) => {
      state[option.id] = true;
      return state;
    }, {});
    const restoredAnswers = answerValue.map(option => {
      if (option.id !== 'other') {
        return question.choices.find(choice => choice.id === option.id) || option;
      }
      currentOtherOption.text = option.text || '';
      return currentOtherOption;
    });
    return { value: restoredAnswers, checkboxState, currentOtherOption };
  }

  if (question.type === 'select' && isExamAnswerOption(answerValue)) {
    if (isOtherAnswerOption(answerValue)) {
      currentOtherOption.text = answerValue.text || '';
      return { value: currentOtherOption, checkboxState: {}, currentOtherOption };
    }

    const selectedChoice = question.choices.find(choice => choice.id === answerValue.id) ||
      question.choices.find(choice => choice.text === answerValue.text) ||
      answerValue;
    return { value: selectedChoice, checkboxState: {}, currentOtherOption };
  }

  return { value: answerValue, checkboxState: {}, currentOtherOption };
};
