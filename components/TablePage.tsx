import React, { useState, useEffect, useMemo } from 'react';
import { type RowData, type HistoryEntry, type PageConfig, type Column } from '../types';
// FIX: Import defaultColumns from config to resolve reference errors.
import { teamMembers, defaultColumns } from '../config';
import HistoryPage from './HistoryPage';
import { db } from '../firebase-config';
import { doc, getDoc, setDoc, writeBatch, collection } from 'firebase/firestore';

interface TablePageProps {
  currentUser: string;
  onLogout: () => void;
  onBackToSummary: () => void;
  pageConfig: PageConfig;
}

const TablePage: React.FC<TablePageProps> = ({
  currentUser,
  onLogout,
  onBackToSummary,
  pageConfig,
}) => {
  const { title, subtitle, initialData, storageKey, historyKey, isCustom, columns } = pageConfig;

  const [data, setData] = useState<RowData[]>([]);
  const [initialDataSnapshot, setInitialDataSnapshot] = useState<RowData[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [view, setView] = useState<'table' | 'history'>('table');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState('');

  const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false);
  const [currentColumns, setCurrentColumns] = useState<Column[]>(columns || []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const docRef = doc(db, 'pagesData', storageKey);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const loadedData = (docSnap.data().rows as RowData[]).map(row => ({
            ...row,
            comments: row.comments || {},
            estimationComment: row.estimationComment || '',
          }));
          setData(loadedData);
          setInitialDataSnapshot(JSON.parse(JSON.stringify(loadedData)));
        } else {
          console.log("Aucun document trouvé sur Firestore, initialisation avec les données par défaut.");
          const initialDataTyped = (initialData as RowData[]).map(row => ({
            ...row,
            comments: row.comments || {},
            estimationComment: row.estimationComment || '',
          }));
          setData(initialDataTyped);
          setInitialDataSnapshot(JSON.parse(JSON.stringify(initialDataTyped)));
          if (initialDataTyped.length > 0) {
             await setDoc(docRef, { rows: initialDataTyped });
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données depuis Firestore", error);
        const initialDataTyped = (initialData as RowData[]).map(row => ({
            ...row,
            comments: row.comments || {},
            estimationComment: row.estimationComment || '',
        }));
        setData(initialDataTyped);
        setInitialDataSnapshot(JSON.parse(JSON.stringify(initialDataTyped)));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [storageKey, initialData]);

  useEffect(() => {
    if (loading || initialDataSnapshot === undefined) {
      setHasUnsavedChanges(false);
      return;
    }
    const isDirty = JSON.stringify(data) !== JSON.stringify(initialDataSnapshot);
    setHasUnsavedChanges(isDirty);
  }, [data, initialDataSnapshot, loading]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleSave = async () => {
    const changes: Omit<HistoryEntry, 'timestamp'>[] = [];
    const timestamp = new Date().toISOString();

    data.forEach((currentRow, rowIndex) => {
      const originalRow = initialDataSnapshot[rowIndex];
      if (!originalRow) return;

      const fieldsToCompare: (keyof Omit<RowData, 'id' | 'contributions' | 'comments'>)[] = [
        'thematique', 'origine', 'difficulte', 'synthese', 'nature', 'estimation', 'estimationComment'
      ];
      fieldsToCompare.forEach(field => {
        const oldValue = originalRow[field] || '';
        const newValue = currentRow[field] || '';
        if (newValue !== oldValue) {
          changes.push({ user: currentUser, rowId: currentRow.id, rowThematique: originalRow.thematique, field, oldValue: String(oldValue), newValue: String(newValue) });
        }
      });
      currentRow.contributions.forEach((newContrib, personIndex) => {
        if (newContrib !== originalRow.contributions[personIndex]) {
          changes.push({ user: currentUser, rowId: currentRow.id, rowThematique: originalRow.thematique, field: `Contribution ${teamMembers[personIndex]}`, oldValue: String(originalRow.contributions[personIndex]), newValue: String(newContrib) });
        }
      });
      if (JSON.stringify(currentRow.comments) !== JSON.stringify(originalRow.comments)) {
        changes.push({ user: currentUser, rowId: currentRow.id, rowThematique: originalRow.thematique, field: 'Commentaires', oldValue: JSON.stringify(originalRow.comments), newValue: JSON.stringify(currentRow.comments) });
      }
    });
    
    if (changes.length === 0) {
        setSaveMessage('Aucune modification à sauvegarder.');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
    }

    try {
      const batch = writeBatch(db);
      const pageDocRef = doc(db, 'pagesData', storageKey);
      batch.set(pageDocRef, { rows: data });
      
      if (changes.length > 0) {
        const historyCollectionRef = collection(db, 'history');
        changes.forEach(change => {
          const newHistoryEntry: HistoryEntry = { ...change, timestamp };
          const historyDocRef = doc(historyCollectionRef);
          batch.set(historyDocRef, { ...newHistoryEntry, pageKey: historyKey });
        });
      }
      
      await batch.commit();
      
      setInitialDataSnapshot(JSON.parse(JSON.stringify(data)));
      setSaveMessage('Données sauvegardées !');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde sur Firebase", error);
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
  
  const handleOpenCommentModal = (rowIndex: number) => {
    setSelectedRowIndex(rowIndex);
    const currentComment = data[rowIndex]?.comments?.[currentUser] || '';
    setCommentInput(currentComment);
    setIsCommentModalOpen(true);
  };
  
  const handleCloseCommentModal = () => {
    setIsCommentModalOpen(false);
    setSelectedRowIndex(null);
    setCommentInput('');
  };
  
  const handleSaveComment = () => {
    if (selectedRowIndex === null) return;
    setData(currentData => {
        const newData = [...currentData];
        const newRow = { ...newData[selectedRowIndex] };
        const newComments = { ...(newRow.comments || {}) };

        if (commentInput.trim() === '') {
            delete newComments[currentUser];
        } else {
            newComments[currentUser] = commentInput;
        }

        newRow.comments = newComments;
        newData[selectedRowIndex] = newRow;
        return newData;
    });
    handleCloseCommentModal();
  };

  const confirmAction = (message: string, action: () => void) => {
    if (hasUnsavedChanges) {
      if (window.confirm(message)) {
        action();
      }
    } else {
      action();
    }
  };

  const handleLogoutClick = () => {
    confirmAction(
      "Vous avez des modifications non sauvegardées. Voulez-vous vraiment vous déconnecter ? Les modifications seront perdues.",
      onLogout
    );
  };

  const handleBackToSummaryClick = () => {
    confirmAction(
      "Vous avez des modifications non sauvegardées. Voulez-vous vraiment retourner au sommaire ? Les modifications seront perdues.",
      onBackToSummary
    );
  };

  const addRow = () => {
    const newId = data.length > 0 ? Math.max(...data.map(r => r.id)) + 1 : 1;
    const newRow: RowData = {
        id: newId,
        thematique: 'Nouvelle ligne',
        origine: '',
        difficulte: '',
        synthese: '',
        nature: '',
        estimation: '',
        estimationComment: '',
        contributions: Array(teamMembers.length).fill(0),
        comments: {},
    };
    setData([...data, newRow]);
  };
  
  const handleColumnChange = (index: number, field: keyof Column, value: any) => {
      const newColumns = [...currentColumns];
      newColumns[index] = { ...newColumns[index], [field]: value };
      setCurrentColumns(newColumns);
  };

  const handleSaveColumns = async () => {
    // This logic is complex because it requires updating the global pages config
    // For now, we'll just close the modal. Full implementation would need a callback to App.tsx
    console.log("Sauvegarde des colonnes (simulation) :", currentColumns);
    alert("La sauvegarde de la configuration des colonnes n'est pas encore complètement implémentée dans cette version. Les changements sont visibles mais non persistants.");
    setIsColumnEditorOpen(false);
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

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-xl font-semibold text-gray-700">Chargement des données...</div>
        </div>
    );
  }

  if (isAdmin && view === 'history') {
    return <HistoryPage onBack={() => setView('table')} historyKey={historyKey} />;
  }

  const inputClasses = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2";
  
  const getDifficultyBadge = (difficulty: string) => {
    const baseClasses = "px-3 py-1 text-xs font-semibold rounded-full inline-block whitespace-nowrap";
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

  const renderCell = (row: RowData, rowIndex: number, column: Column) => {
    const value = (row as any)[column.key] || '';
    if (!isAdmin) {
      if(column.key === 'difficulte') return getDifficultyBadge(value);
      return <span>{value}</span>;
    }

    switch (column.type) {
        case 'textarea':
            return <textarea value={value} onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)} className={inputClasses} rows={3} />;
        case 'badge':
            return <input type="text" value={value} onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)} className={inputClasses} />;
        default:
            return <input type="text" value={value} onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)} className={inputClasses} />;
    }
  };

  const renderTable = () => (
    <table className="w-full text-sm text-left text-gray-700">
      <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b sticky top-0 z-10">
        <tr>
          {(isCustom ? currentColumns : defaultColumns).filter(c => c.visible).map(col => (
             <th key={col.key as string} scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">{col.header}</th>
          ))}
          {teamMembers.map((name) => (
            <th key={name} scope="col" className="px-6 py-4 font-semibold text-center whitespace-nowrap">{`Contrib. ${name}`}</th>
          ))}
          <th scope="col" className="px-6 py-4 font-semibold text-center whitespace-nowrap">Total Contrib.</th>
          <th scope="col" className="px-6 py-4 font-semibold text-center whitespace-nowrap">Commentaires</th>
        </tr>
      </thead>
      <tbody>
        {filteredData.length > 0 ? (
          filteredData.map((row, index) => {
            const rowIndex = data.findIndex(originalRow => originalRow.id === row.id);
            const hasComments = row.comments && Object.keys(row.comments).length > 0;
            return (
              <tr key={row.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b hover:bg-blue-50`}>
                {(isCustom ? currentColumns : defaultColumns).filter(c => c.visible).map(col => (
                    <td key={col.key as string} className="px-6 py-4" style={{ minWidth: col.type === 'textarea' ? '300px' : 'auto' }}>
                        {renderCell(row, rowIndex, col)}
                    </td>
                ))}
                
                {/* estimationComment is not in the columns config for now, handled separately */}
                {/* This part needs to be refactored if estimationComment is to be made dynamic */}
                
                {row.contributions.map((contribution, personIndex) => (
                  <td key={personIndex} className="px-6 py-4" style={{ minWidth: '120px' }}>
                    <input
                      type="number"
                      min="0"
                      value={contribution}
                      onChange={(e) => handleContributionChange(rowIndex, personIndex, e.target.value)}
                      className="w-24 text-center bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 disabled:bg-gray-200 disabled:cursor-not-allowed"
                      aria-label={`Contribution de ${teamMembers[personIndex]} pour ${row.thematique}`}
                      disabled={!isAdmin && currentUser !== teamMembers[personIndex]}
                    />
                  </td>
                ))}
                <td className="px-6 py-4 font-bold text-center">
                  {row.contributions.reduce((sum, item) => sum + item, 0).toLocaleString('fr-FR')}
                </td>
                 <td className="px-6 py-4 text-center">
                    <button onClick={() => handleOpenCommentModal(rowIndex)} className="relative py-1 px-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        Gérer
                        {hasComments && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span></span>}
                    </button>
                </td>
              </tr>
            );
          })
        ) : (
          <tr>
            <td colSpan={10 + teamMembers.length} className="text-center p-8 text-gray-500">
              {isCustom ? "Ce tableau est vide. L'administrateur peut ajouter une ligne." : "Aucun résultat pour ce filtre."}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const selectedRowForComment = selectedRowIndex !== null ? data[selectedRowIndex] : null;

  return (
    <>
      {/* Comment Modal */}
      {isCommentModalOpen && selectedRowForComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Commentaires pour :</h2>
                    <p className="text-md text-gray-600 mt-1">{selectedRowForComment.thematique}</p>
                </div>
                <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                    {selectedRowForComment.comments && Object.keys(selectedRowForComment.comments).length > 0 ? (
                        Object.entries(selectedRowForComment.comments).map(([user, comment]) => (
                            <div key={user}>
                                <p className="font-semibold text-sm text-gray-700">{user} :</p>
                                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md whitespace-pre-wrap">{comment}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500">Aucun commentaire pour cette thématique.</p>
                    )}
                    <hr/>
                    <div>
                        <label htmlFor="user-comment" className="block text-sm font-semibold text-gray-800 mb-2">
                            Votre commentaire ({currentUser}) :
                        </label>
                        <textarea
                            id="user-comment"
                            rows={4}
                            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                            value={commentInput}
                            onChange={(e) => setCommentInput(e.target.value)}
                        ></textarea>
                    </div>
                </div>
                <div className="flex justify-end p-4 bg-gray-50 rounded-b-lg space-x-3">
                    <button onClick={handleCloseCommentModal} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Fermer</button>
                    <button onClick={handleSaveComment} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Enregistrer mon commentaire</button>
                </div>
            </div>
        </div>
      )}
      {/* Column Editor Modal */}
       {isColumnEditorOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800">Éditeur de Colonnes</h2>
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                       {currentColumns.map((col, index) => (
                           <div key={index} className="grid grid-cols-12 gap-4 items-center">
                               <div className="col-span-1">
                                    <input type="checkbox" checked={col.visible} onChange={e => handleColumnChange(index, 'visible', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                               </div>
                               <div className="col-span-10">
                                    <input type="text" value={col.header} onChange={e => handleColumnChange(index, 'header', e.target.value)} className={inputClasses} disabled={!col.editable} />
                               </div>
                           </div>
                       ))}
                    </div>
                    <div className="flex justify-end p-4 bg-gray-50 rounded-b-lg space-x-3">
                        <button onClick={() => setIsColumnEditorOpen(false)} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Annuler</button>
                        <button onClick={handleSaveColumns} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Sauvegarder les Colonnes</button>
                    </div>
                </div>
            </div>
        )}
      <header className="mb-8 grid grid-cols-3 items-center">
        <div className="justify-self-start">
            <button 
              onClick={handleBackToSummaryClick} 
              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              &larr; Retour au sommaire
            </button>
        </div>
        <div className="justify-self-center text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">{title}</h1>
            {subtitle && <p className="mt-1 text-lg text-red-600 font-bold">{subtitle}</p>}
        </div>
        <div className="justify-self-end flex items-center gap-4">
            <div className="text-right hidden sm:block">
                <p className="font-semibold">{isAdmin ? "Administrateur" : currentUser}</p>
                <p className="text-xs text-gray-500">Connecté</p>
            </div>
            <button onClick={handleLogoutClick} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700">
                Se déconnecter
            </button>
        </div>
      </header>
      <main className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center flex-wrap gap-4">
            <div>
                <label htmlFor="difficulty-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Filtrer par difficulté
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
             <div className="flex items-center space-x-2 sm:space-x-4">
                {isAdmin && isCustom && (
                    <>
                    <button onClick={() => setIsColumnEditorOpen(true)} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Gérer les colonnes</button>
                    <button onClick={addRow} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Ajouter une ligne</button>
                    </>
                )}
                {saveMessage && <span className="text-sm text-green-600 font-medium transition-opacity duration-300">{saveMessage}</span>}
                <button
                  onClick={handleSave}
                  className={`py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 ${
                    hasUnsavedChanges
                      ? 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 animate-pulse'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                >
                  Sauvegarder
                </button>
            </div>
        </div>
        <div className="overflow-x-auto">
          {renderTable()}
        </div>
      </main>
    </>
  );
};

export default TablePage;
