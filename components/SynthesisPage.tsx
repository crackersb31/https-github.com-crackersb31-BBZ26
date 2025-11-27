

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase-config';
import { type RowData, type PageConfig } from '../types';
import { teamMembers } from '../config';

interface SynthesisPageProps {
  onBack: () => void;
  pageConfigs: PageConfig[];
}

type SortConfig = {
    key: keyof RowData | 'total' | `contrib_${number}`;
    direction: 'ascending' | 'descending';
} | null;

const ITEMS_PER_PAGE = 20;

// Helper pour convertir n'importe quelle entrée en nombre pour le calcul local
const safeParseFloat = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleanStr = String(val).replace(/,/g, '.').replace(/[\s\u00A0]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
};

const SynthesisPage: React.FC<SynthesisPageProps> = ({ onBack, pageConfigs }) => {
  const [aggregatedData, setAggregatedData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'thematique', direction: 'ascending' });
  
  const [filters, setFilters] = useState({
    thematique: '',
    origine: 'all',
    difficulte: 'all',
    nature: 'all',
    contribution: null as number | null,
  });
  
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  
  const [activePopover, setActivePopover] = useState<string | null>(null);
  const [popoverInput, setPopoverInput] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const allPromises = pageConfigs.map(async (config) => {
          const docRef = db.collection('pagesData').doc(config.storageKey);
          const docSnap = await docRef.get();
          if (docSnap.exists) {
            return docSnap.data()?.rows as RowData[];
          }
          return config.initialData as RowData[];
        });
        
        const allPagesData = await Promise.all(allPromises);
        const allRows = allPagesData.flat();

        const aggregationMap = new Map<string, RowData>();
        allRows.forEach(row => {
          if (!row || !row.thematique) return;
          const existingRow = aggregationMap.get(row.thematique);
          if (existingRow) {
            existingRow.contributions = existingRow.contributions.map((c, i) => safeParseFloat(c) + safeParseFloat(row.contributions[i]));
          } else {
            // Ensure existing contributions are also numbers
            const newRow = JSON.parse(JSON.stringify(row));
            newRow.contributions = newRow.contributions.map((c: any) => safeParseFloat(c));
            aggregationMap.set(row.thematique, newRow);
          }
        });
        
        setAggregatedData(Array.from(aggregationMap.values()));
      } catch (err) {
        console.error("Erreur lors de la récupération des données de synthèse", err);
        setError("Impossible de charger les données de synthèse.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [pageConfigs]);

  const uniqueOrigines = useMemo(() => ['all', ...Array.from(new Set(aggregatedData.map(r => r.origine).filter(Boolean))).sort()], [aggregatedData]);
  const uniqueDifficultes = useMemo(() => ['all', ...Array.from(new Set(aggregatedData.map(r => r.difficulte).filter(Boolean))).sort()], [aggregatedData]);
  const uniqueNatures = useMemo(() => ['all', ...Array.from(new Set(aggregatedData.map(r => r.nature).filter(Boolean))).sort()], [aggregatedData]);

  const sortedAndFilteredData = useMemo(() => {
    let data = [...aggregatedData];
    
    data = data.filter(row => {
        const thematiqueMatch = filters.thematique ? (row.thematique.toLowerCase().includes(filters.thematique.toLowerCase()) || row.synthese.toLowerCase().includes(filters.thematique.toLowerCase())) : true;
        const origineMatch = filters.origine === 'all' ? true : row.origine === filters.origine;
        const difficulteMatch = filters.difficulte === 'all' ? true : row.difficulte === filters.difficulte;
        const natureMatch = filters.nature === 'all' ? true : row.nature === filters.nature;
        const contributionMatch = filters.contribution !== null ? (safeParseFloat(row.contributions[filters.contribution])) > 0 : true;
        
        let hideEmptyMatch = true;
        if (hideEmptyRows) {
            const total = row.contributions.reduce((sum, c) => sum + safeParseFloat(c), 0);
            if (total === 0) hideEmptyMatch = false;
        }

        return thematiqueMatch && origineMatch && difficulteMatch && natureMatch && contributionMatch && hideEmptyMatch;
    });
    
    if (sortConfig) {
      data.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'total') {
            aValue = a.contributions.reduce((s, c) => s + safeParseFloat(c), 0);
            bValue = b.contributions.reduce((s, c) => s + safeParseFloat(c), 0);
        } else if (String(sortConfig.key).startsWith('contrib_')) {
            const index = parseInt(String(sortConfig.key).split('_')[1]);
            aValue = safeParseFloat(a.contributions[index]);
            bValue = safeParseFloat(b.contributions[index]);
        } else {
            aValue = a[sortConfig.key as keyof RowData] as any;
            bValue = b[sortConfig.key as keyof RowData] as any;
        }
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return data;
  }, [aggregatedData, sortConfig, filters, hideEmptyRows]);
  
  const resetAllFilters = () => {
    setFilters({ thematique: '', origine: 'all', difficulte: 'all', nature: 'all', contribution: null });
    setHideEmptyRows(false);
  };
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, hideEmptyRows]);

  const totalPages = Math.ceil(sortedAndFilteredData.length / ITEMS_PER_PAGE);
  const currentItems = sortedAndFilteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const requestSort = (key: SortConfig['key']) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortConfig['key']) => {
    if (!sortConfig || sortConfig.key !== key) return '';
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== '' && v !== 'all' && v !== null).length + (hideEmptyRows ? 1 : 0);
  
  // Fonction d'export CSV
  const handleExportCSV = () => {
      // 1. Filtrer les données pour ne garder que celles avec un Total > 0
      // On se base sur les données déjà filtrées par l'utilisateur (recherche, etc.)
      const dataToExport = sortedAndFilteredData.filter(row => {
         const total = row.contributions.reduce((a, b) => a + safeParseFloat(b), 0);
         return total > 0;
      });

      if (dataToExport.length === 0) {
        alert("Aucune ligne non vide (Total > 0) à exporter avec les filtres actuels.");
        return;
      }

      // 2. Définir les en-têtes (uniquement les colonnes visibles)
      const headers = [
        "Thématique", "Synthèse", "Origine", "Difficulté", "Nature", "Assiette 25",
        ...teamMembers.map(m => `Contrib. ${m}`),
        "Total"
      ];

      // 3. Construire le contenu CSV avec séparateur point-virgule
      const csvContent = [
        headers.join(";"),
        ...dataToExport.map(row => {
          const total = row.contributions.reduce((a, b) => a + safeParseFloat(b), 0);
          const fields = [
            row.thematique,
            row.synthese,
            row.origine,
            row.difficulte,
            row.nature,
            row.estimation,
            ...teamMembers.map((_, i) => safeParseFloat(row.contributions[i])),
            total
          ];
          // Échapper les guillemets et envelopper les champs textuels
          return fields.map(f => `"${String(f || '').replace(/"/g, '""')}"`).join(";");
        })
      ].join("\n");

      // 4. Déclencher le téléchargement avec BOM pour UTF-8 (support Excel)
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Synthese_Globale_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const renderFilterPopover = () => {
    if (!activePopover) return null;

    const applyPopoverFilter = () => {
        setFilters(f => ({ ...f, [activePopover]: popoverInput }));
        setActivePopover(null);
    };

    const clearPopoverFilter = () => {
        const defaultValue = activePopover === 'thematique' ? '' : 'all';
        setFilters(f => ({ ...f, [activePopover]: defaultValue }));
        setPopoverInput('');
        setActivePopover(null);
    };

    let content;
    switch (activePopover) {
      case 'thematique':
        content = (
            <div>
                <input
                    type="text"
                    autoFocus
                    value={popoverInput}
                    onChange={e => setPopoverInput(e.target.value)}
                    className="w-full border border-gray-300 rounded p-1 mb-2"
                    onKeyDown={e => e.key === 'Enter' && applyPopoverFilter()}
                />
            </div>
        );
        break;
      case 'origine':
        content = (
            <ul className="max-h-60 overflow-y-auto">
                {uniqueOrigines.map(o => <li key={o}><button className="w-full text-left p-1 hover:bg-gray-100" onClick={() => { setFilters(f => ({ ...f, origine: o })); setActivePopover(null); }}>{o === 'all' ? 'Toutes les origines' : o}</button></li>)}
            </ul>
        );
        break;
      case 'difficulte':
        content = (
            <ul className="max-h-60 overflow-y-auto">
                {uniqueDifficultes.map(d => <li key={d}><button className="w-full text-left p-1 hover:bg-gray-100" onClick={() => { setFilters(f => ({ ...f, difficulte: d })); setActivePopover(null); }}>{d === 'all' ? 'Toutes les difficultés' : d}</button></li>)}
            </ul>
        );
        break;
      case 'nature':
        content = (
            <ul className="max-h-60 overflow-y-auto">
                {uniqueNatures.map(n => <li key={n}><button className="w-full text-left p-1 hover:bg-gray-100" onClick={() => { setFilters(f => ({ ...f, nature: n })); setActivePopover(null); }}>{n === 'all' ? 'Toutes les natures' : n}</button></li>)}
            </ul>
        );
        break;
      default: return null;
    }
    
    return (
        <div ref={popoverRef} className="absolute top-full mt-2 bg-white border rounded-lg shadow-xl z-30 p-4 w-64">
            {content}
            {(activePopover === 'thematique') && (
                 <div className="flex justify-end gap-2 mt-2">
                    <button onClick={clearPopoverFilter} className="text-sm text-gray-600 hover:underline">Effacer</button>
                    <button onClick={applyPopoverFilter} className="text-sm bg-blue-500 text-white px-3 py-1 rounded">Appliquer</button>
                </div>
            )}
        </div>
    );
  };
  
  const FilterableHeader = ({ title, filterKey }: { title: string, filterKey: 'thematique' | 'origine' | 'difficulte' | 'nature' }) => (
    <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap relative">
      <button onClick={() => {
          setPopoverInput(filters[filterKey] === 'all' ? '' : filters[filterKey]);
          setActivePopover(activePopover === filterKey ? null : filterKey);
      }} className={`hover:text-blue-600 ${filters[filterKey] !== '' && filters[filterKey] !== 'all' ? 'text-blue-600 font-bold' : ''}`}>
        {title} {filters[filterKey] !== '' && filters[filterKey] !== 'all' && '🔹'}
      </button>
      {activePopover === filterKey && renderFilterPopover()}
    </th>
  );
  
  const getDifficultyBadge = (difficulty: string) => {
    const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full inline-block whitespace-nowrap";
    if (difficulty.includes('Très facile')) return <span className={`${baseClasses} bg-green-100 text-green-800`}>{difficulty}</span>;
    if (difficulty.includes('Facile')) return <span className={`${baseClasses} bg-emerald-100 text-emerald-800`}>{difficulty}</span>;
    if (difficulty.includes('Moyenne')) return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>{difficulty}</span>;
    if (difficulty.includes('Difficile')) return <span className={`${baseClasses} bg-orange-100 text-orange-800`}>{difficulty}</span>;
    if (difficulty.includes('Très difficile')) return <span className={`${baseClasses} bg-red-100 text-red-800`}>{difficulty}</span>;
    return <span>{difficulty}</span>;
  };
  
  return (
    <>
      <header className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Synthèse Globale des Contributions</h1>
          <button onClick={onBack} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700">
            Retour au sommaire
          </button>
        </div>
      </header>

      <main className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center flex-wrap gap-4">
             <div className="flex items-center gap-4 flex-wrap">
                <label className="inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={hideEmptyRows} onChange={e => setHideEmptyRows(e.target.checked)} className="sr-only peer" />
                    <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ms-3 text-sm font-medium text-gray-900">Masquer les lignes sans contribution (Total = 0)</span>
                </label>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  title="Exporter les lignes non vides au format Excel (CSV)"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exporter CSV
                </button>
             </div>
            {activeFiltersCount > 0 && (
                 <div className="text-blue-800 text-sm flex items-center">
                    <span className="mr-2">Filtres actifs ({activeFiltersCount})</span>
                    <button onClick={resetAllFilters} className="font-semibold hover:underline">(Tout réinitialiser)</button>
                </div>
            )}
        </div>
        
        <div className="overflow-x-auto">
          {loading ? (
             <p className="p-8 text-center text-gray-500">Chargement et agrégation des données...</p>
          ) : error ? (
             <p className="p-8 text-center text-red-500">{error}</p>
          ) : sortedAndFilteredData.length > 0 ? (
            <>
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b sticky top-0 z-10">
                <tr>
                  <FilterableHeader title="Thématique" filterKey="thematique" />
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Synthèse du levier</th>
                  <FilterableHeader title="Origine" filterKey="origine" />
                  <FilterableHeader title="Difficulté" filterKey="difficulte" />
                  <FilterableHeader title="Nature" filterKey="nature" />
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Assiette 25</th>
                  {teamMembers.map((name, index) => (
                    <th key={name} scope="col" className="px-6 py-4 font-semibold text-center whitespace-nowrap">
                      <button onClick={() => setFilters(f => ({ ...f, contribution: f.contribution === index ? null : index }))} className={`hover:text-blue-600 w-full ${filters.contribution === index ? 'text-blue-600 font-bold' : ''}`} title={`Filtrer par ${name}`}>
                        {name} {filters.contribution === index && '🔹'}
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-6 py-4 font-semibold text-center whitespace-nowrap">
                    <button onClick={() => requestSort('total')} className="hover:text-blue-600 w-full">Total Contrib.{getSortIndicator('total')}</button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((row, index) => (
                  <tr key={row.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b hover:bg-blue-50`}>
                    <td className="px-6 py-4 font-medium text-gray-900 min-w-[250px]">{row.thematique}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-sm truncate" title={row.synthese}>{row.synthese}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{row.origine}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getDifficultyBadge(row.difficulte)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{row.nature}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{row.estimation}</td>
                    {teamMembers.map((_, i) => (
                        <td key={i} className="px-6 py-4 text-center">{safeParseFloat(row.contributions[i]).toLocaleString('fr-FR')}</td>
                    ))}
                    <td className="px-6 py-4 font-bold text-center">
                      {row.contributions.reduce((sum, item) => sum + safeParseFloat(item), 0).toLocaleString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {totalPages > 1 && (
                <div className="p-4 flex items-center justify-between border-t bg-white">
                  <span className="text-sm text-gray-700">
                    Page <span className="font-semibold">{currentPage}</span> sur <span className="font-semibold">{totalPages}</span>
                  </span>
                  <div className="inline-flex -space-x-px">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="py-2 px-3 ml-0 leading-tight text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Précédent
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="py-2 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Suivant
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="p-8 text-center text-gray-500">Aucune donnée à afficher pour les filtres actuels.</p>
          )}
        </div>
      </main>
    </>
  );
};

export default SynthesisPage;
