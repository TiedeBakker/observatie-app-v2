'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
// We importeren de nieuwe functies die praten met jouw 'sportSessies' tabel
import { synchroniseerPolarTrainingen, getOpgeslagenTrainingen } from './polarActions';

export default function PolarPage() {
    const [loading, setLoading] = useState(false);
    const [statusBericht, setStatusBericht] = useState<string | null>(null);
    const [isFout, setIsFout] = useState(false);
    const [trainingen, setTrainingen] = useState<any[]>([]);

    // Laad direct de trainingen in die al in jouw sportSessies tabel staan
    const laadTrainingen = async () => {
        const data = await getOpgeslagenTrainingen();
        setTrainingen(data);
    };

    // Haal de data op zodra de pagina opent
    useEffect(() => {
        laadTrainingen();
    }, []);

    const handleSync = async () => {
        setLoading(true);
        setStatusBericht(null);
        setIsFout(false);

        // Voer de echte synchronisatie uit (haalt sessies + seconde-metingen binnen)
        const res = await synchroniseerPolarTrainingen();
        
        if (res.success) {
            setStatusBericht(res.message || 'Succesvol gesynchroniseerd!');
            await laadTrainingen(); // Update de lijst direct live op het scherm
        } else {
            setIsFout(true);
            setStatusBericht(res.error || 'Er ging iets mis.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                
                {/* Navigatie / Terug-knop */}
                <div className="flex items-center justify-between">
                    <Link 
                        href="/" 
                        className="text-sm font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                        ← Terug naar Dashboard
                    </Link>
                    <h1 className="text-xl font-bold text-slate-800">🏃‍♂️ Polar Flow Integratie</h1>
                </div>

                {/* Status Kaart */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                    <h2 className="text-lg font-semibold mb-2">Verbindingsstatus</h2>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
                        <div>
                            <p className="text-emerald-800 font-medium flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                                Jouw Polar Account is succesvol gekoppeld
                            </p>
                            <p className="text-xs text-emerald-600 mt-0.5">
                                Je token is veilig opgeslagen in de database.
                            </p>
                        </div>
                        <Link 
                            href="/api/polar/login"
                            className="text-xs bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg font-medium text-center transition-colors"
                        >
                            Opnieuw koppelen
                        </Link>
                    </div>
                </div>

                {/* Gedeelte voor Synchronisatie */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                        <h2 className="text-lg font-semibold text-slate-800">Sessies Synchroniseren</h2>
                        <p className="text-xs text-slate-400">Haal je nieuwste trainingen op uit de Polar Cloud</p>
                    </div>

                    {/* Feedback melding van de API */}
                    {statusBericht && (
                        <div className={`p-4 rounded-xl text-sm font-medium border ${
                            isFout ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                        }`}>
                            {isFout ? '❌ ' : '💡 '}{statusBericht}
                        </div>
                    )}
                    
                    <div className="p-8 border border-dashed border-slate-200 rounded-xl text-center">
                        <p className="text-sm text-slate-400 italic mb-4">
                            Klik op de knop om je nieuwe sportsessies, hartslagen en GPS-metingen live binnen te trekken.
                        </p>
                        <button 
                            onClick={handleSync}
                            disabled={loading}
                            className={`text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-xs ${
                                loading 
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                            }`}
                        >
                            {loading ? '⏳ Synchroniseren met Polar Cloud...' : '🔄 Haal nieuwe trainingen op'}
                        </button>
                    </div>
                </div>

                {/* Historie / Opgeslagen trainingen uit jouw sportSessies tabel */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <h2 className="text-lg font-semibold text-slate-800">Gesynchroniseerde Trainingen ({trainingen.length})</h2>
                    
                    {trainingen.length === 0 ? (
                        <p className="text-sm text-slate-400 italic bg-slate-50 p-6 rounded-xl border border-dashed border-slate-200 text-center">
                            Er staan op dit moment nog geen sportsessies in de lokale database. Klik hierboven op ophalen!
                        </p>
                    ) : (
                        <div className="overflow-hidden border border-slate-100 rounded-xl divide-y divide-slate-100">
                            {trainingen.map((t) => (
                                <div key={t.id} className="p-4 hover:bg-slate-50 flex items-center justify-between gap-4 transition-colors">
                                    <div>
                                        <span className="inline-block bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-md mb-1">
                                            {t.sportType}
                                        </span>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {t.startTijd ? new Date(t.startTijd).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' }) : 'Onbekende datum'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-0.5">
                                            {t.calorieen ? `🔥 ${t.calorieen} kcal` : ''} 
                                            {t.gemiddeldeHartslag ? ` | ❤️ Gem: ${t.gemiddeldeHartslag} bpm` : ''}
                                            {t.maximaleHartslag ? ` | 📈 Max: ${t.maximaleHartslag} bpm` : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono font-medium text-slate-600">
                                            {/* Rekent duur in seconden netjes om naar minuten */}
                                            {Math.round(t.duur / 60)} min
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}