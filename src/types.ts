export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface StudyConcept {
  title: string;
  description: string;
}

export interface StudySession {
  id: string;
  userId: string;
  topic: string;
  explanation: string;
  importantConcepts: StudyConcept[];
  realWorldExample: string;
  keyPoints: string[];
  quiz: QuizQuestion[];
  userAnswers?: number[];
  quizScore?: number;
  quizCompleted?: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface SavedChat {
  id: string;
  userId: string;
  title: string;
  topic: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isDemoUser?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}

export type ActiveTab = 'landing' | 'dashboard' | 'studymode' | 'chat' | 'history' | 'profile';
