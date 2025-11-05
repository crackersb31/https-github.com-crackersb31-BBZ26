import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase-config';
import { collection, getDocs } from 'firebase/firestore';
import { type RowData } from '../types';
import { teamMembers } from '../config';

interface AnalyticsPageProps {
  onBack: () => void;
}

interface KPICardProps {
    title: string;
    value: string | number;
    description: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, description }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
        <p className="text-sm text-gray-600 mt-2">{description}</p>
    </div>
);

type SortKey = 'thematique' | 'difficulte' | 'total' | 'GEH AG' | 'GEH AA' | 'GEH TA' | 'GMH';
type SortOrder = 'asc' | 'desc';

const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onBack }) => {
  const [allData, setAllData] = useState<RowData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({ key: 'total', order: 'desc' });
  const [difficultyFilter, setDifficultyFilter] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const pagesDataSnapshot = await getDocs(collection(db, 'pagesData'));
        const allRows = pagesDataSnapshot.docs.flatMap(doc => (doc.data().rows as RowData[]));
        setAllData(allRows);
      } catch (error) {
        console.error("Erreur lors de la récupération des données d'analyse:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, []);
  
  const getDifficultyBadge = (difficulty: string) => {
    const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full inline-block whitespace-nowrap w-full text-center";
    if (difficulty.includes('Très facile')) {
        return <span className={`${baseClasses} bg-green-100 text-green-800`}>{difficulty}</span>;
    }
    if (difficulty.includes('Facile')) {
        return <span className={`${baseClasses} bg-emerald-100 text-emerald-800`}>{difficulty}</span>;
    }
    if (difficulty.includes('Moyenne')) {
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>{difficulty}</span>;
    }
    if (difficulty.includes('Difficile')) {
        return <span className={`${baseClasses} bg-orange-100 text-orange-800`}>{difficulty}</span>;
    }
    if (difficulty.includes('Très difficile')) {
        return <span className={`${baseClasses} bg-red-100 text-red-800`}>{difficulty}</span>;
    }
    return <span>{difficulty}</span>;
  };

  const stats = useMemo(() => {
    if (allData.length === 0) {
      return {
        totalContributions: 0,
        themesWithContribution: 0,
        averageContribution: 0,
        contributionsByTeam: [],
        contributionsByTheme: [],
      };
    }

    const contributionsByTeam: Record<string, number> = {};
    const contributionsByTheme: Record<string, { total: number; breakdown: Record<string, number>; difficulte: string; }> = {};

    allData.forEach(row => {
        let rowTotal = 0;
        if (!contributionsByTheme[row.thematique]) {
            contributionsByTheme[row.thematique] = { total: 0, breakdown: {}, difficulte: row.difficulte };
        }

        row.contributions.forEach((contrib, index) => {
            const teamName = teamMembers[index];
            if (teamName) {
                const value = Number(contrib) || 0;
                contributionsByTeam[teamName] = (contributionsByTeam[teamName] || 0) + value;
                
                contributionsByTheme[row.thematique].breakdown[teamName] = (contributionsByTheme[row.thematique].breakdown[teamName] || 0) + value;
                rowTotal += value;
            }
        });
        contributionsByTheme[row.thematique].total += rowTotal;
    });
    
    const totalContributions = Object.values(contributionsByTeam).reduce((sum, val) => sum + val, 0);
    const themesWithContribution = Object.values(contributionsByTheme).filter(theme => theme.total > 0).length;
    const averageContribution = themesWithContribution > 0 ? (totalContributions / themesWithContribution) : 0;
    
    return {
        totalContributions,
        themesWithContribution,
        averageContribution: averageContribution.toFixed(2),
        contributionsByTeam: Object.entries(contributionsByTeam).map(([name, total]) => ({ name, total })),
        contributionsByTheme: Object.entries(contributionsByTheme).map(([thematique, data]) => ({
            thematique,
            total: data.total,
            difficulte: data.difficulte,
            ...data.breakdown
        }))
    };
  }, [allData]);

  const sortedThemData = useMemo(() => {
    let sortableItems = [...stats.contributionsByTheme];
    
    if (difficultyFilter) {
        sortableItems = sortableItems.filter(item => item.difficulte === difficultyFilter);
    }
    
    if (teamFilter) {
        sortableItems = sortableItems.filter(item => {
            // @ts-ignore
            const contribution = item[teamFilter] || 0;
            return contribution > 0;
        });
    }

    sortableItems.sort((a, b) => {
      const key = sortConfig.key;
      // @ts-ignore
      const valA = a[key] ?? (key === 'thematique' || key === 'difficulte' ? '' : 0);
      // @ts-ignore
      const valB = b[key] ?? (key === 'thematique' || key === 'difficulte' ? '' : 0);

      if (valA < valB) {
        return sortConfig.order === 'asc' ? -1 : 1;
      }
      if (valA > valB) {
        return sortConfig.order === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortableItems;
  }, [stats.contributionsByTheme, sortConfig, difficultyFilter, teamFilter]);

  const requestSort = (key: SortKey) => {
    let order: SortOrder = 'desc';
    if (sortConfig.key === key && sortConfig.order === 'desc') {
      order = 'asc';
    }
    setSortConfig({ key, order });
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.order === 'desc' ? ' ▼' : ' ▲';
  };

  if (loading) {
    return <div className="text-center p-8">Chargement des données d'analyse...</div>;
  }

  return (
    <>
      <header className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
                <button 
                    onClick={onBack} 
                    className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 mb-4"
                >
                    &larr; Retour au sommaire
                </button>
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Analyse des Contributions</h1>
            </div>
        </div>
      </header>
      <main>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <KPICard title="Total Général" value={stats.totalContributions.toLocaleString('fr-FR')} description="Somme de toutes les contributions saisies." />
            <KPICard title="Thématiques Contribuées" value={stats.themesWithContribution} description="Nombre de thèmes avec au moins une contribution." />
            <KPICard title="Contribution Moyenne" value={`${stats.averageContribution}%`} description="Moyenne des contributions par thématique." />
        </div>

        {/* Contributions by team */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-12">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Total des Contributions par Équipe</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.contributionsByTeam.map(team => (
                    <div key={team.name} className="bg-gray-50 p-4 rounded-md text-center">
                        <p className="font-semibold text-gray-700">{team.name}</p>
                        <p className="text-2xl font-bold text-blue-600">{team.total.toLocaleString('fr-FR')}</p>
                    </div>
                ))}
            </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center flex-wrap gap-4">
                 <h2 className="text-xl font-bold text-gray-800">Détail par Thématique</h2>
                 <div className="flex items-center gap-4 flex-wrap justify-end">
                     {(difficultyFilter || teamFilter) && <span className="text-sm font-medium text-gray-600">Filtres actifs:</span>}
                     {difficultyFilter && (
                         <div className="flex items-center gap-2">
                             {getDifficultyBadge(difficultyFilter)}
                             <button onClick={() => setDifficultyFilter(null)} className="text-sm text-blue-600 hover:underline" title="Supprimer le filtre de difficulté">
                                &times;
                             </button>
                         </div>
                     )}
                      {teamFilter && (
                         <div className="flex items-center gap-2">
                             <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{teamFilter}</span>
                             <button onClick={() => setTeamFilter(null)} className="text-sm text-blue-600 hover:underline" title={`Supprimer le filtre de l'équipe ${teamFilter}`}>
                                &times;
                             </button>
                         </div>
                     )}
                     {(difficultyFilter || teamFilter) && (
                         <button onClick={() => { setDifficultyFilter(null); setTeamFilter(null); }} className="text-sm text-gray-500 hover:underline">
                            (Réinitialiser tout)
                         </button>
                     )}
                 </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-semibold cursor-pointer hover:bg-gray-200" onClick={() => requestSort('thematique')}>
                                Thématique{getSortIndicator('thematique')}
                            </th>
                             <th scope="col" className="px-6 py-4 font-semibold cursor-pointer whitespace-nowrap hover:bg-gray-200" onClick={() => requestSort('difficulte')}>
                                Difficulté{getSortIndicator('difficulte')}
                            </th>
                            <th scope="col" className="px-6 py-4 font-semibold text-center cursor-pointer hover:bg-gray-200" onClick={() => requestSort('total')}>
                                Total Contribué (%){getSortIndicator('total')}
                            </th>
                            {teamMembers.map(member => (
                                <th key={member} scope="col" className="px-6 py-4 font-semibold text-center cursor-pointer hover:bg-gray-200">
                                    <div 
                                        onClick={() => setTeamFilter(current => current === member ? null : member)}
                                        className={`font-bold ${teamFilter === member ? 'text-blue-600' : ''}`}
                                        title={`Filtrer pour ${member} (contribution > 0)`}
                                    >
                                        {member}
                                    </div>
                                    <button className="focus:outline-none" onClick={(e) => { e.stopPropagation(); requestSort(member as SortKey); }}>
                                        {getSortIndicator(member as SortKey)}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sortedThemData.map((row, index) => (
                            <tr key={row.thematique} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b hover:bg-blue-50`}>
                                <td className="px-6 py-4 font-medium text-gray-900">{row.thematique}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={() => setDifficultyFilter(current => current === row.difficulte ? null : row.difficulte)}
                                        className="w-full text-left focus:outline-none"
                                        title={`Filtrer par : ${row.difficulte}`}
                                    >
                                        {getDifficultyBadge(row.difficulte)}
                                    </button>
                                </td>
                                <td className="px-6 py-4 font-bold text-center">{row.total.toLocaleString('fr-FR')}</td>
                                {teamMembers.map(member => (
                                    <td key={member} className="px-6 py-4 text-center">
                                        {/* @ts-ignore */}
                                        {(row[member] || 0).toLocaleString('fr-FR')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                         {sortedThemData.length === 0 && (
                            <tr>
                                <td colSpan={3 + teamMembers.length} className="text-center p-8 text-gray-500">
                                    Aucun résultat pour les filtres sélectionnés.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </main>
    </>
  );
};

export default AnalyticsPage;