import React, { useState, useEffect } from 'react';
import { type HistoryEntry } from '../types';

interface HistoryPageProps {
  onBack: () => void;
  historyKey: string;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onBack, historyKey }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const savedHistoryJSON = localStorage.getItem(historyKey);
      if (savedHistoryJSON) {
        const savedHistory: HistoryEntry[] = JSON.parse(savedHistoryJSON);
        // Trier les entrées de la plus récente à la plus ancienne
        savedHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setHistory(savedHistory);
      }
    } catch (error) {
      console.error("Erreur lors du chargement de l'historique depuis le localStorage", error);
    }
  }, [historyKey]);

  return (
    <>
      <header className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Historique des modifications</h1>
          <button
            onClick={onBack}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Retour au tableau
          </button>
        </div>
      </header>

      <main className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          {history.length > 0 ? (
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-100 border-b">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Date</th>
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Utilisateur</th>
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Thématique modifiée</th>
                  <th scope="col" className="px-6 py-4 font-semibold whitespace-nowrap">Champ</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Ancienne valeur</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Nouvelle valeur</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, index) => (
                  <tr key={index} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(entry.timestamp).toLocaleString('fr-FR')}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{entry.user}</td>
                    <td className="px-6 py-4">{entry.rowThematique}</td>
                    <td className="px-6 py-4 font-medium">{entry.field}</td>
                    <td className="px-6 py-4 text-red-700">{entry.oldValue}</td>
                    <td className="px-6 py-4 text-green-700">{entry.newValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-8 text-center text-gray-500">Aucune modification n'a encore été enregistrée.</p>
          )}
        </div>
      </main>
    </>
  );
};

export default HistoryPage;