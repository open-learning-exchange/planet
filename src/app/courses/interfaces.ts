import { Step, Course } from '../shared/services';

export { Step, Course } from '../shared/services';

export interface FormStep extends Step {
    id?: string;
}
export interface FormCourse {
    form: Course;
    steps: FormStep[];
}
