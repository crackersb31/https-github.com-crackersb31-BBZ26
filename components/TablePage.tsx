import React, { useState, useEffect, useMemo } from 'react';
import { type RowData, type HistoryEntry } from '../types';
import { teamMembers } from '../config';
import HistoryPage from './HistoryPage';

interface TablePageProps {
  currentUser: string;
  onLogout: () => void;
  title: string;
  subtitle?: string;
  initialData: any[];
  storageKey: string;
  historyKey: string;
  currentPage: number;
  totalPages: number;
  onNavigate: (newIndex: number) => void;
}

const TablePage: React.FC<TablePageProps> = ({
  currentUser,
  onLogout,
  title,
  subtitle,
  initialData,
  storageKey,
  historyKey,
  currentPage,
  totalPages,
  onNavigate,
}) => {
  const [data, setData] = useState<RowData[]>([]);
  const [initialDataSnapshot, setInitialDataSnapshot] = useState<RowData[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [view, setView] = useState<'table' | 'history'>('table');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');

  useEffect(() => {
    try {
      const savedDataJSON = localStorage.getItem(storageKey);
      const loadedData = savedDataJSON ? JSON.parse(savedDataJSON) : initialData;
      setData(loadedData);
      setInitialDataSnapshot(JSON.parse(JSON.stringify(loadedData)));
    } catch (error) {
      console.error("Erreur lors du chargement des données depuis le localStorage", error);
      localStorage.removeItem(storageKey);
      setData(initialData as RowData[]);
      setInitialDataSnapshot(JSON.parse(JSON.stringify(initialData)));
    }
  }, [storageKey, initialData]);

  const handleSave = () => {
    const changes: HistoryEntry[] = [];
    const timestamp = new Date().toISOString();

    data.forEach((currentRow, rowIndex) => {
      const originalRow = initialDataSnapshot[rowIndex];
      if (!originalRow) return;

      const fieldsToCompare: (keyof Omit<RowData, 'id' | 'contributions'>)[] = [
        'thematique', 'origine', 'difficulte', 'synthese', 'nature', 'estimation'
      ];
      fieldsToCompare.forEach(field => {
        if (currentRow[field] !== originalRow[field]) {
          changes.push({ timestamp, user: currentUser, rowId: currentRow.id, rowThematique: originalRow.thematique, field, oldValue: String(originalRow[field]), newValue: String(currentRow[field]) });
        }
      });
      currentRow.contributions.forEach((newContrib, personIndex) => {
        if (newContrib !== originalRow.contributions[personIndex]) {
          changes.push({ timestamp, user: currentUser, rowId: currentRow.id, rowThematique: originalRow.thematique, field: `Contribution ${teamMembers[personIndex]}`, oldValue: String(originalRow.contributions[personIndex]), newValue: String(newContrib) });
        }
      });
    });

    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      if (changes.length > 0) {
        const historyJSON = localStorage.getItem(historyKey);
        const history = historyJSON ? JSON.parse(historyJSON) : [];
        const updatedHistory = [...history, ...changes];
        localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
      }
      setInitialDataSnapshot(JSON.parse(JSON.stringify(data)));
      setSaveMessage('Données sauvegardées !');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde", error);
      setSaveMessage('Erreur de sauvegarde.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleContributionChange = (rowIndex: number, personIndex: number, value: string) => {
    const newContribution = value === '' ? 0 : parseInt(value, 10);
    if (isNaN(newContribution) || newContribution < 0) return;
    setData(currentData => {
      const newData = [...currentData];
      const newRow = { ...newData[rowIndex] };
      const newContributions = [...newRow.contributions];
      newContributions[personIndex] = newContribution;
      newRow.contributions = newContributions;
      newData[rowIndex] = newRow;
      return newData;
    });
  };

  const handleCellChange = (rowIndex: number, field: string, value: string) => {
    setData(currentData => {
      const newData = [...currentData];
      newData[rowIndex] = { ...newData[rowIndex], [field]: value };
      return newData;
    });
  };

  const isAdmin = currentUser === 'ADMIN';

  const uniqueDifficulties = useMemo(() => 
    [...new Set(data.map((row) => row.difficulte).filter(Boolean))].sort(),
    [data]
  );

  const filteredData = useMemo(() => 
    data.filter((row) => {
      if (difficultyFilter === 'all') return true;
      return row.difficulte === difficultyFilter;
    }),
    [data, difficultyFilter]
  );

  if (isAdmin && view === 'history') {
    return <HistoryPage onBack={() => setView('table')} historyKey={historyKey} />;
  }

  const inputClasses = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2";

  const renderStandardTable = () => (
    <table className="w-full text-sm text-left text-gray-700">
      <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
        <tr>
          <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Thématique / Type de dépense</th>
          <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Origine du levier</th>
          <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Difficulté de mise en œuvre</th>
          <th scope="col" className="px-6 py-4 font-semibold">Synthèse du levier et de l’objectif BBZ</th>
          <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Nature du levier</th>
          <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Estimation / Repère chiffré</th>
          {teamMembers.map((name) => (
            <th key={name} scope="col" className="px-6 py-4 font-semibold text-center whitespace-nowrap">{`Contrib. ${name}`}</th>
          ))}
          <th scope="col" className="px-6 py-4 font-semibold text-center whitespace-nowrap">Total Contrib.</th>
        </tr>
      </thead>
      <tbody>
        {filteredData.length > 0 ? (
          filteredData.map((row) => {
            const rowIndex = data.findIndex(originalRow => originalRow.id === row.id);
            return (
              <tr key={row.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{isAdmin ? <input type="text" value={row.thematique} onChange={(e) => handleCellChange(rowIndex, 'thematique', e.target.value)} className={inputClasses} /> : row.thematique}</td>
                <td className="px-6 py-4">{isAdmin ? <input type="text" value={row.origine} onChange={(e) => handleCellChange(rowIndex, 'origine', e.target.value)} className={inputClasses} /> : row.origine}</td>
                <td className="px-6 py-4 whitespace-nowrap">{isAdmin ? <input type="text" value={row.difficulte} onChange={(e) => handleCellChange(rowIndex, 'difficulte', e.target.value)} className={inputClasses} /> : row.difficulte}</td>
                <td className="px-6 py-4" style={{ minWidth: '300px' }}>{isAdmin ? <textarea value={row.synthese} onChange={(e) => handleCellChange(rowIndex, 'synthese', e.target.value)} className={inputClasses} rows={3}/> : row.synthese}</td>
                <td className="px-6 py-4">{isAdmin ? <input type="text" value={row.nature} onChange={(e) => handleCellChange(rowIndex, 'nature', e.target.value)} className={inputClasses} /> : row.nature}</td>
                <td className="px-6 py-4 whitespace-nowrap">{isAdmin ? <input type="text" value={row.estimation} onChange={(e) => handleCellChange(rowIndex, 'estimation', e.target.value)} className={inputClasses} /> : row.estimation}</td>
                {row.contributions.map((contribution, personIndex) => (
                  <td key={personIndex} className="px-6 py-4" style={{ minWidth: '120px' }}>
                    <input type="number" min="0" value={contribution} onChange={(e) => handleContributionChange(rowIndex, personIndex, e.target.value)} disabled={!isAdmin && teamMembers[personIndex] !== currentUser} className="w-24 text-center bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 disabled:bg-gray-200 disabled:cursor-not-allowed" aria-label={`Contribution de ${teamMembers[personIndex]} pour ${row.thematique}`} />
                  </td>
                ))}
                <td className="px-6 py-4 font-bold text-center">
                  {row.contributions.reduce((sum, item) => sum + item, 0).toLocaleString('fr-FR')}
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={7 + teamMembers.length} className="text-center p-8 text-gray-500">
              Aucun résultat pour ce filtre.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  return (
    <>
      <header className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="text-center flex-grow">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">{title}</h1>
            {subtitle && <p className="mt-1 text-lg text-red-600 font-bold">{subtitle}</p>}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-4">
                <button onClick={() => onNavigate(currentPage - 2)} disabled={currentPage === 1} className="py-1 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Précédent</button>
                <span className="text-sm font-medium text-gray-600">Page {currentPage} / {totalPages}</span>
                <button onClick={() => onNavigate(currentPage)} disabled={currentPage === totalPages} className="py-1 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Suivant</button>
              </div>
            )}
            <p className="mt-2 text-md text-gray-600">
              {isAdmin ? "Connecté en tant qu'administrateur. Toutes les colonnes sont modifiables." : 
                <>Saisissez la contribution pour l'entité <span className="font-semibold">{currentUser}</span>.</>}
            </p>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            {saveMessage && <span className="text-sm text-green-600 font-medium transition-opacity duration-300">{saveMessage}</span>}
            <button onClick={handleSave} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Sauvegarder</button>
            {isAdmin && <button onClick={() => setView('history')} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500">Historique</button>}
            <button onClick={onLogout} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">Se déconnecter</button>
          </div>
        </div>
      </header>
      <main className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
            <label htmlFor="difficulty-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filtrer par difficulté de mise en œuvre
            </label>
            <select
                id="difficulty-filter"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
                className="w-full max-w-xs bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                aria-label="Filtrer par difficulté"
            >
                <option value="all">Toutes</option>
                {uniqueDifficulties.map(d => (
                    <option key={d} value={d}>{d}</option>
                ))}
            </select>
        </div>
        <div className="overflow-x-auto">
          {renderStandardTable()}
        </div>
      </main>
    </>
  );
};

export default TablePage;