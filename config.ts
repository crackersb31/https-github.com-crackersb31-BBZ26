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