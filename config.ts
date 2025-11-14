import { type Column } from './types';

export const teamMembers = ['GEH AG', 'GEH AA', 'GEH TA', 'GMH'];

/**
 * Mappe les codes de connexion aux noms des équipes.
 * La vérification est insensible à la casse (gérée dans App.tsx).
 * Le code de connexion détermine la colonne que l'utilisateur peut modifier.
 */
export const loginCodes: Record<string, string> = {
  'AGHSO26': 'GEH AG',
  'AAHSO26': 'GEH AA', // Code déduit pour GEH AA
  'TAHSO26': 'GEH TA',
  'GMHSO26': 'GMH',   // Code déduit pour GMH
  'ADMINHSO31#': 'ADMIN', // Code spécial pour l'accès administrateur
};

// FIX: Centralized default columns configuration to be used across components.
export const defaultColumns: Column[] = [
    { key: 'thematique', header: 'Thématique / Type de dépense', visible: true, editable: true, type: 'text' },
    { key: 'origine', header: 'Origine du levier', visible: true, editable: true, type: 'text' },
    { key: 'difficulte', header: 'Difficulté de mise en œuvre', visible: true, editable: true, type: 'badge' },
    { key: 'synthese', header: 'Synthèse du levier et de l’objectif BBZ', visible: true, editable: true, type: 'textarea' },
    { key: 'nature', header: 'Nature du levier', visible: true, editable: true, type: 'text' },
    { key: 'estimation', header: 'Estimation / Repère chiffré', visible: true, editable: true, type: 'text' },
];
