import React, { useState } from 'react';
import { type PageConfig, type Column } from '../types';
// FIX: Import defaultColumns from config and remove local definition.
import { defaultColumns } from '../config';

interface CreatePageProps {
  onBack: () => void;
  onPageCreated: (newPage: PageConfig) => void;
}

const CreatePage: React.FC<CreatePageProps> = ({ onBack, onPageCreated }) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Le titre est obligatoire.');
      return;
    }
    const timestamp = Date.now();
    const newPageConfig: PageConfig = {
        id: `custom_${timestamp}`,
        title: title.trim(),
        subtitle: subtitle.trim(),
        initialData: [], // Starts empty
        storageKey: `contributionTableData_custom_${timestamp}`,
        historyKey: `contributionHistory_custom_${timestamp}`,
        isCustom: true,
        columns: defaultColumns,
    };
    onPageCreated(newPageConfig);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Créer un nouveau tableau</h1>
        <button onClick={onBack} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            &larr; Retour au sommaire
        </button>
      </header>
      <main className="bg-white p-8 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Titre du tableau <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700">
              Sous-titre (optionnel)
            </label>
            <input
              type="text"
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <button
              type="submit"
              className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Créer et configurer
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreatePage;
