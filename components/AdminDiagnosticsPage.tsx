import React, { useState, useEffect } from 'react';
import { db } from '../firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { type PageConfig } from '../types';

interface AdminDiagnosticsPageProps {
  onBack: () => void;
}

const AdminDiagnosticsPage: React.FC<AdminDiagnosticsPageProps> = ({ onBack }) => {
  const [configData, setConfigData] = useState<PageConfig[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copyButtonText, setCopyButtonText] = useState('Copier dans le presse-papiers');

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'appConfig', 'pages');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().pageList) {
          setConfigData(docSnap.data().pageList);
        } else {
          setError("Le document de configuration des pages est introuvable dans Firestore.");
        }
      } catch (err) {
        console.error("Erreur lors de la récupération de la configuration pour la page de diagnostic", err);
        setError("Une erreur est survenue lors de la communication avec la base de données.");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleCopy = () => {
    if (configData) {
      const configString = JSON.stringify(configData, null, 2);
      navigator.clipboard.writeText(configString).then(() => {
        setCopyButtonText('Copié !');
        setTimeout(() => setCopyButtonText('Copier dans le presse-papiers'), 2000);
      }, (err) => {
        console.error('Erreur de copie dans le presse-papiers', err);
        setCopyButtonText('Erreur de copie');
        setTimeout(() => setCopyButtonText('Copier dans le presse-papiers'), 2000);
      });
    }
  };

  const renderContent = () => {
    if (loading) {
      return <p className="p-8 text-center text-gray-500">Chargement des données de configuration...</p>;
    }
    if (error) {
      return <p className="p-8 text-center text-red-500">{error}</p>;
    }
    if (configData) {
      return (
        <>
          <div className="prose max-w-none mb-6">
            <p>
                Cette section affiche les données de configuration brutes de tous les tableaux, telles qu'elles sont actuellement stockées dans la base de données.
                Ceci inclut les tableaux par défaut ainsi que tous les tableaux personnalisés créés.
            </p>
          </div>
          <div className="flex justify-end mb-4">
            <button
              onClick={handleCopy}
              className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {copyButtonText}
            </button>
          </div>
          <pre className="bg-gray-800 text-white p-4 rounded-md text-sm overflow-x-auto max-h-[60vh]">
            <code>
              {JSON.stringify(configData, null, 2)}
            </code>
          </pre>
        </>
      );
    }
    return null;
  };

  return (
    <>
      <header className="mb-8 grid grid-cols-3 items-center">
        <div className="justify-self-start">
            <button 
              onClick={onBack} 
              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              &larr; Retour au sommaire
            </button>
        </div>
        <div className="justify-self-center text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Diagnostic Admin</h1>
        </div>
      </header>
      <main className="bg-white rounded-lg shadow-md overflow-hidden">
         <div className="p-6 md:p-8 bg-gray-50">
            {renderContent()}
        </div>
      </main>
    </>
  );
};

export default AdminDiagnosticsPage;
