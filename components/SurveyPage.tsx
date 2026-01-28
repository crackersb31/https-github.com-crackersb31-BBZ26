
import React, { useState, useEffect } from 'react';
import { db } from '../firebase-config';
import { type SurveyTheme, type SurveyResponse } from '../types';

interface SurveyPageProps {
  currentUser: string;
  themes: SurveyTheme[];
  onBack: () => void;
}

const SurveyPage: React.FC<SurveyPageProps> = ({ currentUser, themes, onBack }) => {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const totalAxes = themes.reduce((sum, t) => sum + t.axes.length, 0);

  useEffect(() => {
    const fetchExistingVote = async () => {
      try {
        const snap = await db.collection('surveys').doc(currentUser).get();
        if (snap.exists) {
          const data = snap.data() as SurveyResponse;
          setRatings(data.ratings || {});
          setComments(data.comments || {});
        }
      } catch (e) {} finally {
        setLoading(false);
      }
    };
    fetchExistingVote();
  }, [currentUser]);

  const handleRate = (axisId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [axisId]: rating }));
  };

  const handleComment = (themeId: string, text: string) => {
    setComments(prev => ({ ...prev, [themeId]: text }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response: SurveyResponse = {
        userId: currentUser,
        timestamp: new Date().toISOString(),
        ratings,
        comments
      };
      await db.collection('surveys').doc(currentUser).set(response);
      setMessage('Votre vote a été enregistré avec succès !');
      setTimeout(() => onBack(), 2000);
    } catch (e) {
      setMessage('Erreur lors de l’enregistrement.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center p-20">Chargement du sondage...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-48">
      <header className="mb-6 flex justify-between items-center px-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Priorisation Stratégique 2027</h1>
          <p className="text-gray-500 mt-1 font-bold">Évaluez l'importance de chaque levier pour le budget 2027.</p>
        </div>
        <button onClick={onBack} className="py-2 px-6 bg-white border border-gray-200 rounded-xl shadow-sm font-bold text-gray-600 hover:bg-gray-50 transition-all">&larr; Retour</button>
      </header>

      {/* Légende de l'échelle */}
      <div className="mx-4 mb-10 bg-indigo-50 border border-indigo-100 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
        <div className="flex-1">
          <h4 className="text-indigo-900 font-black text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Comprendre l'échelle de 1 à 5
          </h4>
          <p className="text-indigo-700 text-xs font-bold leading-relaxed">
            Notez 1 pour une priorité faible (peu d'intérêt/impact) et 5 pour une priorité haute (levier stratégique crucial).
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white/50 p-3 rounded-2xl border border-indigo-100">
           <div className="text-center">
              <span className="block text-xl font-black text-indigo-300">1</span>
              <span className="text-[10px] font-black text-indigo-300 uppercase">Faible</span>
           </div>
           <div className="w-12 h-px bg-indigo-200"></div>
           <div className="text-center">
              <span className="block text-xl font-black text-indigo-600">5</span>
              <span className="text-[10px] font-black text-indigo-600 uppercase">Haute</span>
           </div>
        </div>
      </div>

      <div className="space-y-12 px-4">
        {themes.map((theme) => {
          const axesVotedCount = theme.axes.filter(a => ratings[a.id]).length;
          const isThemeComplete = axesVotedCount === theme.axes.length;

          return (
            <div key={theme.id} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{theme.icon}</span>
                  <div>
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{theme.title}</h3>
                    <p className="text-xs text-gray-400 font-bold mt-0.5">{theme.objective}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isThemeComplete ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {axesVotedCount} / {theme.axes.length} AXES NOTÉS
                </div>
              </div>

              <div className="p-6 space-y-10">
                {theme.axes.map((axis) => (
                  <div key={axis.id} className="flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                    <div className="flex-1">
                      <p className="text-gray-700 font-bold group-hover:text-indigo-600 transition-colors leading-snug">{axis.label}</p>
                    </div>
                    <div className="relative">
                      {/* Labels d'aide au-dessus de l'échelle */}
                      <div className="flex justify-between px-2 mb-1">
                        <span className="text-[9px] font-black text-gray-300 uppercase">Faible</span>
                        <span className="text-[9px] font-black text-indigo-400 uppercase">Priorité Haute</span>
                      </div>
                      <div className="flex gap-2 bg-gray-50 p-1 rounded-full border border-gray-100">
                        {[1, 2, 3, 4, 5].map((num) => (
                          <button
                            key={num}
                            onClick={() => handleRate(axis.id, num)}
                            className={`w-10 h-10 rounded-full font-black text-sm transition-all ${
                              ratings[axis.id] === num 
                                ? 'bg-indigo-600 text-white shadow-md scale-105' 
                                : 'hover:bg-indigo-100 text-indigo-300'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="pt-6 border-t border-gray-100">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Notes libres sur ce thème</label>
                    <textarea 
                      placeholder="Une remarque particulière sur l'un de ces axes ?"
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-100 resize-none h-24"
                      value={comments[theme.id] || ''}
                      onChange={(e) => handleComment(theme.id, e.target.value)}
                    />
                </div>
              </div>
            </div>
          );
        })}

        {/* Grand bouton de fin de liste */}
        <div className="pt-10 flex flex-col items-center gap-4">
            <button 
                onClick={handleSave}
                disabled={saving || Object.keys(ratings).length === 0}
                className="w-full max-w-md py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-lg rounded-3xl shadow-2xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
            >
                {saving ? (
                    'ENREGISTREMENT...'
                ) : (
                    <>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        SAUVEGARDER MA SAISIE
                    </>
                )}
            </button>
            <p className="text-xs text-gray-400 font-bold">Votre vote peut être modifié à tout moment jusqu'à la clôture.</p>
        </div>
      </div>

      {/* Barre de progression flottante avec bouton de sauvegarde */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40">
        <div className="bg-gray-900/90 backdrop-blur-xl text-white p-4 rounded-[2.5rem] shadow-2xl flex items-center justify-between gap-6 border border-white/10">
           <div className="flex-1 pl-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-indigo-300 mb-2">
                <span>Progression totale</span>
                <span>{Object.keys(ratings).length} / {totalAxes}</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-indigo-400 transition-all duration-700 ease-out" 
                   style={{ width: `${(Object.keys(ratings).length / totalAxes) * 100}%` }}
                 ></div>
              </div>
           </div>
           <button 
             onClick={handleSave}
             disabled={saving || Object.keys(ratings).length === 0}
             className="px-8 py-4 bg-indigo-500 text-white font-black rounded-2xl hover:bg-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95 whitespace-nowrap text-sm"
           >
             {saving ? 'ENVOI...' : 'SAUVEGARDER'}
           </button>
        </div>
        {message && <p className={`text-center mt-4 font-black text-sm drop-shadow-md ${message.includes('succès') ? 'text-emerald-400' : 'text-rose-400'}`}>{message}</p>}
      </div>
    </div>
  );
};

export default SurveyPage;
