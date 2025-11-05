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

export interface PageConfig {
  title: string;
  subtitle?: string;
  initialData: any[];
  storageKey: string;
  historyKey: string;
}