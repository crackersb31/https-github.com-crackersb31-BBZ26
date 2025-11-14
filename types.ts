export interface RowData {
  id: number;
  thematique: string;
  origine: string;
  difficulte: string;
  synthese: string;
  nature: string;
  estimation: string;
  estimationComment?: string;
  contributions: number[];
  comments?: Record<string, string>; // user -> comment
}

// FIX: Added RowDataAg interface to fix compilation error in data-geh-ag.ts
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
  rowThematique: string; // Used as a reference, will contain 'thematique'
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
  key: keyof RowData | string; // string for future flexibility
  header: string;
  visible: boolean;
  editable: boolean; // Is the column itself (header) editable?
  type: 'text' | 'textarea' | 'badge' | 'number' | 'comment';
}

export interface PageConfig {
  id: string; // Unique ID for the page
  title: string;
  subtitle?: string;
  initialData: any[];
  storageKey: string;
  historyKey: string;
  isCustom?: boolean; // Flag for custom tables
  columns?: Column[]; // Configuration for columns in custom tables
}