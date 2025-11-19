import React from 'react';

interface AnnouncementPageProps {
  message: string;
  onAcknowledge: () => void;
}

const AnnouncementPage: React.FC<AnnouncementPageProps> = ({ message, onAcknowledge }) => {
  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-slate-900 px-4">
      {/* Arrière-plan animé (réutilisation du style Login pour cohérence) */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"></div>
      
      {/* Orbes d'ambiance */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-20%] right-[20%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-[128px] opacity-30 animate-blob animation-delay-2000"></div>

      {/* Carte du message */}
      <div className="relative w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-fade-in-up">
        
        {/* En-tête */}
        <div className="bg-gradient-to-r from-blue-600/80 to-indigo-600/80 p-6 flex items-center gap-4 border-b border-white/10">
             <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm shadow-inner">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
             </div>
             <div>
                 <h2 className="text-2xl font-bold text-white">Message Important</h2>
                 <p className="text-blue-100 text-sm">Communication de l'administration</p>
             </div>
        </div>

        {/* Contenu du message */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
            <div className="prose prose-invert max-w-none">
                <p className="text-lg text-gray-100 whitespace-pre-wrap leading-relaxed">
                    {message}
                </p>
            </div>
        </div>

        {/* Pied de page avec bouton */}
        <div className="p-6 bg-black/20 border-t border-white/10 flex justify-end">
            <button
                onClick={onAcknowledge}
                className="group flex items-center px-6 py-3 bg-white text-blue-900 font-bold rounded-xl shadow-lg hover:bg-blue-50 hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
                J'ai lu et je continue
                <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
            </button>
        </div>
      </div>

       {/* Styles CSS pour les animations */}
       <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 10s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }
      `}</style>
    </div>
  );
};

export default AnnouncementPage;