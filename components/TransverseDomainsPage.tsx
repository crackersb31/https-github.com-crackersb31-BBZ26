
import React from 'react';
import TablePage from './TablePage';
import { type PageConfig, type Column } from '../types';

interface TransverseDomainsPageProps {
  currentUser: string;
  onLogout: () => void;
  onBack: () => void;
  pageConfig: PageConfig;
  onUpdatePageConfig: (pageId: string, newColumns: Column[]) => Promise<void>;
  onToggleStatus: (status: boolean) => void;
}

const TransverseDomainsPage: React.FC<TransverseDomainsPageProps> = ({
  currentUser,
  onLogout,
  onBack,
  pageConfig,
  onUpdatePageConfig,
  onToggleStatus
}) => {
  // On utilise directement le composant TablePage qui contient déjà toute la logique
  // (Header, Tableau, Sauvegarde, etc.) pour afficher le tableau "Fiches transverses"
  return (
    <TablePage
      currentUser={currentUser}
      onLogout={onLogout}
      onBackToSummary={onBack}
      pageConfig={pageConfig}
      onUpdatePageConfig={onUpdatePageConfig}
      onToggleStatus={onToggleStatus}
    />
  );
};

export default TransverseDomainsPage;
