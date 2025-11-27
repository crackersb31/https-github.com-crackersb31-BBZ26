

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { type RowData, type HistoryEntry, type PageConfig, type Column } from '../types';
import { teamMembers, defaultColumns, difficultyOptions } from '../config';
import HistoryPage from './HistoryPage';
import { db } from '../firebase-config';

interface TablePageProps {
  currentUser: string;
  onLogout: () => void;
  onBackToSummary: () => void;
  pageConfig: PageConfig;
  onUpdatePageConfig: (pageId: string, newColumns: Column[]) => Promise<void>;
  onToggleStatus: (status: boolean) => void;
}

const commentFilterOptions = {
    all: 'Tous les commentaires',
    'Victoire rapide': 'Victoire rapide',
    'Sujet versé aux comités unités': 'Sujet versé aux comités unités'
};

const DOMAIN_TAGS = ['RH', 'COM', 'DC', 'DT', 'DF', 'SST'];
const DOMAIN_TAG_COLORS: Record<string, string> = {
    'RH': 'bg-pink-100 text-pink-800 border-pink-200',
    'COM': 'bg-blue-100 text-blue-800 border-blue-200',
    'DC': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'DT': 'bg-orange-100 text-orange-800 border-orange-200',
    'DF': 'bg-red-100 text-red-800 border-red-200',
    'SST': 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

// Mapping entre le Tag (affiché) et l'Utilisateur (qui peut répondre)
const TAG_TO_USER_MAP: Record<string, string> = {
    'RH': 'DRH',
    'COM': 'DCOM',
    'DC': 'DC',
    'DT': 'DT',
    'DF': 'DF',
    'SST': 'SST'
};

// Helper pour convertir n'importe quelle entrée en nombre pour le calcul local
const safeParseFloat = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleanStr = String(val).replace(/,/g, '.').replace(/[\s\u00A0]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
};

const TablePage: React.FC<TablePageProps> = ({
  currentUser,
  onLogout,
  onBackToSummary,
  pageConfig,
  onUpdatePageConfig,
  onToggleStatus
}) => {
  const { title, subtitle, initialData, storageKey, historyKey, isCustom, columns, id: pageId, isFinished } = pageConfig;

  const [data, setData] = useState<RowData[]>([]);
  const [initialDataSnapshot, setInitialDataSnapshot] = useState<RowData[]>([]);
  const [saveMessage, setSaveMessage] = useState('');
  const [view, setView] = useState<'table' | 'history'>('table');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [commentFilter, setCommentFilter] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [commentInput, setCommentInput] = useState('');

  // State for thematique comment editor
  const [isThematiqueCommentModalOpen, setIsThematiqueCommentModalOpen] = useState(false);
  const [thematiqueCommentInput, setThematiqueCommentInput] = useState('');

  // State for Domain Response Modal
  const [isDomainResponseModalOpen, setIsDomainResponseModalOpen] = useState(false);
  const [domainResponseInput, setDomainResponseInput] = useState('');

  // State for Help Modal (Guide BBZ)
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const [isColumnEditorOpen, setIsColumnEditorOpen] = useState(false);
  const [currentColumns, setCurrentColumns] = useState<Column[]>([]);
  
  // State for hover tooltip on Synthese column
  const [hoveredSynthese, setHoveredSynthese] = useState<{ text: string, top: number, left: number } | null>(null);
  // State for hover tooltip on Thematique column
  const [hoveredThematique, setHoveredThematique] = useState<{ text: string, top: number, left: number } | null>(null);

  // Ref for horizontal scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser === 'ADMIN';

  // Determine if the current user is the owner of this table
  const isOwner = title.toUpperCase().includes(currentUser) || (currentUser === 'ADMIN');

  useEffect(() => {
    setCurrentColumns(columns || []);
  }, [columns]);

  // --- MOUCHARD : TRACKING DES VISITES ---
  useEffect(() => {
    const trackVisit = async () => {
        // On ne tracke pas l'admin pour ne pas polluer les stats, ou on peut le tracker si besoin.
        // Ici, on tracke tout le monde sauf ADMIN pour que la matrice reste pertinente pour les utilisateurs métiers.
        if (currentUser === 'ADMIN') return;

        try {
            // ID composite unique par Utilisateur et par Page pour éviter les doublons de lignes
            // Cela permet de mettre à jour la date de "Dernière visite"
            const visitId = `${currentUser}_${pageId}`;
            const visitRef = db.collection('pageVisits').doc(visitId);
            
            await visitRef.set({
                user: currentUser,
                pageId: pageId,
                pageTitle: title,
                lastVisit: new Date().toISOString()
            }, { merge: true }); // merge: true permet de mettre à jour sans écraser si on ajoutait d'autres champs
        } catch (error) {
            console.error("Erreur tracking visite", error);
        }
    };

    trackVisit();
  }, [currentUser, pageId, title]);
  // ---------------------------------------

  // --- KEYBOARD NAVIGATION (ARROWS) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignorer si l'utilisateur est en train de taper dans un champ (input ou textarea)
        const activeElement = document.activeElement as HTMLElement;
        const isInputActive = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'SELECT');
        
        if (isInputActive) return;

        if (e.key === 'ArrowRight') {
            e.preventDefault();
            if (tableContainerRef.current) {
                tableContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            if (tableContainerRef.current) {
                tableContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  // ------------------------------------

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const docRef = db.collection('pagesData').doc(storageKey);
      try {
        const docSnap = await docRef.get();
        if (docSnap.exists) {
          const loadedData = (docSnap.data()?.rows as RowData[]).map(row => ({
            ...row,
            comments: row.comments || {},
            estimationComment: row.estimationComment || '',
            thematiqueComment: row.thematiqueComment || '', // Ensure field exists
            isLocked: row.isLocked || false, // Ensure lock status exists
            isCommitteeSelected: row.isCommitteeSelected || false, // Ensure committee status exists
            domainTag: row.domainTag || null, // Ensure domain tag exists (null if undefined)
            domainResponse: row.domainResponse || null, // Ensure domain response exists
          }));
          setData(loadedData);
          setInitialDataSnapshot(JSON.parse(JSON.stringify(loadedData)));
        } else {
          console.log("Aucun document trouvé sur Firestore, initialisation avec les données par défaut.");
          const initialDataTyped = (initialData as RowData[]).map(row => ({
            ...row,
            comments: row.comments || {},
            estimationComment: row.estimationComment || '',
            thematiqueComment: row.thematiqueComment || '', // Ensure field exists
            isLocked: false,
            isCommitteeSelected: false,
            domainTag: null,
            domainResponse: null,
          }));
          setData(initialDataTyped);
          setInitialDataSnapshot(JSON.parse(JSON.stringify(initialDataTyped)));
          if (initialDataTyped.length > 0) {
             await docRef.set({ rows: initialDataTyped });
          }
        }
      } catch (error) {
        console.error(`Erreur chargement Firestore pour ${storageKey}`, error);
        const initialDataTyped = (initialData as RowData[]).map(row => ({
            ...row,
            comments: row.comments || {},
            estimationComment: row.estimationComment || '',
            thematiqueComment: row.thematiqueComment || '', // Ensure field exists
            isLocked: false,
            isCommitteeSelected: false,
            domainTag: null,
            domainResponse: null,
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
    
    let columnsMetadata = isCustom ? currentColumns : defaultColumns;
    if (title.includes('Remontée') || title === 'Fiches transverses') {
        columnsMetadata = columnsMetadata.filter(col => col.key !== 'estimationComment');
    }
    const columnsToCompare = columnsMetadata.map(c => c.key as keyof RowData);

    // SANITIZATION: Convert string contributions to numbers before saving
    // Replace comma with dot and parse float
    // Ensure domainTag is null if undefined
    const dataToSave = data.map(row => ({
        ...row,
        domainTag: row.domainTag || null,
        domainResponse: row.domainResponse || null,
        contributions: row.contributions.map(val => {
            return safeParseFloat(val);
        })
    }));

    dataToSave.forEach((currentRow) => {
      const originalRow = initialDataSnapshot.find(r => r.id === currentRow.id);

      if (!originalRow) {
        changes.push({
          user: currentUser,
          rowId: currentRow.id,
          rowThematique: currentRow.thematique || `ID ${currentRow.id}`,
          field: 'Ligne',
          oldValue: '',
          newValue: 'Créée',
        });
        return;
      }

      const rowThematiqueForHistory = originalRow.thematique || `ID ${originalRow.id}`;

      columnsToCompare.forEach(key => {
        const oldValue = originalRow[key] || '';
        const newValue = currentRow[key] || '';
        if (String(newValue) !== String(oldValue)) {
          const columnHeader = columnsMetadata.find(c => c.key === key)?.header || String(key);
          changes.push({ user: currentUser, rowId: currentRow.id, rowThematique: rowThematiqueForHistory, field: columnHeader, oldValue: String(oldValue), newValue: String(newValue) });
        }
      });
      
      // Compare locked status
      if (currentRow.isLocked !== originalRow.isLocked) {
          changes.push({ 
              user: currentUser, 
              rowId: currentRow.id, 
              rowThematique: rowThematiqueForHistory, 
              field: 'Verrouillage', 
              oldValue: originalRow.isLocked ? 'Verrouillé' : 'Déverrouillé', 
              newValue: currentRow.isLocked ? 'Verrouillé' : 'Déverrouillé' 
          });
      }

      // Compare committee status
      if (currentRow.isCommitteeSelected !== originalRow.isCommitteeSelected) {
        changes.push({ 
            user: currentUser, 
            rowId: currentRow.id, 
            rowThematique: rowThematiqueForHistory, 
            field: 'Comité', 
            oldValue: originalRow.isCommitteeSelected ? 'Sélectionné' : 'Non sélectionné', 
            newValue: currentRow.isCommitteeSelected ? 'Sélectionné' : 'Non sélectionné' 
        });
      }
      
      // Compare domain tag
      if ((currentRow.domainTag || null) !== (originalRow.domainTag || null)) {
        changes.push({ 
            user: currentUser, 
            rowId: currentRow.id, 
            rowThematique: rowThematiqueForHistory, 
            field: 'Tag Domaine', 
            oldValue: originalRow.domainTag || 'Aucun', 
            newValue: currentRow.domainTag || 'Aucun' 
        });
      }

      // Compare domain response
      if ((currentRow.domainResponse || null) !== (originalRow.domainResponse || null)) {
        changes.push({ 
            user: currentUser, 
            rowId: currentRow.id, 
            rowThematique: rowThematiqueForHistory, 
            field: 'Réponse Domaine', 
            oldValue: originalRow.domainResponse || '', 
            newValue: currentRow.domainResponse || '' 
        });
      }
       
      // Compare thematiqueComment specifically
      if (currentRow.thematiqueComment !== originalRow.thematiqueComment) {
        changes.push({ user: currentUser, rowId: currentRow.id, rowThematique: rowThematiqueForHistory, field: 'Commentaire sur Thématique', oldValue: originalRow.thematiqueComment || '', newValue: currentRow.thematiqueComment || '' });
      }
      
      (currentRow.contributions || []).forEach((newContrib, personIndex) => {
        const oldContrib = originalRow.contributions?.[personIndex] || 0;
        // Compare as numbers to avoid "10" !== 10 issues
        if (Number(newContrib) !== Number(oldContrib)) {
          changes.push({ user: currentUser, rowId: currentRow.id, rowThematique: rowThematiqueForHistory, field: `Contribution ${teamMembers[personIndex]}`, oldValue: String(oldContrib), newValue: String(newContrib) });
        }
      });

      if (JSON.stringify(currentRow.comments || {}) !== JSON.stringify(originalRow.comments || {})) {
        changes.push({ user: currentUser, rowId: currentRow.id, rowThematique: rowThematiqueForHistory, field: 'Commentaires', oldValue: JSON.stringify(originalRow.comments || {}), newValue: JSON.stringify(currentRow.comments || {}) });
      }
    });
    
    if (changes.length === 0 && JSON.stringify(dataToSave) === JSON.stringify(initialDataSnapshot)) {
        setSaveMessage('Aucune modification à sauvegarder.');
        setTimeout(() => setSaveMessage(''), 3000);
        return;
    }

    try {
      const batch = db.batch();
      const pageDocRef = db.collection('pagesData').doc(storageKey);
      batch.set(pageDocRef, { rows: dataToSave });
      
      if (changes.length > 0) {
        const historyCollectionRef = db.collection('history');
        changes.forEach(change => {
          const newHistoryEntry: HistoryEntry = { ...change, timestamp };
          const historyDocRef = historyCollectionRef.doc(); // Auto-ID
          batch.set(historyDocRef, { ...newHistoryEntry, pageKey: historyKey });
        });
      }
      
      await batch.commit();
      
      // Update local state with the sanitized data to match what's in DB
      setData(dataToSave);
      setInitialDataSnapshot(JSON.parse(JSON.stringify(dataToSave)));
      setSaveMessage('Données sauvegardées !');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error(`Erreur sauvegarde Firestore pour ${storageKey}`, error);
      setSaveMessage('Erreur de sauvegarde.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleContributionChange = (rowIndex: number, personIndex: number, value: string) => {
    // On permet la saisie de chaines (ex: "12.") pour pouvoir taper des décimales
    // La conversion stricte en nombre se fait à la sauvegarde
    
    // Remplacement de la virgule par un point pour l'uniformisation
    let normalizedValue = value.replace(',', '.');

    // Validation basique pour n'accepter que des chiffres et un point
    if (!/^\d*\.?\d*$/.test(normalizedValue)) {
        return; // Ignorer si ce n'est pas un format numérique partiel valide
    }

    setData(currentData => {
      const newData = [...currentData];
      const newRow = { ...newData[rowIndex] };
      const newContributions = [...(newRow.contributions || [])];
      // S'assure que le tableau est assez long pour éviter les erreurs
      while (newContributions.length <= personIndex) {
          newContributions.push(0);
      }
      newContributions[personIndex] = normalizedValue; // Stocke la valeur brute (string ou number)
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

  const handleToggleLock = (rowIndex: number) => {
      if (!isAdmin) return;
      setData(currentData => {
          const newData = [...currentData];
          newData[rowIndex] = { ...newData[rowIndex], isLocked: !newData[rowIndex].isLocked };
          return newData;
      });
  };

  const handleToggleCommittee = (rowIndex: number) => {
      if (!isAdmin) return;
      setData(currentData => {
          const newData = [...currentData];
          newData[rowIndex] = { ...newData[rowIndex], isCommitteeSelected: !newData[rowIndex].isCommitteeSelected };
          return newData;
      });
  };
  
  const handleCycleDomainTag = (rowIndex: number) => {
      if (!isAdmin) return;
      setData(currentData => {
          const newData = [...currentData];
          const currentRow = { ...newData[rowIndex] };
          
          let nextIndex = 0;
          if (currentRow.domainTag) {
              const currentIndex = DOMAIN_TAGS.indexOf(currentRow.domainTag);
              if (currentIndex === DOMAIN_TAGS.length - 1) {
                  // If last item, reset to null (no tag)
                  currentRow.domainTag = null;
              } else {
                  currentRow.domainTag = DOMAIN_TAGS[currentIndex + 1];
              }
          } else {
             currentRow.domainTag = DOMAIN_TAGS[0];
          }
          newData[rowIndex] = currentRow;
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

  const handleOpenThematiqueCommentModal = (rowIndex: number) => {
    setSelectedRowIndex(rowIndex);
    const currentComment = data[rowIndex]?.thematiqueComment || '';
    setThematiqueCommentInput(currentComment);
    setIsThematiqueCommentModalOpen(true);
  };

  const handleCloseThematiqueCommentModal = () => {
    setIsThematiqueCommentModalOpen(false);
    setSelectedRowIndex(null);
    setThematiqueCommentInput('');
  };

  const handleSaveThematiqueComment = () => {
    if (selectedRowIndex === null) return;
    setData(currentData => {
        const newData = [...currentData];
        newData[selectedRowIndex] = { ...newData[selectedRowIndex], thematiqueComment: thematiqueCommentInput };
        return newData;
    });
    handleCloseThematiqueCommentModal();
  };

  // Gestion de la modale de réponse de domaine
  const handleOpenDomainResponseModal = (rowIndex: number) => {
      setSelectedRowIndex(rowIndex);
      const currentResponse = data[rowIndex]?.domainResponse || '';
      setDomainResponseInput(currentResponse);
      setIsDomainResponseModalOpen(true);
  };

  const handleCloseDomainResponseModal = () => {
      setIsDomainResponseModalOpen(false);
      setSelectedRowIndex(null);
      setDomainResponseInput('');
  };

  const handleSaveDomainResponse = () => {
      if (selectedRowIndex === null) return;
      setData(currentData => {
          const newData = [...currentData];
          newData[selectedRowIndex] = { 
              ...newData[selectedRowIndex], 
              domainResponse: domainResponseInput.trim() === '' ? null : domainResponseInput 
          };
          return newData;
      });
      handleCloseDomainResponseModal();
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
        thematiqueComment: '',
        origine: '',
        difficulte: '',
        synthese: '',
        nature: '',
        estimation: '',
        estimationComment: '',
        contributions: Array(teamMembers.length).fill(0),
        comments: {},
        isUserCreated: true, // Marqueur pour permettre l'édition par l'utilisateur
        isLocked: false,
        isCommitteeSelected: false,
        domainTag: null,
        domainResponse: null,
    };
    (columns || []).forEach(col => {
        if (!Object.prototype.hasOwnProperty.call(newRow, col.key)) {
            newRow[col.key] = '';
        }
    });
    setData([...data, newRow]);
  };
  
  const handleColumnChange = (index: number, field: keyof Column, value: any) => {
      const newColumns = [...currentColumns];
      newColumns[index] = { ...newColumns[index], [field]: value };
      setCurrentColumns(newColumns);
  };
  
  const addNewColumn = () => {
    const newColumn: Column = {
        key: `custom_${Date.now()}`,
        header: 'Nouvelle Colonne',
        visible: true,
        editable: true,
        type: 'text',
    };
    setCurrentColumns([...currentColumns, newColumn]);
  };
  
  const removeColumn = (indexToRemove: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette colonne ?")) return;
    setCurrentColumns(currentColumns.filter((_, index) => index !== indexToRemove));
  };

  const handleSaveColumns = async () => {
    for (const col of currentColumns) {
        if (!col.header.trim()) {
            alert("Le nom d'une colonne ne peut pas être vide.");
            return;
        }
    }
    try {
        await onUpdatePageConfig(pageId, currentColumns);
        setSaveMessage('Configuration des colonnes sauvegardée !');
        setTimeout(() => setSaveMessage(''), 3000);
        setIsColumnEditorOpen(false);
    } catch (error) {
        console.error(`Erreur sauvegarde configuration colonnes pour ${pageId}`, error);
        setSaveMessage('Erreur de sauvegarde de la configuration.');
        setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const uniqueDifficulties = useMemo(() => 
    [...new Set(data.map((row) => row.difficulte).filter(Boolean))].sort(),
    [data]
  );

  const filteredData = useMemo(() =>
    data.filter((row) => {
      const difficultyMatch = difficultyFilter === 'all' || row.difficulte === difficultyFilter;

      let commentMatch = true;
      if (title === 'Fiches transverses' && commentFilter !== 'all') {
        const adminComment = row.comments?.['ADMIN'];
        if (!adminComment) {
          commentMatch = false;
        } else {
          const lowerCaseComment = adminComment.toLowerCase();
          
          if (commentFilter === 'Victoire rapide') {
            commentMatch = lowerCaseComment.includes('victoire rapide');
          } else if (commentFilter === 'Sujet versé aux comités unités') {
            // Check for 'comité' to catch both singular and plural, case-insensitively
            commentMatch = lowerCaseComment.includes('comité');
          } else {
              commentMatch = false; // Should not happen with current options, but safe to have
          }
        }
      }

      return difficultyMatch && commentMatch;
    }),
  [data, difficultyFilter, commentFilter, title]);


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

  const inputClasses = "w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-500";
  
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

  const renderThematiqueCell = (row: RowData, rowIndex: number) => {
    // Logique pour le badge interactif
    const targetUser = row.domainTag ? TAG_TO_USER_MAP[row.domainTag] : null;
    const canReplyToDomain = isAdmin || (targetUser && currentUser === targetUser);
    
    return (
      <div className="flex items-center gap-2">
        {/* Colonne d'outils (Lock & Comité & Tags) */}
        <div className="flex flex-col gap-1 items-center min-w-[24px]">
            {/* Bouton de verrouillage Admin */}
            {isAdmin && (
                <button
                    onClick={() => handleToggleLock(rowIndex)}
                    className={`flex-shrink-0 p-1 rounded hover:bg-gray-200 focus:outline-none ${row.isLocked ? 'text-red-600' : 'text-gray-400 hover:text-gray-600'}`}
                    title={row.isLocked ? "Ligne verrouillée (Cliquez pour déverrouiller)" : "Ligne ouverte (Cliquez pour verrouiller)"}
                >
                    {row.isLocked ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                    )}
                </button>
            )}
            {!isAdmin && row.isLocked && (
                <svg className="w-5 h-5 text-red-400 flex-shrink-0" title="Cette ligne est verrouillée par l'administrateur" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            )}

            {/* Bouton Comité (Admin Toggle / User View) */}
            {isAdmin ? (
                <button
                    onClick={() => handleToggleCommittee(rowIndex)}
                    className={`flex-shrink-0 p-1 rounded hover:bg-gray-200 focus:outline-none ${row.isCommitteeSelected ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-500'}`}
                    title={row.isCommitteeSelected ? "Sujet à instruire en comité (Actif)" : "Marquer pour comité"}
                >
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                </button>
            ) : (
                row.isCommitteeSelected && (
                    <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" title="Sujet à instruire en comité" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                )
            )}

            {/* Bouton Tag Domaine (Admin Toggle) */}
            {isAdmin && (
                <button
                    onClick={() => handleCycleDomainTag(rowIndex)}
                    className={`flex-shrink-0 p-1 rounded hover:bg-gray-200 focus:outline-none ${row.domainTag ? 'text-blue-600' : 'text-gray-300 hover:text-gray-500'}`}
                    title={row.domainTag ? `Tag actuel : ${row.domainTag}` : "Ajouter un tag de domaine (RH, COM...)"}
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                </button>
            )}
        </div>

        <div 
            className="flex-grow min-w-0 flex flex-col gap-1"
            onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (row.thematique && row.thematique.trim().length > 0) {
                    setHoveredThematique({
                        text: row.thematique,
                        top: rect.top,
                        left: rect.right
                    });
                }
            }}
            onMouseLeave={() => setHoveredThematique(null)}
        >
            {isAdmin || (row.isUserCreated && !row.isLocked) ? (
            <input
                type="text"
                value={row.thematique}
                onChange={(e) => handleCellChange(rowIndex, 'thematique', e.target.value)}
                className={inputClasses}
                disabled={!isAdmin && row.isLocked}
            />
            ) : (
            <span className={row.isLocked ? "text-gray-500" : ""}>{row.thematique}</span>
            )}
            
            {/* Affichage du Badge Domaine sous la zone de texte */}
            {row.domainTag && (
                <div 
                    className="flex items-center gap-1 self-start" 
                    title={row.domainResponse ? `Réponse de ${TAG_TO_USER_MAP[row.domainTag]} : ${row.domainResponse}` : "Pas de réponse pour le moment"}
                >
                    <span 
                        onClick={canReplyToDomain ? () => handleOpenDomainResponseModal(rowIndex) : undefined}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${DOMAIN_TAG_COLORS[row.domainTag]} ${canReplyToDomain ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 hover:ring-blue-400 animate-pulse' : ''}`}
                    >
                        {row.domainTag}
                    </span>
                    
                    {row.domainResponse && (
                        <span className="text-gray-500">
                             <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                             </svg>
                        </span>
                    )}
                </div>
            )}
        </div>
  
        {isAdmin ? (
          <button
            onClick={() => handleOpenThematiqueCommentModal(rowIndex)}
            className={`flex-shrink-0 p-1.5 rounded-full transition-colors ${row.thematiqueComment ? 'bg-sky-200 text-sky-700 hover:bg-sky-300' : 'text-gray-400 hover:bg-gray-200'}`}
            title="Ajouter/Modifier le commentaire de la thématique"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        ) : (
          row.thematiqueComment && (
            <div className="relative group flex-shrink-0">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
              </span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 text-xs text-white bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
                {row.thematiqueComment}
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
              </div>
            </div>
          )
        )}
      </div>
    );
  };

  const renderCell = (row: RowData, rowIndex: number, column: Column) => {
    const value = (row as any)[column.key] || '';
    const isLocked = !isAdmin && row.isLocked;
    
    // Exception pour la colonne difficulté : tout le monde peut modifier SAUF si verrouillé
    if (column.key === 'difficulte') {
      return (
        <select
          value={value}
          onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
          className={inputClasses}
          disabled={isLocked}
        >
          <option value="">Sélectionner...</option>
          {difficultyOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }

    // Gestion de l'info-bulle (tooltip) pour la colonne Synthèse
    if (column.key === 'synthese') {
        return (
            <div
                className="relative w-full h-full"
                onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    // On ne déclenche que s'il y a du contenu
                    if (value && typeof value === 'string' && value.trim().length > 0) {
                        setHoveredSynthese({
                            text: value,
                            top: rect.top,
                            left: rect.right
                        });
                    }
                }}
                onMouseLeave={() => setHoveredSynthese(null)}
            >
                <textarea
                    value={value}
                    onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
                    className={inputClasses}
                    rows={3}
                    disabled={isLocked}
                />
            </div>
        );
    }

    // Pour les autres colonnes : Allow editing if Admin OR if the row was created by a user AND not locked
    if (!isAdmin && (!row.isUserCreated || row.isLocked)) {
      return <span className={row.isLocked ? "text-gray-500" : ""}>{value}</span>;
    }

    switch (column.type) {
        case 'textarea':
            return <textarea value={value} onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)} className={inputClasses} rows={3} disabled={isLocked} />;
        case 'badge':
            return <input type="text" value={value} onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)} className={inputClasses} disabled={isLocked} />;
        default:
            return <input type="text" value={value} onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)} className={inputClasses} disabled={isLocked} />;
    }
  };
  
  // Helper function to enforce widths for predictable sticky behavior
  const getColumnWidth = (key: string, type: string): number => {
      if (key === 'thematique') return 350;
      if (key === 'synthese' || type === 'textarea') return 300;
      if (key === 'nature' || key === 'estimation') return 180;
      if (key === 'difficulte') return 140;
      return 150; // Default width for other columns
  };

  const renderTable = () => {
    let baseColumns = isCustom ? currentColumns : defaultColumns;
    // Supprimer la colonne "Commentaire Estimation" pour les remontées ET pour la fiche de synthèse
    if (title.includes('Remontée') || title === 'Fiches transverses') {
        baseColumns = baseColumns.filter(col => col.key !== 'estimationComment');
    }
    const visibleColumns = baseColumns.filter(c => c.visible);

    const isRemonteeCommunication = title.trim().toLowerCase() === 'remontée communication';
    const totalColumnCount = visibleColumns.length + (isRemonteeCommunication ? teamMembers.length - 1 : teamMembers.length) + 2;

    // Calculate cumulative left positions for sticky columns
    // We freeze only the first column (Thématique) to avoid taking up too much space
    const stickyLimit = 1; 
    let accumulatedLeft = 0;

    return (
        <table className="w-full text-sm text-left text-gray-700">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b sticky top-0 z-30 shadow-sm">
            <tr>
              {visibleColumns.map((col, index) => {
                 const width = getColumnWidth(col.key, col.type);
                 const isSticky = index < stickyLimit;
                 const style: React.CSSProperties = {
                     minWidth: `${width}px`,
                     ...(isSticky ? {
                         position: 'sticky',
                         left: `${accumulatedLeft}px`,
                         zIndex: 30, // Higher than body cells (10) and normal headers (20)
                         backgroundColor: '#f3f4f6', // bg-gray-100 to match header
                         boxShadow: index === stickyLimit - 1 ? '4px 0 4px -2px rgba(0, 0, 0, 0.1)' : 'none'
                     } : {})
                 };
                 
                 if (isSticky) {
                     accumulatedLeft += width;
                 }

                 return (
                    <th key={col.key as string} scope="col" className="px-6 py-4 font-semibold whitespace-nowrap" style={style}>
                        {col.header}
                    </th>
                 );
              })}
              {teamMembers.map((name) => {
                if (isRemonteeCommunication && name === 'DCOM') return null;
                return <th key={name} scope="col" className="px-6 py-4 font-semibold text-center whitespace-nowrap">{`Contrib. ${name}`}</th>
              })}
              <th scope="col" className="px-6 py-4 font-semibold text-center whitespace-nowrap">Total Contrib.</th>
              <th scope="col" className="px-6 py-4 font-semibold text-center whitespace-nowrap">Commentaires</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((row, index) => {
                const rowIndex = data.findIndex(originalRow => originalRow.id === row.id);
                const hasComments = row.comments && Object.keys(row.comments).length > 0;
                const isEven = index % 2 === 0;
                // Si la ligne est verrouillée, on change légèrement la couleur de fond pour l'indiquer
                const rowBgClass = row.isLocked 
                    ? 'bg-slate-100' 
                    : (isEven ? 'bg-white' : 'bg-gray-50');
                
                // Reset accumulated left for body cells
                let currentBodyLeft = 0;

                return (
                  <tr key={row.id} className={`${rowBgClass} border-b hover:bg-blue-50`}>
                    {visibleColumns.map((col, colIndex) => {
                         const width = getColumnWidth(col.key, col.type);
                         const isSticky = colIndex < stickyLimit;
                         // Ajustement couleur de fond sticky pour correspondre à la ligne (verrouillée ou non)
                         const stickyBg = row.isLocked ? '#f1f5f9' : (isEven ? '#ffffff' : '#f9fafb');

                         const style: React.CSSProperties = {
                             minWidth: `${width}px`,
                             ...(isSticky ? {
                                 position: 'sticky',
                                 left: `${currentBodyLeft}px`,
                                 zIndex: 10, // Stays above scrolling content but below header
                                 backgroundColor: stickyBg, // Explicit color required for sticky opacity
                                 boxShadow: colIndex === stickyLimit - 1 ? '4px 0 4px -2px rgba(0, 0, 0, 0.05)' : 'none'
                             } : {})
                         };
                         
                         if (isSticky) {
                             currentBodyLeft += width;
                         }

                         return (
                            <td key={col.key as string} className="px-6 py-4" style={style}>
                                 {col.key === 'thematique' ? renderThematiqueCell(row, rowIndex) : renderCell(row, rowIndex, col)}
                            </td>
                        );
                    })}
                    
                    {teamMembers.map((name, personIndex) => {
                      if (isRemonteeCommunication && name === 'DCOM') return null;
                      const isRowLockedForUser = !isAdmin && row.isLocked;
                      return (
                      <td key={personIndex} className="px-6 py-4" style={{ minWidth: '120px' }}>
                        <input
                          type="number"
                          step="0.01" // Allow decimals
                          min="0"
                          value={row.contributions?.[personIndex] || ''} // Allow empty string during edits
                          onChange={(e) => handleContributionChange(rowIndex, personIndex, e.target.value)}
                          className="w-24 text-center bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400"
                          aria-label={`Contribution de ${teamMembers[personIndex]} pour ${row.thematique}`}
                          disabled={isRowLockedForUser || (!isAdmin && teamMembers[personIndex] !== currentUser)}
                        />
                      </td>
                    )})}
                    <td className="px-6 py-4 font-bold text-center">
                      {(row.contributions || []).reduce((sum, item) => sum + safeParseFloat(item), 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
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
                <td colSpan={totalColumnCount} className="text-center p-8 text-gray-500">
                  {isCustom || title.includes('Remontée') ? "Ce tableau est vide. Vous pouvez ajouter une ligne." : "Aucun résultat pour ce filtre."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
    );
  };


  const selectedRowForComment = selectedRowIndex !== null ? data[selectedRowIndex] : null;

  return (
    <>
      {/* Help Modal (Guide BBZ) */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden animate-fade-in-up">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 border-b border-blue-500">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Guide de Saisie BBZ
                        </h2>
                        <button onClick={() => setIsHelpModalOpen(false)} className="text-blue-100 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className="p-6 space-y-6 text-gray-700">
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <h3 className="font-bold text-blue-900 text-lg mb-2">1. Colonne "Assiette 25" (Texte)</h3>
                        <p className="mb-2"><strong>Ce qu'il faut saisir :</strong> L'Assiette 2025 ou le Tendanciel 2026.</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li><strong>C'est quoi ?</strong> Le montant "Si on ne fait rien" ou "Ce qu'on a dépensé l'an dernier". C'est la base de référence.</li>
                            <li><strong>Pourquoi ?</strong> Le BBZ part de zéro, mais pour mesurer un effort, il faut un point de comparaison.</li>
                        </ul>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                        <h3 className="font-bold text-green-900 text-lg mb-2">2. Colonne "Contribution" (Chiffre)</h3>
                        <p className="mb-2"><strong>Ce qu'il faut saisir :</strong> Le Gain / Économie net 2026.</p>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li><strong>C'est quoi ?</strong> L'argent qu'on "rend" à l'entreprise grâce au levier.</li>
                            <li><strong>Attention :</strong> Ne saisissez pas votre budget restant, mais bien l'économie réalisée.</li>
                        </ul>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                            💡 Exemple Concret : "Frais de déplacement"
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="border p-3 rounded bg-gray-50">
                                <span className="block font-semibold text-gray-500 mb-1">Colonne Assiette 25</span>
                                <span className="font-mono text-gray-800">"Base 2025 : 100 k€"</span>
                            </div>
                            <div className="border p-3 rounded bg-gray-50">
                                <span className="block font-semibold text-gray-500 mb-1">Colonne Contribution</span>
                                <span className="font-mono text-green-600 font-bold">"10"</span>
                                <span className="block text-xs text-gray-400 mt-1">(Sous-entendu : 10 k€ d'économie)</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <button 
                        onClick={() => setIsHelpModalOpen(false)}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md"
                    >
                        J'ai compris
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Floating Tooltip for Thematique Column */}
      {hoveredThematique && (
        <div 
            className="fixed z-50 p-4 bg-white border border-gray-200 rounded-xl shadow-2xl text-sm text-gray-800 pointer-events-none transform transition-opacity duration-200"
            style={{ 
                top: hoveredThematique.top, 
                left: hoveredThematique.left + 5, // Juste à droite
                width: '350px',
                maxWidth: '90vw'
            }}
        >
            <div className="absolute top-2 -left-2 w-4 h-4 bg-white border-t border-l border-gray-200 transform -rotate-45"></div>
            <h4 className="font-bold text-blue-600 text-xs uppercase mb-2 tracking-wide border-b pb-1">Thématique détaillée</h4>
            <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{hoveredThematique.text}</p>
        </div>
      )}

      {/* Floating Tooltip for Synthese Column */}
      {hoveredSynthese && (
        <div 
            className="fixed z-50 p-4 bg-white border border-gray-200 rounded-xl shadow-2xl text-sm text-gray-800 pointer-events-none transform transition-opacity duration-200"
            style={{ 
                top: hoveredSynthese.top, 
                left: hoveredSynthese.left + 5, // Juste à droite
                width: '450px',
                maxWidth: '90vw'
            }}
        >
            <div className="absolute top-2 -left-2 w-4 h-4 bg-white border-t border-l border-gray-200 transform -rotate-45"></div>
            <h4 className="font-bold text-blue-600 text-xs uppercase mb-2 tracking-wide border-b pb-1">Synthèse détaillée</h4>
            <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{hoveredSynthese.text}</p>
        </div>
      )}

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
      
      {/* Domain Response Modal */}
      {isDomainResponseModalOpen && selectedRowForComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 border-t-4 border-blue-500">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        Réponse Domaine Expert
                        <span className={`text-xs px-2 py-1 rounded border ${DOMAIN_TAG_COLORS[selectedRowForComment.domainTag || '']}`}>
                            {selectedRowForComment.domainTag}
                        </span>
                    </h2>
                    <p className="text-md text-gray-600 mt-1">Sujet : {selectedRowForComment.thematique}</p>
                </div>
                <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Votre réponse en tant que {currentUser} :
                    </label>
                    <textarea
                        rows={5}
                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                        value={domainResponseInput}
                        onChange={(e) => setDomainResponseInput(e.target.value)}
                        placeholder="Saisissez la réponse ou la validation officielle du domaine..."
                    />
                </div>
                <div className="flex justify-end p-4 bg-gray-50 rounded-b-lg space-x-3">
                    <button onClick={handleCloseDomainResponseModal} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Annuler</button>
                    <button onClick={handleSaveDomainResponse} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Enregistrer la réponse</button>
                </div>
            </div>
        </div>
      )}

      {/* Thematique Comment Modal */}
      {isThematiqueCommentModalOpen && selectedRowForComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">Commentaire Administrateur</h2>
                    <p className="text-md text-gray-600 mt-1">sur : {selectedRowForComment.thematique}</p>
                </div>
                <div className="p-6">
                    <textarea
                        rows={5}
                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                        value={thematiqueCommentInput}
                        onChange={(e) => setThematiqueCommentInput(e.target.value)}
                        placeholder="Saisissez un commentaire pour cette thématique..."
                    />
                </div>
                <div className="flex justify-end p-4 bg-gray-50 rounded-b-lg space-x-3">
                    <button onClick={handleCloseThematiqueCommentModal} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Annuler</button>
                    <button onClick={handleSaveThematiqueComment} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Enregistrer</button>
                </div>
            </div>
        </div>
      )}
      {/* Column Editor Modal */}
       {isColumnEditorOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-gray-800">Éditeur de Colonnes</h2>
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                       {currentColumns.map((col, index) => (
                           <div key={index} className="grid grid-cols-12 gap-4 items-center">
                               <div className="col-span-1">
                                    <input type="checkbox" checked={col.visible} onChange={e => handleColumnChange(index, 'visible', e.target.checked)} className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                               </div>
                               <div className="col-span-9">
                                    <input type="text" value={col.header} onChange={e => handleColumnChange(index, 'header', e.target.value)} className={inputClasses} disabled={!col.editable} />
                               </div>
                               <div className="col-span-2 text-right">
                                  {col.editable && (
                                      <button onClick={() => removeColumn(index)} className="p-1 text-red-500 hover:text-red-700" title="Supprimer la colonne">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                      </button>
                                  )}
                               </div>
                           </div>
                       ))}
                       <div className="mt-4 pt-4 border-t">
                            <button onClick={addNewColumn} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                                Ajouter une colonne
                            </button>
                        </div>
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
        <div className="justify-self-center text-center flex flex-col items-center">
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
            <div className="flex items-end flex-wrap gap-4">
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
                {title === 'Fiches transverses' && (
                    <div>
                        <label htmlFor="comment-filter" className="block text-sm font-medium text-gray-700 mb-1">
                            Filtrer par Victoire Rapide / Comité Unité
                        </label>
                        <select
                            id="comment-filter"
                            value={commentFilter}
                            onChange={(e) => setCommentFilter(e.target.value)}
                            className="w-full max-w-xs bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                            aria-label="Filtrer par Victoire Rapide / Comité Unité"
                        >
                            {Object.entries(commentFilterOptions).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>
                )}
                <button 
                    onClick={() => setIsHelpModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all animate-pulse"
                    title="Cliquer pour afficher l'aide à la saisie"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    AIDE SAISIE BBZ
                </button>
            </div>
             <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Bouton de bascule 'Saisie Terminée' pour le propriétaire du tableau */}
                {isOwner && (
                  <div className="flex items-center mr-4 bg-white px-3 py-2 rounded-md border border-gray-200 shadow-sm">
                    <label htmlFor="finished-toggle" className="flex items-center cursor-pointer">
                      <div className="relative">
                        <input 
                          id="finished-toggle" 
                          type="checkbox" 
                          className="sr-only" 
                          checked={isFinished || false} 
                          onChange={(e) => onToggleStatus(e.target.checked)}
                        />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${isFinished ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isFinished ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                      <div className="ml-3 text-sm font-medium text-gray-700">
                        {isFinished ? <span className="text-green-600 font-bold">Saisie terminée</span> : "Saisie en cours"}
                      </div>
                    </label>
                  </div>
                )}

                {isAdmin && isCustom && (
                    <button onClick={() => setIsColumnEditorOpen(true)} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Gérer les colonnes</button>
                )}
                {(isAdmin || title.includes('Remontée') || isCustom) && (
                     <button onClick={addRow} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">Ajouter une ligne</button>
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
        <div 
            ref={tableContainerRef}
            className="overflow-auto max-h-[75vh]"
        >
          {renderTable()}
        </div>
      </main>
    </>
  );
};

export default TablePage;
