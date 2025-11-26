
import React, { useState, useEffect } from 'react';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';
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
          const docRef = doc(db, 'pagesData', config.storageKey);
          const docSnap = await getDoc(docRef);
          let rows: RowData[] = [];
          
          if (docSnap.exists()) {
            rows = docSnap.data().rows as RowData[];
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
                        <th className="px-6 py-3 font-semibold">{isPending ? 'Statut' : 'Réponse de l\'expert'}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {rows.map((row, index) => (
                        <tr key={`${row.id}-${index}`} className="bg-white hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-500 text-xs">{row.sourcePage}</td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${DOMAIN_TAG_COLORS[row.domainTag || ''] || 'bg-gray-100'}`}>
                                    {row.domainTag}
                                </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-gray-900">{row.thematique}</td>
                            <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={row.synthese}>{row.synthese}</td>
                            <td className="px-6 py-4">
                                {isPending ? (
                                    <span className="inline-flex items-center text-orange-600 text-xs font-semibold bg-orange-100 px-2 py-1 rounded-full">
                                        <svg className="w-3 h-3 mr-1 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        En attente
                                    </span>
                                ) : (
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-blue-900 text-sm whitespace-pre-wrap">
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
      <header className="mb-8 flex justify-between items-center flex-wrap gap-4">
        <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 flex items-center gap-3">
                <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                Suivi des Réponses Experts
            </h1>
            <p className="text-gray-500 mt-2">Centralisation des questions posées aux domaines (Tags) et de leurs réponses.</p>
        </div>
        <button onClick={onBack} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700">
          Retour au sommaire
        </button>
      </header>

      {loading ? (
           <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow">
               <div className="text-gray-500">Chargement des données...</div>
           </div>
      ) : (
          <div className="space-y-8">
              {/* SECTION 1 : RÉPONSES APPORTÉES */}
              <section className="bg-white rounded-xl shadow-md overflow-hidden border border-blue-100">
                  <div className="p-4 border-b border-blue-100 bg-blue-50 flex justify-between items-center">
                      <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Réponses validées
                      </h2>
                      <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded-full">{answeredRows.length}</span>
                  </div>
                  {renderTable(answeredRows, false)}
              </section>

              {/* SECTION 2 : QUESTIONS EN ATTENTE */}
              <section className="bg-white rounded-xl shadow-md overflow-hidden border border-orange-100">
                  <div className="p-4 border-b border-orange-100 bg-orange-50 flex justify-between items-center">
                      <h2 className="text-lg font-bold text-orange-900 flex items-center gap-2">
                          <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          Questions en attente de réponse
                      </h2>
                      <span className="bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-full">{pendingRows.length}</span>
                  </div>
                  {renderTable(pendingRows, true)}
              </section>
          </div>
      )}
    </>
  );
};

export default ExpertResponsesPage;
