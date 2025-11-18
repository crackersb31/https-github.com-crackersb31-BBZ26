import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';
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

const SynthesisPage: React.FC<SynthesisPageProps> = ({ onBack, pageConfigs }) => {
  const [aggregatedData, setAggregatedData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'thematique', direction: 'ascending' });
  
  const [filters, setFilters] = useState({
    thematique: '',
    origine: 'all',
    difficulte: 'all',
    contribution: null as number | null,
  });
  
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
          const docRef = doc(db, 'pagesData', config.storageKey);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return docSnap.data().rows as RowData[];
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
            existingRow.contributions = existingRow.contributions.map((c, i) => c + (row.contributions[i] || 0));
          } else {
            aggregationMap.set(row.thematique, JSON.parse(JSON.stringify(row)));
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

  const sortedAndFilteredData = useMemo(() => {
    let data = [...aggregatedData];
    
    data = data.filter(row => {
        const thematiqueMatch = filters.thematique ? (row.thematique.toLowerCase().includes(filters.thematique.toLowerCase()) || row.synthese.toLowerCase().includes(filters.thematique.toLowerCase())) : true;
        const origineMatch = filters.origine === 'all' ? true : row.origine === filters.origine;
        const difficulteMatch = filters.difficulte === 'all' ? true : row.difficulte === filters.difficulte;
        const contributionMatch = filters.contribution !== null ? (row.contributions[filters.contribution] || 0) > 0 : true;
        return thematiqueMatch && origineMatch && difficulteMatch && contributionMatch;
    });
    
    if (sortConfig) {
      data.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'total') {
            aValue = a.contributions.reduce((s, c) => s + (Number(c) || 0), 0);
            bValue = b.contributions.reduce((s, c) => s + (Number(c) || 0), 0);
        } else if (String(sortConfig.key).startsWith('contrib_')) {
            const index = parseInt(String(sortConfig.key).split('_')[1]);
            aValue = a.contributions[index] || 0;
            bValue = b.contributions[index] || 0;
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
  }, [aggregatedData, sortConfig, filters]);
  
  const resetAllFilters = () => {
    setFilters({ thematique: '', origine: 'all', difficulte: 'all', contribution: null });
  };
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

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

  const activeFiltersCount = Object.values(filters).filter(v => v !== '' && v !== 'all' && v !== null).length;

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
  
  const FilterableHeader = ({ title, filterKey }: { title: string, filterKey: 'thematique' | 'origine' | 'difficulte' }) => (
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
        {activeFiltersCount > 0 && (
            <div className="p-3 bg-blue-50 border-b text-blue-800 text-sm flex items-center justify-between">
                <span>
                    Filtres actifs ({activeFiltersCount})
                </span>
                <button onClick={resetAllFilters} className="font-semibold hover:underline">(Tout réinitialiser)</button>
            </div>
        )}
        
        <div className="overflow-x-auto">
          {loading ? (
             <p className="p-8 text-center text-gray-500">Chargement et agrégation des données...</p>
          ) : error ? (
             <p className="p-8 text-center text-red-500">{error}</p>
          ) : sortedAndFilteredData.length > 0 ? (
            <>
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b sticky top-0">
                <tr>
                  <FilterableHeader title="Thématique" filterKey="thematique" />
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Synthèse du levier</th>
                  <FilterableHeader title="Origine" filterKey="origine" />
                  <FilterableHeader title="Difficulté" filterKey="difficulte" />
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
                    <td className="px-6 py-4 font-medium text-gray-900">{row.thematique}</td>
                    <td className="px-6 py-4 text-gray-600 max-w-sm truncate" title={row.synthese}>{row.synthese}</td>
                    <td className="px-6 py-4">{row.origine}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getDifficultyBadge(row.difficulte)}</td>
                    {row.contributions.map((contrib, i) => (
                        <td key={i} className="px-6 py-4 text-center">{(contrib || 0).toLocaleString('fr-FR')}</td>
                    ))}
                    <td className="px-6 py-4 font-bold text-center">
                      {row.contributions.reduce((sum, item) => sum + (Number(item) || 0), 0).toLocaleString('fr-FR')}
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