
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase-config';
import { type SurveyTheme, type SurveyResponse } from '../types';

interface SurveyResultsPageProps {
  onBack: () => void;
  themes: SurveyTheme[];
}

const SurveyResultsPage: React.FC<SurveyResultsPageProps> = ({ onBack, themes }) => {
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const snap = await db.collection('surveys').get();
        const results: SurveyResponse[] = [];
        snap.forEach(doc => results.push(doc.data() as SurveyResponse));
        setResponses(results);
      } catch (e) {} finally {
        setLoading(false);
      }
    };
    fetchVotes();
  }, []);

  const themeResults = useMemo(() => {
    return themes.map(theme => {
      // Pour chaque axe du thème, on récupère tous les votes
      const axesDetails = theme.axes.map(axis => {
        const axisRatings = responses.map(r => r.ratings[axis.id]).filter(v => v !== undefined);
        const avg = axisRatings.length > 0 ? axisRatings.reduce((a, b) => a + b, 0) / axisRatings.length : 0;
        return { ...axis, avg, count: axisRatings.length };
      });

      // La note globale du thème est la moyenne de ses axes
      const themeAvg = axesDetails.reduce((sum, a) => sum + a.avg, 0) / theme.axes.length;
      
      return {
        ...theme,
        avg: themeAvg,
        axesDetails,
        comments: responses.map(r => ({ user: r.userId, text: r.comments[theme.id] })).filter(c => c.text && c.text.trim())
      };
    }).sort((a, b) => b.avg - a.avg);
  }, [responses, themes]);

  if (loading) return <div className="text-center p-20">Analyse des priorités par axe...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tighter">Arbitrages BBZ 2027</h1>
          <p className="text-gray-500 mt-1 font-medium italic">Classement consolidé basé sur les axes de réflexion ({responses.length} votants).</p>
        </div>
        <button onClick={onBack} className="py-3 px-8 bg-gray-900 text-white rounded-2xl shadow-xl font-black text-sm hover:scale-105 transition-all">Retour Sommaire</button>
      </header>

      <div className="grid grid-cols-1 gap-12">
        {themeResults.map((res, index) => (
          <div key={res.id} className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col xl:flex-row gap-12">
            
            {/* Colonne Principale : Thème et Score */}
            <div className="flex-1">
              <div className="flex items-center gap-6 mb-8">
                <div className="relative">
                  <span className="absolute -top-4 -left-4 w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-black text-xs z-10 shadow-lg">#{index + 1}</span>
                  <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-4xl shadow-inner border border-white">
                    {res.icon}
                  </div>
                </div>
                <div>
                   <h3 className="text-3xl font-black text-gray-800 uppercase tracking-tighter leading-none">{res.title}</h3>
                   <div className="mt-2 flex items-center gap-3">
                      <span className="text-4xl font-black text-indigo-600">{res.avg.toFixed(2)}</span>
                      <div className="h-2 w-32 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${res.avg >= 4 ? 'bg-emerald-500' : res.avg >= 3 ? 'bg-amber-400' : 'bg-rose-500'}`} style={{ width: `${(res.avg/5)*100}%` }}></div>
                      </div>
                   </div>
                </div>
              </div>

              {/* Détail par AXE */}
              <div className="space-y-4 mb-10">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Moyennes par axe de réflexion</h4>
                {res.axesDetails.map(axis => (
                  <div key={axis.id} className="group">
                    <div className="flex justify-between items-center mb-1">
                       <p className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">{axis.label}</p>
                       <span className="text-xs font-black text-gray-800">{axis.avg.toFixed(1)} <span className="text-[10px] text-gray-400 font-medium">({axis.count} v)</span></span>
                    </div>
                    <div className="h-1 bg-gray-50 rounded-full overflow-hidden">
                       <div className="h-full bg-indigo-400 opacity-60" style={{ width: `${(axis.avg/5)*100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>

              {res.comments.length > 0 && (
                 <div className="pt-8 border-t border-gray-100">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Remarques qualitatives</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {res.comments.map((c, i) => (
                            <div key={i} className="bg-gray-50 p-4 rounded-2xl border border-white shadow-sm italic text-xs text-gray-600">
                                "{c.text}"
                                <p className="text-[9px] font-black text-indigo-300 mt-2 uppercase">— {c.user}</p>
                            </div>
                        ))}
                    </div>
                 </div>
              )}
            </div>

            {/* Colonne Latérale : Distribution Globale */}
            <div className="xl:w-80 bg-gray-50/50 rounded-[2rem] p-8 border border-white shadow-inner flex flex-col">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8 text-center">Profil d'adhésion (Toutes notes confondues)</h4>
                <div className="flex-1 space-y-4 flex flex-col justify-center">
                   {[5, 4, 3, 2, 1].map(score => {
                       // On compte combien de fois cette note a été donnée parmi TOUS les axes de ce thème
                       let scoreCount = 0;
                       let totalThemeVotes = 0;
                       res.axesDetails.forEach(axis => {
                           responses.forEach(r => {
                               if (r.ratings[axis.id] !== undefined) {
                                   totalThemeVotes++;
                                   if (r.ratings[axis.id] === score) scoreCount++;
                               }
                           });
                       });
                       const pct = totalThemeVotes > 0 ? (scoreCount / totalThemeVotes) * 100 : 0;
                       
                       return (
                           <div key={score} className="flex items-center gap-4">
                               <span className="text-xs font-black text-gray-400 w-4">{score}</span>
                               <div className="flex-1 h-3 bg-white rounded-full overflow-hidden shadow-sm border border-white">
                                   <div className={`h-full transition-all duration-1000 ${score >= 4 ? 'bg-indigo-500' : score === 3 ? 'bg-indigo-300' : 'bg-gray-300'}`} style={{ width: `${pct}%` }}></div>
                               </div>
                               <span className="text-[10px] font-black text-indigo-400 w-8">{Math.round(pct)}%</span>
                           </div>
                       )
                   })}
                </div>
                <div className="mt-8 p-4 bg-white/50 rounded-2xl text-[10px] text-gray-400 font-bold leading-tight">
                    La note globale est calculée comme la moyenne arithmétique des scores de chaque axe.
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SurveyResultsPage;
