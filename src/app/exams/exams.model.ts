export interface Exam {
  '_id'?: string;
  '_rev'?: string;
  createdDate: number;
  createdBy: string;
  name: string;
  passingPercentage: number;
  questions: ExamQuestion[];
  type: 'courses' | 'survey';
  updatedDate: number;
  sourcePlanet: string;
}

export interface ExamQuestion {
  body: string;
  type: 'input' | 'textarea' | 'select' | 'selectMultiple' | 'ratingScale';
  correctChoice: string[];
  marks: number;
  choices: { text: string, id: string }[];
}
