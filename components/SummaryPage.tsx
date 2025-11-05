import React from 'react';

interface PageConfigForSummary {
  title: string;
  subtitle?: string;
}

interface SummaryPageProps {
  currentUser: string;
  pages: PageConfigForSummary[];
  onSelectPage: (index: number) => void;
  onLogout: () => void;
  onSelectHistory: () => void;
}

const SummaryPage: React.FC<SummaryPageProps> = ({ currentUser, pages, onSelectPage, onLogout, onSelectHistory }) => {
  // Filtre les pages en fonction du rôle de l'utilisateur actuel.
  const availablePages = pages
    .map((page, index) => ({ ...page, index }))
    .filter(page => {
      if (currentUser === 'ADMIN') {
        return true; // L'administrateur voit toutes les pages.
      }
      // Tous les utilisateurs voient la première page générique.
      if (page.index === 0) {
          return true;
      }
      // Les utilisateurs voient les pages qui incluent leur nom d'équipe dans le titre.
      return page.title.includes(currentUser);
    });

  return (
    // La div principale n'a pas besoin du conteneur car il est déjà dans App.tsx
    // Mais LoginPage l'a, donc pour la cohérence visuelle, nous gérons la mise en page ici.
    <div className="min-h-screen bg-gray-50 flex flex-col -m-4 sm:-m-6 lg:-m-8">
      <header className="bg-white shadow-sm w-full">
          <div className="container mx-auto p-4 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-800">Sommaire</h1>
              <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-600">Connecté en tant que <span className="font-semibold">{currentUser}</span></span>
                  <button onClick={onLogout} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                      Se déconnecter
                  </button>
              </div>
          </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-grow">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Sélectionnez un tableau</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availablePages.map((page) => (
                  <div
                      key={page.index}
                      onClick={() => onSelectPage(page.index)}
                      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer p-6 flex flex-col justify-between"
                  >
                      <div>
                          <h3 className="text-xl font-bold text-blue-600 mb-2">{page.title}</h3>
                          {page.subtitle && <p className="text-gray-600 text-sm">{page.subtitle}</p>}
                      </div>
                      <div className="text-right mt-4">
                           <span className="text-blue-500 font-semibold">Accéder &rarr;</span>
                      </div>
                  </div>
              ))}
              {currentUser === 'ADMIN' && (
                <div
                    onClick={onSelectHistory}
                    className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer p-6 flex flex-col justify-between"
                >
                    <div>
                        <h3 className="text-xl font-bold text-teal-600 mb-2">Historique Global</h3>
                        <p className="text-gray-600 text-sm">Consulter l'historique de toutes les modifications sur tous les tableaux.</p>
                    </div>
                    <div className="text-right mt-4">
                        <span className="text-teal-500 font-semibold">Consulter &rarr;</span>
                    </div>
                </div>
              )}
          </div>
      </main>
    </div>
  );
};

export default SummaryPage;
