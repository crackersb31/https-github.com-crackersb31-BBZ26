import React, { useState, useEffect, useMemo } from 'react';
import { type HistoryEntry } from '../types';
import { db } from '../firebase-config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

interface HistoryPageProps {
  onBack: () => void;
  historyKey: string | null;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onBack, historyKey }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedThematique, setSelectedThematique] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  const isGlobalHistory = historyKey === null;

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const historyCollectionRef = collection(db, 'history');
        const q = isGlobalHistory
          ? query(historyCollectionRef, orderBy("timestamp", "desc"))
          : query(
              historyCollectionRef,
              where("pageKey", "==", historyKey),
              orderBy("timestamp", "desc")
            );
            
        const querySnapshot = await getDocs(q);
        const fetchedHistory: HistoryEntry[] = [];
        querySnapshot.forEach((doc) => {
          fetchedHistory.push(doc.data() as HistoryEntry);
        });
        setHistory(fetchedHistory);
      } catch (error) {
        console.error("Erreur lors du chargement de l'historique depuis Firestore", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [historyKey, isGlobalHistory]);

  const uniqueUsers = useMemo(
    () => ['all', ...Array.from(new Set(history.map(entry => entry.user))).sort()],
    [history]
  );
  
  const uniqueThematiques = useMemo(
    () => ['all', ...Array.from(new Set(history.map(entry => entry.rowThematique))).sort()],
    [history]
  );

  const filteredHistory = useMemo(() => {
    return history.filter(entry => {
      const userMatch = selectedUser === 'all' || entry.user === selectedUser;
      const thematiqueMatch = selectedThematique === 'all' || entry.rowThematique === selectedThematique;
      // Compare only the date part, ignoring time. 'fr-CA' format is 'YYYY-MM-DD'
      const dateMatch = !selectedDate || new Date(entry.timestamp).toLocaleDateString('fr-CA') === selectedDate;
      return userMatch && thematiqueMatch && dateMatch;
    });
  }, [history, selectedUser, selectedThematique, selectedDate]);
  
  const resetFilters = () => {
    setSelectedUser('all');
    setSelectedThematique('all');
    setSelectedDate('');
  };

  return (
    <>
      <header className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">
            {isGlobalHistory ? "Historique Global des Modifications" : "Historique des modifications"}
          </h1>
          <button
            onClick={onBack}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            {isGlobalHistory ? "Retour au sommaire" : "Retour au tableau"}
          </button>
        </div>
      </header>

      <main className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                    <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700 mb-1">Filtrer par utilisateur</label>
                    <select id="user-filter" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md shadow-sm p-2 text-sm">
                        {uniqueUsers.map(user => <option key={user} value={user}>{user === 'all' ? 'Tous les utilisateurs' : user}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="thematique-filter" className="block text-sm font-medium text-gray-700 mb-1">Filtrer par thématique</label>
                    <select id="thematique-filter" value={selectedThematique} onChange={e => setSelectedThematique(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md shadow-sm p-2 text-sm">
                        {uniqueThematiques.map(thematique => <option key={thematique} value={thematique}>{thematique === 'all' ? 'Toutes les thématiques' : thematique}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">Filtrer par date</label>
                    <input type="date" id="date-filter" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-white border border-gray-300 rounded-md shadow-sm p-2 text-sm" />
                </div>
                <button onClick={resetFilters} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    Réinitialiser
                </button>
            </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
             <p className="p-8 text-center text-gray-500">Chargement de l'historique...</p>
          ) : history.length === 0 ? (
             <p className="p-8 text-center text-gray-500">Aucune modification n'a encore été enregistrée.</p>
          ) : filteredHistory.length > 0 ? (
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Date</th>
                  {isGlobalHistory && <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Tableau</th>}
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Utilisateur</th>
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Thématique modifiée</th>
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Champ</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Ancienne valeur</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Nouvelle valeur</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((entry, index) => (
                  <tr key={index} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button 
                        onClick={() => setSelectedDate(new Date(entry.timestamp).toLocaleDateString('fr-CA'))}
                        className="text-blue-600 hover:underline focus:outline-none"
                        title={`Filtrer par cette date : ${new Date(entry.timestamp).toLocaleDateString('fr-FR')}`}
                      >
                        {new Date(entry.timestamp).toLocaleString('fr-FR')}
                      </button>
                    </td>
                    {isGlobalHistory && <td className="px-6 py-4 whitespace-nowrap">{entry.pageKey || 'N/A'}</td>}
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                       <button 
                        onClick={() => setSelectedUser(entry.user)}
                        className="text-blue-600 hover:underline focus:outline-none"
                        title={`Filtrer par l'utilisateur : ${entry.user}`}
                      >
                        {entry.user}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedThematique(entry.rowThematique)}
                        className="text-blue-600 hover:underline focus:outline-none text-left"
                        title={`Filtrer par la thématique : ${entry.rowThematique}`}
                      >
                        {entry.rowThematique}
                      </button>
                    </td>
                    <td className="px-6 py-4 font-medium">{entry.field}</td>
                    <td className="px-6 py-4 text-red-700">{entry.oldValue}</td>
                    <td className="px-6 py-4 text-green-700">{entry.newValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-8 text-center text-gray-500">Aucun résultat ne correspond à vos critères de recherche.</p>
          )}
        </div>
      </main>
    </>
  );
};

export default HistoryPage;