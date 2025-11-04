

export interface RowData {
  id: number;
  thematique: string;
  origine: string;
  difficulte: string;
  synthese: string;
  nature: string;
  estimation: string;
  contributions: number[];
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
}