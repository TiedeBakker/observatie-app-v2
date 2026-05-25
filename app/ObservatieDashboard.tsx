'use client';

import { useState, useEffect } from 'react';
import { createObservatie, getObservatiesVanLocatie, createKenmerk } from './actions';
import { updateGroepVolledig, getGekoppeldeKenmerkenVanGroep, createGroepMetKenmerken, getKenmerkenVanGroep } from './actions';
import { createLocatieMetGroepen, updateLocatieVolledig, createBatchObservaties, BatchObservatieInput } from './actions';

type Locatie = {
    id: string;
    naam: string;
    beschrijving: string | null;
    latitude?: number | null;
    longitude?: number | null;
    groepen?: { id: string; naam: string; }[];
};
type Kenmerk = { id: string; naam: string; dimensie: string | null; type: 'fysisch' | 'chemisch' | 'biologisch'; };
type Groep = {
    id: string;
    naam: string;
    beschrijving: string | null;
    groepKenmerken?: { volgorde: number; kenmerk: Kenmerk }[];
};

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
    const [isLocatieBeheren, setIsLocatieBeheren] = useState(false);
    const [beheerLocatieId, setBeheerLocatieId] = useState('NIEUW');
    const [locatieNaam, setLocatieNaam] = useState('');
    const [locatieBeschrijving, setLocatieBeschrijving] = useState('');
    const [isParameterToevoegen, setIsParameterToevoegen] = useState(false);

    // Veilige React states voor GPS (i.p.v. document.getElementById)
    const [locatieLat, setLocatieLat] = useState('');
    const [locatieLon, setLocatieLon] = useState('');
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

    // Tijd-instellingen
    const [gebruikActueleTijd, setGebruikActueleTijd] = useState(true);
    const [handmatigTijdstip, setHandmatigTijdstip] = useState('');

    // Batch invoer-state: Key is het kenmerkId
    const [batchInvoer, setBatchInvoer] = useState<Record<string, { waarde: string; notities: string }>>({});
    const [openNotities, setOpenNotities] = useState<Record<string, boolean>>({});
    const [selectedGroepId, setSelectedGroepId] = useState<string>('');
    const [actieveFormulierKenmerken, setActieveFormulierKenmerken] = useState<any[]>([]);
    
    // Modus voor invoer: true = individueel per parameter, false = batch (alles in één keer)
    const [individueleInvoer, setIndividueleInvoer] = useState<boolean>(false);

    // 1. Laad observaties geschiedenis in bij locatiewijziging
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

    // 2. Beheer Groepen vinkjes en gegevens inladen
    useEffect(() => {
        if (!beheerGroepId || !isGroepBeheren) return;

        if (beheerGroepId === 'NIEUW') {
            setGroepNaam('');
            setGroepBeschrijving('');
            setGroepKenmerkIds([]);
            return;
        }

        const actieveGroep = groepen.find(g => g.id === beheerGroepId);
        if (actieveGroep) {
            setGroepNaam(actieveGroep.naam);
            setGroepBeschrijving(actieveGroep.beschrijving || '');
        }

        async function laadGroepKenmerken() {
            const res = await getGekoppeldeKenmerkenVanGroep(beheerGroepId);
            if (res.success && res.data) {
                setGroepKenmerkIds(res.data);
            }
        }
        laadGroepKenmerken();
    }, [beheerGroepId, isGroepBeheren, groepen]);

    // 3. Beheer Locatie formulier synchroniseren via zuivere states
    useEffect(() => {
        if (!beheerLocatieId || !isLocatieBeheren) return;

        if (beheerLocatieId === 'NIEUW') {
            setLocatieNaam('');
            setLocatieBeschrijving('');
            setLocatieLat('');
            setLocatieLon('');
            setGekozenGroepIds([]);
            return;
        }

        const actieveLocatie = locaties.find(l => l.id === beheerLocatieId);
        if (actieveLocatie) {
            setLocatieNaam(actieveLocatie.naam);
            setLocatieBeschrijving(actieveLocatie.beschrijving || '');
            setLocatieLat(actieveLocatie.latitude ? actieveLocatie.latitude.toString() : '');
            setLocatieLon(actieveLocatie.longitude ? actieveLocatie.longitude.toString() : '');

            if (actieveLocatie.groepen) {
                setGekozenGroepIds(actieveLocatie.groepen.map(g => g.id));
            } else {
                setGekozenGroepIds([]);
            }
        }
    }, [beheerLocatieId, isLocatieBeheren, locaties]);

    // 4. ESSENTIEEL: Update de actieve groep Id zodra de geselecteerde dashboard-locatie wijzigt
    useEffect(() => {
        const actieveLocatie = locaties.find(l => l.id === selectedLocatieId);
        if (actieveLocatie && actieveLocatie.groepen && actieveLocatie.groepen.length > 0) {
            setSelectedGroepId(actieveLocatie.groepen[0].id);
        } else {
            setSelectedGroepId('');
        }
    }, [selectedLocatieId, locaties]);

    // 5. Laad kenmerken in die horen bij de actieve groep
    useEffect(() => {
        async function laadGroepKenmerken() {
            if (!selectedGroepId) {
                setActieveFormulierKenmerken([]);
                return;
            }
            const res = await getKenmerkenVanGroep(selectedGroepId);
            if (res.success && res.data) {
                setActieveFormulierKenmerken(res.data);
            }
        }
        laadGroepKenmerken();
    }, [selectedGroepId]);

    // Submit handler voor Locatiebeheer met e.preventDefault() en veilige TS error check
    async function handleLocatieBeherenSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!locatieNaam || locatieNaam.trim() === '') return;

        const latitude = locatieLat ? parseFloat(locatieLat) : undefined;
        const longitude = locatieLon ? parseFloat(locatieLon) : undefined;

        if (beheerLocatieId === 'NIEUW') {
            setStatusMessage('Nieuwe locatie aanmaken...');
            const res = await createLocatieMetGroepen(locatieNaam, locatieBeschrijving || null, latitude, longitude, gekozenGroepIds);
            if (res.success) {
                setStatusMessage('✅ Locatie succesvol aangemaakt!');
                setIsLocatieBeheren(false);
                window.location.reload();
            } else {
                setStatusMessage('❌ Fout bij aanmaken locatie.');
                const errorMsg = ('error' in res) ? res.error : 'Onbekende fout';
                alert('Fout bij opslaan: ' + errorMsg);
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
                const errorMsg = ('error' in res) ? res.error : 'Onbekende fout';
                alert('Fout bij updaten: ' + errorMsg);
            }
        }
    }

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

    async function handleBatchSubmit(e: React.FormEvent) {
        e.preventDefault();
        const waarnemingen: BatchObservatieInput[] = [];

        Object.entries(batchInvoer).forEach(([kId, data]) => {
            if (data.waarde.trim() !== '') {
                waarnemingen.push({
                    kenmerkId: kId,
                    waarde: data.waarde,
                    notities: data.notities.trim() !== '' ? data.notities : null
                });
            }
        });

        if (waarnemingen.length === 0) {
            alert('Vul minimaal één waarde in.');
            return;
        }

        const tijdstip = gebruikActueleTijd
            ? new Date().toISOString()
            : new Date(handmatigTijdstip).toISOString();

        setStatusMessage('Waarnemingen opslaan...');
        const res = await createBatchObservaties(selectedLocatieId, tijdstip, waarnemingen);

        if (res.success) {
            setStatusMessage(`✅ ${waarnemingen.length} waarneming(en) succesvol vastgelegd!`);
            setBatchInvoer({}); 
            setOpenNotities({});
            window.location.reload();
        } else {
            setStatusMessage('❌ Fout bij opslaan van waarnemingen.');
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

                {/* FORMULIER: Parametergroep Beheer */}
                {isGroepBeheren && (
                    <form onSubmit={handleGroepBeheerSubmit} className="bg-amber-50/40 p-6 rounded-xl border border-amber-300 space-y-4 animate-in fade-in duration-200">
                        <h2 className="text-base font-semibold text-amber-950">
                            {beheerGroepId === 'NIEUW' ? '✨ Nieuwe Parametergroep Aanmaken' : '⚙️ Parametergroep Details & Kenmerken Muteren'}
                        </h2>
                        <div>
                            <select
                                value={beheerGroepId}
                                onChange={(e) => setBeheerGroepId(e.target.value)}
                                className="w-full p-2.5 border border-amber-200 rounded-lg bg-white text-sm font-medium"
                            >
                                <option value="NIEUW">✨ -- Nieuwe Groep Aanmaken --</option>
                                {groepen.map(g => (
                                    <option key={g.id} value={g.id}>{g.naam}</option>
                                ))}
                            </select>
                        </div>
                        <div className="p-4 bg-white/60 rounded-lg border border-amber-200/60 space-y-3">
                            <input
                                type="text"
                                required
                                value={groepNaam}
                                onChange={(e) => setGroepNaam(e.target.value)}
                                placeholder="Groepsnaam *"
                                className="w-full p-2.5 border border-amber-200 rounded-lg bg-white text-sm"
                            />
                            <textarea
                                value={groepBeschrijving}
                                onChange={(e) => setGroepBeschrijving(e.target.value)}
                                rows={2}
                                placeholder="Beschrijving..."
                                className="w-full p-2.5 border border-amber-200 rounded-lg bg-white text-sm"
                            />
                        </div>
                        <div>
                            <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-2 max-h-48 overflow-y-auto">
                                {kenmerken.map(k => (
                                    <label key={k.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={groepKenmerkIds.includes(k.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setGroepKenmerkIds([...groepKenmerkIds, k.id]);
                                                else setGroepKenmerkIds(groepKenmerkIds.filter(id => id !== k.id));
                                            }}
                                            className="rounded border-amber-300 text-amber-600 w-4 h-4"
                                        />
                                        <span>{k.naam} <span className="text-xs text-slate-400 italic">({k.dimensie || 'geen eenheid'})</span></span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-amber-700 text-white font-medium py-2 rounded-lg text-sm">Groep Opslaan</button>
                        </div>
                    </form>
                )}

                {/* FORMULIER: Locatie Beheer */}
                {isLocatieBeheren && (
                    <form onSubmit={handleLocatieBeherenSubmit} className="bg-emerald-50/40 p-6 rounded-xl border border-emerald-300 space-y-4 animate-in fade-in duration-200">
                        <h2 className="text-base font-semibold text-emerald-950">
                            {beheerLocatieId === 'NIEUW' ? '✨ Nieuwe Locatie Aanmaken' : '⚙️ Locatienaam & Groepskoppelingen Muteren'}
                        </h2>
                        <div>
                            <select
                                value={beheerLocatieId}
                                onChange={(e) => setBeheerLocatieId(e.target.value)}
                                className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-sm font-medium"
                            >
                                <option value="NIEUW">✨ -- Nieuwe Locatie Aanmaken --</option>
                                {locaties.map(l => (
                                    <option key={l.id} value={l.id}>{l.naam}</option>
                                ))}
                            </select>
                        </div>
                        <div className="p-4 bg-white/60 rounded-lg border border-emerald-200/60 space-y-3">
                            <input
                                type="text"
                                required
                                value={locatieNaam}
                                onChange={(e) => setLocatieNaam(e.target.value)}
                                placeholder="Naam locatie *"
                                className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-sm"
                            />
                            <textarea
                                value={locatieBeschrijving}
                                onChange={(e) => setLocatieBeschrijving(e.target.value)}
                                rows={2}
                                placeholder="Beschrijving..."
                                className="w-full p-2.5 border border-emerald-200 rounded-lg bg-white text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-emerald-800 uppercase tracking-wider mb-2">Koppel aan Parametergroep(en)</label>
                            <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-2 max-h-32 overflow-y-auto">
                                {groepen.map(g => (
                                    <label key={g.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={gekozenGroepIds.includes(g.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) setGekozenGroepIds([...gekozenGroepIds, g.id]);
                                                else setGekozenGroepIds(gekozenGroepIds.filter(id => id !== g.id));
                                            }}
                                            className="rounded border-emerald-300 text-emerald-600 w-4 h-4"
                                        />
                                        <span>{g.naam}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">GPS Coördinaten</span>
                                <button type="button" onClick={() => {
                                    navigator.geolocation.getCurrentPosition((pos) => {
                                        setLocatieLat(pos.coords.latitude.toFixed(6));
                                        setLocatieLon(pos.coords.longitude.toFixed(6));
                                    });
                                }} className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs border border-blue-200">📍 Haal GPS op</button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="text" placeholder="Latitude" value={locatieLat} onChange={(e) => setLocatieLat(e.target.value)} className="p-2 border border-slate-200 bg-white rounded text-xs text-slate-800" />
                                <input type="text" placeholder="Longitude" value={locatieLon} onChange={(e) => setLocatieLon(e.target.value)} className="p-2 border border-slate-200 bg-white rounded text-xs text-slate-800" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" className="flex-1 bg-emerald-700 text-white font-medium py-2 rounded-lg text-sm">Wijzigingen Opslaan</button>
                        </div>
                    </form>
                )}

                {/* SCHAKELAAR VOOR INVOERMODUS */}
                {!isLocatieBeheren && !isParameterToevoegen && !isGroepBeheren && selectedLocatieId && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Invoermethode</h3>
                            <p className="text-xs text-slate-500">Kies hoe je metingen wilt invoeren op deze locatie.</p>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                                type="button"
                                onClick={() => setIndividueleInvoer(false)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!individueleInvoer 
                                    ? 'bg-white text-blue-600 shadow-xs' 
                                    : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                🚀 Turbo Batch-invoer
                            </button>
                            <button
                                type="button"
                                onClick={() => setIndividueleInvoer(true)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${individueleInvoer 
                                    ? 'bg-white text-emerald-600 shadow-xs' 
                                    : 'text-slate-600 hover:text-slate-900'}`}
                            >
                                📝 Enkele meting
                            </button>
                        </div>
                    </div>
                )}

                {/* METING INVOEREN (ENKEL) */}
                {!isLocatieBeheren && !isParameterToevoegen && !isGroepBeheren && selectedLocatieId && individueleInvoer && (
                    <form onSubmit={handleObservatieSubmit} className="bg-white p-6 rounded-xl border border-emerald-200 shadow-xs space-y-4">
                        <h2 className="text-lg font-semibold text-slate-900">Meting Vastleggen</h2>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Wat meet je?</label>
                            <select value={selectedKenmerkId} onChange={(e) => setSelectedKenmerkId(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm">
                                {kenmerken.map(k => (
                                    <option key={k.id} value={k.id}>{k.naam} {k.dimensie ? `(${k.dimensie})` : ''}</option>
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

                {/* ULTRA-SNELLE BATCH INVOER */}
                {!isLocatieBeheren && !isParameterToevoegen && !isGroepBeheren && !individueleInvoer && selectedLocatieId && (
                    <form onSubmit={handleBatchSubmit} className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm space-y-6">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">Tijdstip van waarneming</h3>
                                <p className="text-xs text-slate-500">Huidige tijd tenzij handmatige historische invoer is gewenst.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={gebruikActueleTijd}
                                        onChange={(e) => setGebruikActueleTijd(e.target.checked)}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    Actuele tijd gebruiken
                                </label>
                                {!gebruikActueleTijd && (
                                    <input
                                        type="datetime-local"
                                        required
                                        value={handmatigTijdstip}
                                        onChange={(e) => setHandmatigTijdstip(e.target.value)}
                                        className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            {actieveFormulierKenmerken.length === 0 ? (
                                <p className="text-xs text-amber-600 italic bg-amber-50 p-4 text-center rounded-lg border border-dashed border-amber-300">
                                    ⚠️ Deze locatie is nog niet gekoppeld aan een parametergroep, of de groep bevat geen parameters. Koppel een groep via '📍 Locatie Beheren' of kies hierboven '📝 Enkele meting'.
                                </p>
                            ) : (
                                <>
                                    <div className="grid grid-cols-12 gap-2 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        <div className="col-span-6">Kenmerk (Parameter / Soort)</div>
                                        <div className="col-span-4 text-right">Invoer waarde</div>
                                        <div className="col-span-2 text-center">Notitie</div>
                                    </div>

                                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white">
                                        {actieveFormulierKenmerken.map((kenmerk) => {
                                            const data = batchInvoer[kenmerk.id] || { waarde: '', notities: '' };
                                            const heeftNotitie = openNotities[kenmerk.id];

                                            return (
                                                <div key={kenmerk.id} className="p-3 hover:bg-slate-50/50 transition-colors space-y-2">
                                                    <div className="grid grid-cols-12 gap-2 items-center">
                                                        <div className="col-span-6">
                                                            <span className="font-medium text-sm text-slate-800">{kenmerk.naam}</span>
                                                            {kenmerk.dimensie && (
                                                                <span className="ml-1.5 text-xs font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                                    {kenmerk.dimensie}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="col-span-4 text-right">
                                                            <input
                                                                type="text"
                                                                value={data.waarde}
                                                                placeholder="--"
                                                                onChange={(e) => setBatchInvoer({
                                                                    ...batchInvoer,
                                                                    [kenmerk.id]: { ...data, waarde: e.target.value }
                                                                })}
                                                                className="w-full max-w-[140px] inline-block p-2 text-right border border-slate-200 rounded-md text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                        <div className="col-span-2 text-center">
                                                            <button
                                                                type="button"
                                                                onClick={() => setOpenNotities({ ...openNotities, [kenmerk.id]: !heeftNotitie })}
                                                                className={`p-1.5 rounded-md border text-xs transition-colors ${data.notities ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-400 border-slate-200'}`}
                                                            >
                                                                💬
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {heeftNotitie && (
                                                        <input
                                                            type="text"
                                                            value={data.notities}
                                                            placeholder="Bijzonderheden..."
                                                            onChange={(e) => setBatchInvoer({
                                                                ...batchInvoer,
                                                                [kenmerk.id]: { ...data, notities: e.target.value }
                                                            })}
                                                            className="w-full p-2 border border-amber-200 bg-amber-50/30 rounded-md text-xs"
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="pt-2 flex items-center justify-between">
                                        <span className="text-xs text-slate-500">
                                            {Object.values(batchInvoer).filter(v => v.waarde !== '').length} van de {actieveFormulierKenmerken.length} ingevuld.
                                        </span>
                                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors shadow-sm">
                                            🚀 Opslaan & Committen
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
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