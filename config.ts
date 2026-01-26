
import { type Column, type SurveyTheme } from './types';

export const teamMembers = ['DCOM', 'DRH', 'SST', 'DC', 'DF', 'DT', 'GEH AG', 'GEH AA', 'GEH TA', 'GMH'];

export const loginCodes: Record<string, string> = {
  'DCOMHSO26': 'DCOM',
  'DRHHSO26': 'DRH',
  'SSTHSO26': 'SST',
  'DCHSO26': 'DC',
  'DFHSO26': 'DF',
  'DTHSO26': 'DT',
  'AGHSO26': 'GEH AG',
  'AAHSO26': 'GEH AA',
  'TAHSO26': 'GEH TA',
  'GMHSO26': 'GMH',
  'ADMINHSO31#': 'ADMIN',
};

export const defaultColumns: Column[] = [
    { key: 'thematique', header: 'Thématique / Type de dépense', visible: true, editable: true, type: 'text' },
    { key: 'origine', header: 'Origine du levier', visible: true, editable: true, type: 'text' },
    { key: 'difficulte', header: 'Difficulté de mise en œuvre', visible: true, editable: true, type: 'badge' },
    { key: 'synthese', header: 'Synthèse du levier et de l’objectif BBZ', visible: true, editable: true, type: 'textarea' },
    { key: 'nature', header: 'Nature du levier', visible: true, editable: true, type: 'text' },
    { key: 'estimation', header: 'Assiette 25', visible: true, editable: true, type: 'text' },
    { key: 'estimationComment', header: 'Commentaire Estimation', visible: true, editable: true, type: 'textarea' },
];

export const difficultyOptions: string[] = [
    '⚡ Très facile',
    '🟢 Facile',
    '🟡 Moyenne',
    '🟡 Difficile',
    '🔴 Très difficile',
];

export const surveyThemes: SurveyTheme[] = [
  { 
    id: 't1', title: '1. Programme des hydroguides et communication associée', icon: '🌊',
    objective: 'Évaluer l’efficience et le dimensionnement du dispositif.',
    axes: [
      { id: 't1a1', label: 'Vérifier que les missions sont réellement indispensables et non substituables' },
      { id: 't1a2', label: 'Analyser l’adéquation des moyens humains et organisationnels avec les besoins' },
      { id: 't1a3', label: 'Réexaminer l’utilité, le ciblage et le coût des actions de communication' },
      { id: 't1a4', label: 'Construire des scénarios clairs de dimensionnement (maintien / ajustement)' }
    ]
  },
  { 
    id: 't2', title: '2. Formation – stratégie et optimisation des moyens', icon: '🎓',
    objective: 'Optimiser l’enveloppe globale et les modalités pédagogiques.',
    axes: [
      { id: 't2a1', label: 'Clarifier les priorités en lien avec les compétences réellement nécessaires' },
      { id: 't2a2', label: 'Réexaminer la pertinence et le coût des formations réalisées localement' },
      { id: 't2a3', label: 'Optimiser l’organisation des sessions (fréquence, taille, modalités)' },
      { id: 't2a4', label: 'Prioriser les formations au regard des contraintes opérationnelles' },
      { id: 't2a5', label: 'Revoir la fréquence et la stratégie des recyclages et habilitations' }
    ]
  },
  { 
    id: 't3', title: '3. Pilotage des contrôles réglementaires', icon: '⚖️',
    objective: 'Passer d’une logique de réflexe à un pilotage collectif discerné.',
    axes: [
      { id: 't3a1', label: 'Cartographier les dépenses (obligations vs préconisations)' },
      { id: 't3a2', label: 'Identifier les contrôles réalisés au-delà des exigences réglementaires' },
      { id: 't3a3', label: 'Définir un cadre partagé de hiérarchisation des contrôles' },
      { id: 't3a4', label: 'Étudier l’internalisation possible de certains contrôles' },
      { id: 't3a5', label: 'Mettre en place un pilotage budgétaire annuel structuré' }
    ]
  },
  { 
    id: 't4', title: '4. Gestion des risques sanitaires – amiante et radon', icon: '☢️',
    objective: 'Clarifier la frontière entre obligations et bonnes pratiques.',
    axes: [
      { id: 't4a1', label: 'Clarifier précisément les obligations réglementaires applicables' },
      { id: 't4a2', label: 'Comparer les pratiques entre sites et identifier les écarts' },
      { id: 't4a3', label: 'Objectiver le coût global de la gestion actuelle de ces risques' },
      { id: 't4a4', label: 'Construire un plan d’action hiérarchisé conciliant sécurité et optimisation' },
      { id: 't4a5', label: 'Améliorer la communication interne et la lisibilité des règles' }
    ]
  },
  { 
    id: 't5', title: '5. Maintenance courante', icon: '🛠️',
    objective: 'Réviser la planification pour mieux dimensionner les besoins.',
    axes: [
      { id: 't5a1', label: 'Analyser l’adéquation du plan de maintenance aux besoins réels' },
      { id: 't5a2', label: 'Identifier les postes de maintenance à fort enjeu budgétaire' },
      { id: 't5a3', label: 'Clarifier les critères d’internalisation ou d’externalisation' },
      { id: 't5a4', label: 'Rationaliser la gestion des stocks et de la logistique' },
      { id: 't5a5', label: 'Simplifier l’articulation maintenance courante / préventive / corrective' }
    ]
  },
  { 
    id: 't6', title: '6. Entretien des espaces verts', icon: '🍃',
    objective: 'Maîtriser la croissance des dépenses via un cadre stratégique.',
    axes: [
      { id: 't6a1', label: 'Définir une doctrine unitaire et des priorités sur les zones critiques' },
      { id: 't6a2', label: 'Mettre en place un pilotage ou un référent stratégique au niveau de l’unité' },
      { id: 't6a3', label: 'Développer des leviers de mutualisation (marchés, équipements)' },
      { id: 't6a4', label: 'Formaliser un guide de bonnes pratiques et de priorisation' },
      { id: 't6a5', label: 'Estimer le potentiel de réduction des coûts et conditions de mise en œuvre' }
    ]
  },
  { 
    id: 't7', title: '7. Frais de déplacement', icon: '🚗',
    objective: 'Assurer l’équité et la maîtrise budgétaire.',
    axes: [
      { id: 't7a1', label: 'Clarifier et harmoniser les règles de remboursement' },
      { id: 't7a2', label: 'Sécuriser le dispositif pour éviter incohérences et cumuls' },
      { id: 't7a3', label: 'Réexaminer l’équilibre forfait / remboursement au réel' },
      { id: 't7a4', label: 'Clarifier les règles d’utilisation des véhicules pour les trajets longs' }
    ]
  },
  { 
    id: 't8', title: '8. Communication – gouvernance et budget', icon: '📢',
    objective: 'Clarifier le financement et optimiser l’efficience.',
    axes: [
      { id: 't8a1', label: 'Clarifier la répartition des budgets de communication' },
      { id: 't8a2', label: 'Définir des seuils clairs de validation des dépenses' },
      { id: 't8a3', label: 'Améliorer la consolidation et le suivi des dépenses' },
      { id: 't8a4', label: 'Identifier des leviers de mutualisation et d’optimisation des coûts' }
    ]
  },
  { 
    id: 't9', title: '9. Partenariats et mécénat', icon: '🤝',
    objective: 'Éclairer et assumer une stratégie claire de performance.',
    axes: [
      { id: 't9a1', label: 'Clarifier la stratégie et les objectifs poursuivis' },
      { id: 't9a2', label: 'Mesurer plus objectivement l’impact réel des engagements' },
      { id: 't9a3', label: 'Rationaliser ou recentrer certains partenariats' },
      { id: 't9a4', label: 'Mettre fin au saupoudrage par un cadre de décision clair' }
    ]
  },
  { 
    id: 't10', title: '10. Dotation vestimentaire', icon: '👕',
    objective: 'Optimisation ciblée : montagne et cadres.',
    axes: [
      { id: 't10a1', label: 'Revoir la dotation spécifique « montagne » pour optimiser les coûts' },
      { id: 't10a2', label: 'Réexaminer la dotation destinée aux cadres' },
      { id: 't10a3', label: 'Étudier des alternatives fournisseurs à qualité équivalente' },
      { id: 't10a4', label: 'Planifier des économies ciblées à partir de 2027' }
    ]
  },
  { 
    id: 't11', title: '11. Approvisionnement en matériel informatique : cadrage, rationalisation et inventaire', icon: '💻',
    objective: 'Rationalisation du parc et optimisation du cycle de vie.',
    axes: [
      { id: 't11a1', label: 'Cadrage des règles d’achat et de budget : Définir clairement les responsabilités d’achat (DSI, services, sous-unités), les budgets affectés et les typologies de matériel éligibles selon les besoins métiers.' },
      { id: 't11a2', label: 'Réalisation d’un inventaire complet et dynamique du parc informatique, permettant de visualiser l’allocation, l’état et l’utilisation des équipements.' },
      { id: 't11a3', label: 'Identification et valorisation des matériels dormants ou sous-utilisés : analyser les causes de la redondance (exemple type : équipements fixes non mutualisables) et proposer un plan de réaffectation ou de reconditionnement.' },
      { id: 't11a4', label: 'Élaboration d’une politique de renouvellement et de mutualisation : définir des critères objectifs pour le remplacement d’équipements et promouvoir le partage de ressources (tablettes, équipements nomades) entre services ou sites.' }
    ]
  }
];
