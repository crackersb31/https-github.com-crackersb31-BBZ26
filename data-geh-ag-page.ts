import { type RowData, type RowDataAg } from './types';
import { INITIAL_DATA_GEH_AG } from './data-geh-ag';

// Mappe les codes de difficulté numériques à des chaînes avec icônes pour l'affichage.
const difficultyMap: Record<string, string> = {
    "1": "🔴 Très difficile",
    "2": "🟡 Difficile",
    "3": "🟢 Facile",
    "4": "⚡ Très facile",
};

/**
 * Transforme une ligne de données brutes du format GEH AG (RowDataAg)
 * vers le format standard de l'application (RowData) pour l'affichage dans le tableau.
 * @param row - L'objet de données brutes.
 * @returns L'objet de données transformé.
 */
const transformData = (row: RowDataAg): RowData => {
  // Concatène les estimations de gains si elles existent, sinon affiche un tiret.
  const estimation = [row.gainsAnneePleine1, row.gainsAnneePleine2]
    .filter(Boolean) // Supprime les chaînes vides ou null
    .join(' / ');

  return {
    id: row.id,
    thematique: row.macroActivite,
    thematiqueComment: '',
    origine: row.eob || "Non spécifié",
    difficulte: difficultyMap[row.difficulte] || "—",
    synthese: row.prerequis,
    nature: row.natureLevier,
    estimation: estimation || "—",
    estimationComment: '',
    contributions: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Initialise les contributions à 0
    comments: {} // Initialise les commentaires
  };
};

// Applique la transformation à toutes les données initiales de GEH AG.
export const INITIAL_DATA_GEH_AG_PAGE: RowData[] = INITIAL_DATA_GEH_AG.map(transformData);