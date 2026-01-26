

export interface RowData {
  id: number;
  thematique: string;
  thematiqueComment?: string;
  origine: string;
  difficulte: string;
  synthese: string;
  nature: string;
  estimation: string;
  estimationComment?: string;
  contributions: (number | string)[];
  comments?: Record<string, string>;
  isUserCreated?: boolean;
  isLocked?: boolean;
  isCommitteeSelected?: boolean;
  domainTag?: string | null;
  domainResponse?: string | null;
  [key: string]: any;
}

export interface RowDataAg {
  id: number;
  eob: string;
  macroActivite: string;
  natureLevier: string;
  typeLevier: string;
  gainsAnneePleine1: string;
  gainsAnneePleine2: string;
  premiereAnneeGain: string;
  moyensHumains: string;
  moyensFinanciers: string;
  difficulte: string;
  prerequis: string;
}

export interface HistoryEntry {
  timestamp: string;
  user: string;
  rowId: number;
  rowThematique: string;
  field: string;
  oldValue: string;
  newValue: string;
  pageKey?: string;
}

export interface LoginEntry {
  timestamp: string;
  user: string;
}

export interface Column {
  key: string;
  header: string;
  visible: boolean;
  editable: boolean;
  type: 'text' | 'textarea' | 'badge' | 'number' | 'comment';
}

export interface PageConfig {
  id: string;
  title: string;
  subtitle?: string;
  initialData: any[];
  storageKey: string;
  historyKey: string;
  isCustom?: boolean;
  columns?: Column[];
  isFinished?: boolean;
}

export interface AnnouncementConfig {
    isActive: boolean;
    globalMessage: string;
    userMessages: Record<string, string>;
}

export interface SurveyAxis {
  id: string;
  label: string;
}

export interface SurveyTheme {
  id: string;
  title: string;
  objective: string;
  icon: string;
  axes: SurveyAxis[];
}

export interface SurveyResponse {
  userId: string;
  timestamp: string;
  ratings: Record<string, number>; // axisId -> 1 to 5
  comments: Record<string, string>; // themeId -> text
}
