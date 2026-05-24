'use client';

import { useState, useEffect } from 'react';
import { createObservatie, getObservatiesVanLocatie, createKenmerk } from './actions';
import { updateGroepVolledig, getGekoppeldeKenmerkenVanGroep, createGroepMetKenmerken } from './actions';
import { createLocatieMetGroepen, updateLocatieVolledig } from './actions';

type Locatie = {
    id: string;
    naam: string;
    beschrijving: string | null;
    latitude?: number | null;
    longitude?: number | null;
    groepen?: { id: string; naam: string; }[];
};
type Kenmerk = { id: string; naam: string; dimensie: string | null; type: 'fysisch' | 'chemisch' | 'biologisch'; };
type Groep = { id: string; naam: string; beschrijving: string | null; };

export default function ObservatieDashboard({
    locaties: initieleLocaties = [],
    kenmerken: initieleKenmerken = [],
    groepen = []
}: {
    locaties: Locatie[];
    kenmerken: Kenmerk[];
    groepen: Groep[];
}) {
    const [locaties, setLocaties] = useState<Locatie[]>(initieleLocaties);
    const [kenmerken, setKenmerken] = useState<Kenmerk[]>(initieleKenmerken);
    const [selectedLocatieId, setSelectedLocatieId] = useState<string>(initieleLocaties[0]?.id || '');

    // Schakelaars voor formulieren
    //const [isLocatieToevoegen, setIsLocatieToevoegen] = useState(false);
    const [isLocatieBeheren, setIsLocatieBeheren] = useState(false);
    const [beheerLocatieId, setBeheerLocatieId] = useState('NIEUW');
    const [locatieNaam, setLocatieNaam] = useState('');
    const [locatieBeschrijving, setLocatieBeschrijving] = useState('');
    const [isParameterToevoegen, setIsParameterToevoegen] = useState(false);

    // Nieuwe Locatie Form State
    const [nieuweNaam, setNieuweNaam] = useState('');
    const [nieuweBeschrijving, setNieuweBeschrijving] = useState('');
    const [gekozenGroepIds, setGekozenGroepIds] = useState<string[]>([]);

    // Nieuwe Parameter Form State
    const [paramNaam, setParamNaam] = useState('');
    const [paramType, setParamType] = useState<'fysisch' | 'chemisch' | 'biologisch'>('fysisch');
    const [paramDimensie, setParamDimensie] = useState('');

    // Observaties States
    const [observaties, setObservaties] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedKenmerkId, setSelectedKenmerkId] = useState<string>(initieleKenmerken[0]?.id || '');
    const [waarde, setWaarde] = useState('');
    const [notities, setNotities] = useState('');
    const [statusMessage, setStatusMessage] = useState('');

    // Parametergroep Beheer States
    const [isGroepBeheren, setIsGroepBeheren] = useState(false);
    const [beheerGroepId, setBeheerGroepId] = useState<string>(groepen[0]?.id || 'NIEUW');
    const [groepKenmerkIds, setGroepKenmerkIds] = useState<string[]>([]);
    const [groepNaam, setGroepNaam] = useState('');
    const [groepBeschrijving, setGroepBeschrijving] = useState('');

    useEffect(() => {
        if (!selectedLocatieId || selectedLocatieId === 'NIEUW') {
            setObservaties([]);
            return;
        }
        async function laadObservaties() {
            setLoading(true);
            const res = await getObservatiesVanLocatie(selectedLocatieId);
            if (res.success && res.data) setObservaties(res.data);
            setLoading(false);
        }
        laadObservaties();
    }, [selectedLocatieId]);

    useEffect(() => {
        if (!beheerGroepId || !isGroepBeheren) return;

        if (beheerGroepId === 'NIEUW') {
            setGroepNaam('');
            setGroepBeschrijving('');
            setGroepKenmerkIds([]);
            return;
        }

        // Bestaande groep opzoeken in de lijst die we al hebben
        const actieveGroep = groepen.find(g => g.id === beheerGroepId);
        if (actieveGroep) {
            setGroepNaam(actieveGroep.naam);
            setGroepBeschrijving(actieveGroep.beschrijving || '');
        }

        // Gekoppelde vinkjes ophalen
        async function laadGroepKenmerken() {
            const res = await getGekoppeldeKenmerkenVanGroep(beheerGroepId);
            if (res.success && res.data) {
                setGroepKenmerkIds(res.data);
            }
        }
        laadGroepKenmerken();
    }, [beheerGroepId, isGroepBeheren, groepen]);

    // Effect dat reageert zodra de te beheren locatie wijzigt
    useEffect(() => {
        if (!beheerLocatieId || !isLocatieBeheren) return;

        if (beheerLocatieId === 'NIEUW') {
            setLocatieNaam('');
            setLocatieBeschrijving('');
            setGekozenGroepIds([]);
            // Reset GPS velden in de DOM (omdat ze readOnly via ID worden aangestuurd)
            const latInput = document.getElementById('lat') as HTMLInputElement;
            const lonInput = document.getElementById('lon') as HTMLInputElement;
            if (latInput && lonInput) { latInput.value = ''; lonInput.value = ''; }
            return;
        }

        // Bestaande locatie opzoeken
        const actieveLocatie = locaties.find(l => l.id === beheerLocatieId);
        if (actieveLocatie) {
            setLocatieNaam(actieveLocatie.naam);
            setLocatieBeschrijving(actieveLocatie.beschrijving || '');

            // Vul GPS velden in als ze bestaan
            const latInput = document.getElementById('lat') as HTMLInputElement;
            const lonInput = document.getElementById('lon') as HTMLInputElement;
            if (latInput && lonInput) {
                latInput.value = actieveLocatie.latitude ? actieveLocatie.latitude.toString() : '';
                lonInput.value = actieveLocatie.longitude ? actieveLocatie.longitude.toString() : '';
            }

            // Groep ID's die momenteel gekoppeld zijn aan deze locatie inladen
            if (actieveLocatie.groepen) {
                setGekozenGroepIds(actieveLocatie.groepen.map(g => g.id));
            } else {
                setGekozenGroepIds([]);
            }
        }
    }, [beheerLocatieId, isLocatieBeheren, locaties]);

    // De gecombineerde Submit Handler voor Locatiebeheer
    async function handleLocatieBeherenSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!locatieNaam) return;

        const latVal = (document.getElementById('lat') as HTMLInputElement)?.value;
        const lonVal = (document.getElementById('lon') as HTMLInputElement)?.value;
        const latitude = latVal ? parseFloat(latVal) : undefined;
        const longitude = lonVal ? parseFloat(lonVal) : undefined;

        if (beheerLocatieId === 'NIEUW') {
            setStatusMessage('Nieuwe locatie aanmaken...');
            const res = await createLocatieMetGroepen(locatieNaam, locatieBeschrijving || null, latitude, longitude, gekozenGroepIds);
            if (res.success) {
                setStatusMessage('✅ Locatie succesvol aangemaakt!');
                setIsLocatieBeheren(false);
                window.location.reload();
            } else {
                setStatusMessage('❌ Fout bij aanmaken locatie.');
            }
        } else {
            setStatusMessage('Locatie bijwerken...');
            const res = await updateLocatieVolledig(beheerLocatieId, locatieNaam, locatieBeschrijving || null, latitude, longitude, gekozenGroepIds);
            if (res.success) {
                setStatusMessage('✅ Locatie succesvol bijgewerkt!');
                setIsLocatieBeheren(false);
                window.location.reload();
            } else {
                setStatusMessage('❌ Fout bij bijwerken locatie.');
            }
        }
    }

    // HIER IS DE SUBMIT HANDLER DIE NOG ONTBRAK:
    async function handleGroepBeheerSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!groepNaam) return;

        if (beheerGroepId === 'NIEUW') {
            setStatusMessage('Nieuwe groep aanmaken...');
            const res = await createGroepMetKenmerken(groepNaam, groepBeschrijving || undefined, groepKenmerkIds);
            if (res.success) {
                setStatusMessage('✅ Groep succesvol aangemaakt!');
                window.location.reload();
            } else {
                setStatusMessage('❌ Fout bij aanmaken.');
            }
        } else {
            setStatusMessage('Groep bijwerken...');
            const res = await updateGroepVolledig(beheerGroepId, groepNaam, groepBeschrijving || null, groepKenmerkIds);
            if (res.success) {
                setStatusMessage('✅ Groep succesvol bijgewerkt!');
                window.location.reload();
            } else {
                setStatusMessage('❌ Fout bij bijwerken.');
            }
        }
    }

    // // Actie: Locatie Opslaan
    // async function handleCreateLocatie(e: React.FormEvent) {
    //     e.preventDefault();
    //     if (!nieuweNaam) return;

    //     const latVal = (document.getElementById('lat') as HTMLInputElement)?.value;
    //     const lonVal = (document.getElementById('lon') as HTMLInputElement)?.value;
    //     const latitude = latVal ? parseFloat(latVal) : undefined;
    //     const longitude = lonVal ? parseFloat(lonVal) : undefined;

    //     const res = await createLocatie(nieuweNaam, nieuweBeschrijving || undefined, latitude, longitude, gekozenGroepIds);

    //     if (res.success) {
    //         setIsLocatieBeheren(false);
    //         setNieuweNaam('');
    //         setNieuweBeschrijving('');
    //         setGekozenGroepIds([]);
    //         window.location.reload();
    //     }
    // }

    // Actie: Parameter Opslaan
    async function handleCreateParameter(e: React.FormEvent) {
        e.preventDefault();
        if (!paramNaam) return;

        const res = await createKenmerk({
            naam: paramNaam,
            type: paramType,
            dimensie: paramDimensie || undefined
        });

        if (res.success && res.data) {
            const nieuwKenmerk = res.data as Kenmerk;
            setKenmerken(prev => [...prev, nieuwKenmerk]);
            setSelectedKenmerkId(nieuwKenmerk.id);
            setIsParameterToevoegen(false);
            setParamNaam('');
            setParamDimensie('');
            setStatusMessage('✅ Nieuwe parameter succesvol toegevoegd!');
        }
    }

    // Actie: Observatie Opslaan
    async function handleObservatieSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedLocatieId || !selectedKenmerkId || !waarde) return;

        setStatusMessage('Opslaan...');
        const res = await createObservatie({
            locatieId: selectedLocatieId,
            kenmerkId: selectedKenmerkId,
            waarde,
            notities: notities || undefined
        });

        if (res.success) {
            setStatusMessage('✅ Meting succesvol opgeslagen!');
            setWaarde('');
            setNotities('');
            const herladen = await getObservatiesVanLocatie(selectedLocatieId);
            if (herladen.success && herladen.data) setObservaties(herladen.data);
        }
    }

    const actieveLocatie = locaties.find(l => l.id === selectedLocatieId);
    const actiefKenmerk = kenmerken.find(k => k.id === selectedKenmerkId);

    return (
        <div className="grid md:grid-cols-2 gap-8">

            {/* Linkerkant: Formulieren en Kiezers */}
            <div className="space-y-6">

                {/* Locatiekiezer & Snelkoppelingen */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Locatie Selectie</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setIsLocatieBeheren(!isLocatieBeheren); setIsParameterToevoegen(false); setIsGroepBeheren(false); }}
                                className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md font-medium border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            >
                                {isLocatieBeheren ? 'Sluit' : '📍 Locatie Beheren'}
                            </button>
                            <button
                                onClick={() => { setIsParameterToevoegen(!isParameterToevoegen); setIsLocatieBeheren(false); setIsGroepBeheren(false); }}
                                className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-md font-medium border border-purple-200 hover:bg-purple-100 transition-colors"
                            >
                                {isParameterToevoegen ? 'Sluit' : '+ Parameter'}
                            </button>
                            <button
                                onClick={() => { setIsGroepBeheren(!isGroepBeheren); setIsLocatieBeheren(false); setIsParameterToevoegen(false); }}
                                className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md font-medium border border-amber-200 hover:bg-amber-100 transition-colors"
                            >
                                {isGroepBeheren ? 'Sluit' : '⚙️ Groep Beheren'}
                            </button>
                        </div>
                    </div>

                    {!isLocatieBeheren && !isParameterToevoegen && (
                        <select
                            value={selectedLocatieId}
                            onChange={(e) => setSelectedLocatieId(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-blue-500 text-slate-800"
                        >
                            {locaties.map(l => (
                                <option key={l.id} value={l.id}>{l.naam}</option>
                            ))}
                        </select>
                    )}

                    {actieveLocatie?.beschrijving && !isLocatieBeheren && !isParameterToevoegen && (
                        <p className="text-xs text-slate-500 italic">Info: {actieveLocatie.beschrijving}</p>
                    )}
                    {actieveLocatie?.groepen && actieveLocatie.groepen.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {actieveLocatie.groepen.map(g => (
                                <span key={g.id} className="inline-flex items-center text-[11px] bg-slate-100 text-slate-600 font-medium px-2 py-0.5 rounded-md border border-slate-200">
                                    🏷️ {g.naam}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* FORMULIER: Parameter Toevoegen */}
                {isParameterToevoegen && (
                    <form onSubmit={handleCreateParameter} className="bg-purple-50/50 p-6 rounded-xl border border-purple-200 space-y-4 animate-in fade-in duration-200">
                        <h2 className="text-base font-semibold text-purple-950">Nieuwe Parameter (Kenmerk) Toevoegen</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-purple-800 uppercase tracking-wider mb-1">Naam parameter *</label>
                                <input type="text" required value={paramNaam} onChange={(e) => setParamNaam(e.target.value)} placeholder="Bijv. Nitraat, Windsnelheid" className="w-full p-2.5 border border-purple-200 rounded-lg text-sm bg-white" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-purple-800 uppercase tracking-wider mb-1">Type</label>
                                <select value={paramType} onChange={(e) => setParamType(e.target.value as any)} className="w-full p-2.5 border border-purple-200 rounded-lg text-sm bg-white">
                                    <option value="fysisch">Fysisch (fysiek)</option>
                                    <option value="chemisch">Chemisch</option>
                                    <option value="biologisch">Biologisch (soorten)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-purple-800 uppercase tracking-wider mb-1">Eenheid / Dimensie</label>
                                <input type="text" value={paramDimensie} onChange={(e) => setParamDimensie(e.target.value)} placeholder="Bijv. mg/l, m/s, stuks" className="w-full p-2.5 border border-purple-200 rounded-lg text-sm bg-white" />
                            </div>
                        </div>
                        <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-xs">Parameter Opslaan</button>
                    </form>
                )}

                {/* FORMULIER: Parametergroep Beheer (Aanmaken & Muteren) */}
                {isGroepBeheren && (
                    <form onSubmit={handleGroepBeheerSubmit} className="bg-amber-50/40 p-6 rounded-xl border border-amber-300 space-y-4 animate-in fade-in duration-200">
                        <h2 className="text-base font-semibold text-amber-950">
                            {beheerGroepId === 'NIEUW' ? '✨ Nieuwe Parametergroep Aanmaken' : '⚙️ Parametergroep Details & Kenmerken Muteren'}
                        </h2>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 items-end">
                            <div className="sm:col-span-3">
                                <label className="block text-xs font-medium text-amber-800 uppercase tracking-wider mb-1">Selecteer Groep / Actie</label>
                                <select
                                    value={beheerGroepId}
                                    onChange={(e) => setBeheerGroepId(e.target.value)}
                                    className="w-full p-2.5 border border-amber-200 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-amber-500"
                                >
                                    <option value="NIEUW">✨ -- Nieuwe Groep Aanmaken --</option>
                                    {groepen.map(g => (
                                        <option key={g.id} value={g.id}>{g.naam}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="p-4 bg-white/60 rounded-lg border border-amber-200/60 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-amber-800 uppercase tracking-wider mb-1">Groepsnaam *</label>
                                <input
                                    type="text"
                                    required
                                    value={groepNaam}
                                    onChange={(e) => setGroepNaam(e.target.value)}
                                    placeholder="Bijv. Grondwatermetingen, Meterstanden"
                                    className="w-full p-2.5 border border-amber-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-amber-800 uppercase tracking-wider mb-1">Beschrijving</label>
                                <textarea
                                    value={groepBeschrijving}
                                    onChange={(e) => setGroepBeschrijving(e.target.value)}
                                    rows={2}
                                    placeholder="Waar is deze set metingen voor bedoeld?..."
                                    className="w-full p-2.5 border border-amber-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-amber-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-amber-800 uppercase tracking-wider mb-2">
                                Kenmerken in deze groep
                            </label>
                            <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-2 max-h-48 overflow-y-auto shadow-inner">
                                {kenmerken.map(k => (
                                    <label key={k.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-slate-900 select-none">
                                        <input
                                            type="checkbox"
                                            checked={groepKenmerkIds.includes(k.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setGroepKenmerkIds([...groepKenmerkIds, k.id]);
                                                } else {
                                                    setGroepKenmerkIds(groepKenmerkIds.filter(id => id !== k.id));
                                                }
                                            }}
                                            className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                                        />
                                        <span className="font-medium">{k.naam}</span>
                                        <span className="text-xs text-slate-400 italic">({k.type}{k.dimensie ? `, ${k.dimensie}` : ''})</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-amber-700 hover:bg-amber-800 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-xs">
                                {beheerGroepId === 'NIEUW' ? 'Groep Aanmaken & Koppelen' : 'Wijzigingen Opslaan'}
                            </button>
                            <button type="button" onClick={() => setIsGroepBeheren(false)} className="px-4 py-2 text-sm bg-white border rounded-lg text-slate-600">
                                Annuleren
                            </button>
                        </div>
                    </form>
                )}

                {/* FORMULIER: Locatie Beheer (Aanmaken & Muteren) */}
                {isLocatieBeheren && (
                    <form onSubmit={handleLocatieBeherenSubmit} className="bg-emerald-50/40 p-6 rounded-xl border border-emerald-300 space-y-4 animate-in fade-in duration-200">
                        <h2 className="text-base font-semibold text-emerald-950">
                            {beheerLocatieId === 'NIEUW' ? '✨ Nieuwe Locatie Aanmaken' : '⚙️ Locatienaam & Groepskoppelingen Muteren'}
                        </h2>

                        <div>
                            <label className="block text-xs font-medium text-emerald-800 uppercase tracking-wider mb-1">Selecteer Locatie / Actie</label>
                            <select
                                value={beheerLocatieId}
                                onChange={(e) => setBeheerLocatieId(e.target.value)}
                                className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                            >
                                <option value="NIEUW">✨ -- Nieuwe Locatie Aanmaken --</option>
                                {locaties.map(l => (
                                    <option key={l.id} value={l.id}>{l.naam}</option>
                                ))}
                            </select>
                        </div>

                        {/* ALTIJD ZICHTBARE GEGEVENS */}
                        <div className="p-4 bg-white/60 rounded-lg border border-emerald-200/60 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-emerald-800 uppercase tracking-wider mb-1">
                                    Naam locatie *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={locatieNaam}
                                    onChange={(e) => setLocatieNaam(e.target.value)}
                                    placeholder="Bijv. Meetstation Noord, Sloot A"
                                    className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-emerald-800 uppercase tracking-wider mb-1">Beschrijving</label>
                                <textarea
                                    value={locatieBeschrijving}
                                    onChange={(e) => setLocatieBeschrijving(e.target.value)}
                                    rows={2}
                                    placeholder="Details over bereikbaarheid, sleutels of referentieniveaus..."
                                    className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* CHECKBOXES VOOR PARAMETERGROEPEN */}
                        <div>
                            <label className="block text-xs font-medium text-emerald-800 uppercase tracking-wider mb-2">
                                Koppel aan Parametergroep(en) (Meerdere mogelijk)
                            </label>
                            <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-2 max-h-32 overflow-y-auto shadow-inner">
                                {groepen.map(g => (
                                    <label key={g.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-slate-900 select-none">
                                        <input
                                            type="checkbox"
                                            checked={gekozenGroepIds.includes(g.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setGekozenGroepIds([...gekozenGroepIds, g.id]);
                                                } else {
                                                    setGekozenGroepIds(gekozenGroepIds.filter(id => id !== g.id));
                                                }
                                            }}
                                            className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                        />
                                        <span className="font-medium">{g.naam}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* GPS COMPONENT */}
                        <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">GPS Coördinaten</span>
                                <button type="button" onClick={() => {
                                    navigator.geolocation.getCurrentPosition((pos) => {
                                        const latInput = document.getElementById('lat') as HTMLInputElement;
                                        const lonInput = document.getElementById('lon') as HTMLInputElement;
                                        if (latInput && lonInput) {
                                            latInput.value = pos.coords.latitude.toFixed(6);
                                            lonInput.value = pos.coords.longitude.toFixed(6);
                                        }
                                    });
                                }} className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs border border-blue-200">📍 Haal GPS op</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" id="lat" placeholder="Latitude" className="p-2 border border-slate-200 bg-slate-50 text-slate-500 rounded text-xs" readOnly />
                                <input type="text" id="lon" placeholder="Longitude" className="p-2 border border-slate-200 bg-slate-50 text-slate-500 rounded text-xs" readOnly />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                                {beheerLocatieId === 'NIEUW' ? 'Locatie Aanmaken' : 'Wijzigingen Opslaan'}
                            </button>
                            <button type="button" onClick={() => setIsLocatieBeheren(false)} className="px-4 py-2 text-sm bg-white border rounded-lg text-slate-600">
                                Annuleren
                            </button>
                        </div>
                    </form>
                )}
                {/* METING INVOEREN */}
                {!isLocatieBeheren && !isParameterToevoegen && selectedLocatieId && (
                    <form onSubmit={handleObservatieSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                        <h2 className="text-lg font-semibold text-slate-900">Meting Vastleggen</h2>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Wat meet je?</label>
                            <select value={selectedKenmerkId} onChange={(e) => setSelectedKenmerkId(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm">
                                {kenmerken.map(k => (
                                    <option key={k.id} value={k.id}>{k.naam} ({k.type})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Waarde {actiefKenmerk?.dimensie ? `(in ${actiefKenmerk.dimensie})` : ''}</label>
                            <input type="text" required value={waarde} onChange={(e) => setWaarde(e.target.value)} placeholder="Voer waarde in..." className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Notities</label>
                            <textarea value={notities} onChange={(e) => setNotities(e.target.value)} rows={2} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm" />
                        </div>
                        <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg text-sm shadow-xs">Meting Opslaan</button>
                        {statusMessage && <p className="text-xs text-center font-medium text-slate-600 mt-2">{statusMessage}</p>}
                    </form>
                )}
            </div>

            {/* Rechterkant: Geschiedenis */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
                <h2 className="text-lg font-semibold mb-4 text-slate-900">
                    Metingen voor <span className="text-blue-600">{actieveLocatie?.naam}</span>
                </h2>
                {loading ? <p className="text-sm text-slate-400 italic">Laden...</p> : observaties.length === 0 ? (
                    <p className="text-sm text-slate-400 italic bg-slate-50 p-4 text-center rounded-lg border border-dashed">Nee geen metingen gevonden.</p>
                ) : (
                    <div className="space-y-3">
                        {observaties.map((obs) => (
                            <div key={obs.id} className="border-l-4 border-blue-500 bg-slate-50 p-3 rounded-r-lg">
                                <div className="flex justify-between items-start">
                                    <span className="font-semibold text-slate-900 text-sm">{obs.kenmerkNaam}</span>
                                    <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-sm">{obs.waarde} {obs.dimensie}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}