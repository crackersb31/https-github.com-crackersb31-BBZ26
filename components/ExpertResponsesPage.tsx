
import React, { useState, useEffect } from 'react';
import { db } from '../firebase-config';
import { type RowData, type PageConfig } from '../types';

interface ExpertResponsesPageProps {
  onBack: () => void;
  pageConfigs: PageConfig[];
}

interface EnrichedRow extends RowData {
    sourcePage: string;
}

const ExpertResponsesPage: React.FC<ExpertResponsesPageProps> = ({ onBack, pageConfigs }) => {
  const [answeredRows, setAnsweredRows] = useState<EnrichedRow[]>([]);
  const [pendingRows, setPendingRows] = useState<EnrichedRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Couleurs des badges (réutilisation de TablePage)
  const DOMAIN_TAG_COLORS: Record<string, string> = {
    'RH': 'bg-pink-100 text-pink-800 border-pink-200',
    'COM': 'bg-blue-100 text-blue-800 border-blue-200',
    'DC': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'DT': 'bg-orange-100 text-orange-800 border-orange-200',
    'DF': 'bg-red-100 text-red-800 border-red-200',
    'SST': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const allPromises = pageConfigs.map(async (config) => {
          // UTILISATION DE L'API COMPAT pour éviter les erreurs de modules
          const docRef = db.collection('pagesData').doc(config.storageKey);
          const docSnap = await docRef.get();
          let rows: RowData[] = [];
          
          if (docSnap.exists) {
            rows = docSnap.data()?.rows as RowData[];
          } else {
            rows = config.initialData as RowData[];
          }

          // On ne garde que les lignes qui ont un Tag Domaine (donc une question posée)
          return rows
            .filter(row => row.domainTag && row.domainTag !== null)
            .map(row => ({ ...row, sourcePage: config.title } as EnrichedRow));
        });
        
        const results = await Promise.all(allPromises);
        const allTaggedRows = results.flat();

        const answered = allTaggedRows.filter(row => row.domainResponse && row.domainResponse.trim() !== '');
        const pending = allTaggedRows.filter(row => !row.domainResponse || row.domainResponse.trim() === '');

        setAnsweredRows(answered);
        setPendingRows(pending);
      } catch (err) {
        console.error("Erreur lors de la récupération des réponses experts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [pageConfigs]);

  const renderTable = (rows: EnrichedRow[], isPending: boolean) => {
      if (rows.length === 0) {
          return <div className="p-8 text-center text-gray-500 italic">Aucune donnée dans cette catégorie.</div>;
      }

      return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
                <thead className={`text-xs uppercase border-b ${isPending ? 'bg-orange-50 text-orange-800' : 'bg-gray-50 text-gray-700'}`}>
                    <tr>
                        <th className="px-6 py-3 font-semibold">Tableau Source</th>
                        <th className="px-6 py-3 font-semibold">Domaine</th>
                        <th className="px-6 py-3 font-semibold">Thématique</th>
                        <th className="px-6 py-3 font-semibold">Synthèse du levier</th>
                        <th className="px-6 py-3 font-semibold">{isPending ? 'Statut' : 'Réponse'}</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={`${row.id}-${index}`} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{row.sourcePage}</td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${DOMAIN_TAG_COLORS[row.domainTag || ''] || 'bg-gray-100'}`}>
                                    {row.domainTag}
                                </span>
                            </td>
                            <td className="px-6 py-4">{row.thematique}</td>
                            <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={row.synthese}>{row.synthese}</td>
                            <td className="px-6 py-4">
                                {isPending ? (
                                    <span className="text-orange-600 font-semibold text-xs flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                                        En attente
                                    </span>
                                ) : (
                                    <div className="text-sm text-gray-800 bg-blue-50 p-2 rounded border border-blue-100">
                                        {row.domainResponse}
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      );
  };

  return (
    <>
      <header className="mb-8">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
             <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Suivi des Réponses Experts</h1>
          </div>
          <button onClick={onBack} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700">
            Retour au sommaire
          </button>
        </div>
      </header>

      <main className="space-y-8">
          {loading ? (
              <div className="p-12 text-center text-gray-500 text-lg">Chargement des sollicitations...</div>
          ) : (
            <>
                <section className="bg-white rounded-lg shadow-md overflow-hidden border border-orange-200">
                    <div className="p-4 bg-orange-50 border-b border-orange-200">
                        <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                            ⏳ En Attente de Réponse ({pendingRows.length})
                        </h2>
                    </div>
                    {renderTable(pendingRows, true)}
                </section>

                <section className="bg-white rounded-lg shadow-md overflow-hidden border border-blue-200">
                    <div className="p-4 bg-blue-50 border-b border-blue-200">
                        <h2 className="text-lg font-bold text-blue-800 flex items-center gap-2">
                            ✅ Réponses Validées ({answeredRows.length})
                        </h2>
                    </div>
                    {renderTable(answeredRows, false)}
                </section>
            </>
          )}
      </main>
    </>
  );
};

export default ExpertResponsesPage;
