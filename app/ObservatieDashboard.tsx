'use client';

import { useState, useEffect } from 'react';
import { createObservatie, getObservatiesVanLocatie, createLocatie } from './actions';

type Locatie = { 
  id: string; 
  naam: string; 
  beschrijving: string | null;
};

type Kenmerk = { 
  id: string; 
  naam: string; 
  dimensie: string | null; 
  type: 'fysisch' | 'chemisch' | 'biologisch';
};

export default function ObservatieDashboard({ 
  locaties: initieleLocaties = [], 
  kenmerken = [] 
}: { 
  locaties: Locatie[]; 
  kenmerken: Kenmerk[] 
}) {
  // We houden de locatielijst in de state zodat we er direct eentje aan kunnen toevoegen
  const [locaties, setLocaties] = useState<Locatie[]>(initieleLocaties);
  const [selectedLocatieId, setSelectedLocatieId] = useState<string>(initieleLocaties[0]?.id || '');
  const [isToevoegen, setIsToevoegen] = useState(false);
  
  // Nieuwe Locatie Form State
  const [nieuweNaam, setNieuweNaam] = useState('');
  const [nieuweBeschrijving, setNieuweBeschrijving] = useState('');

  // Observaties States
  const [observaties, setObservaties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Nieuwe Observatie Form State
  const [selectedKenmerkId, setSelectedKenmerkId] = useState<string>(kenmerken[0]?.id || '');
  const [waarde, setWaarde] = useState('');
  const [notities, setNotities] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Update geselecteerde locatie als de initiele lijst verandert (bijv. na een server refresh)
  useEffect(() => {
    setLocaties(initieleLocaties);
    if (initieleLocaties && initieleLocaties.length > 0 && !selectedLocatieId) {
      setSelectedLocatieId(initieleLocaties[0].id);
    }
  }, [initieleLocaties]);

  // Haal observaties op voor geselecteerde locatie
  useEffect(() => {
    if (!selectedLocatieId || selectedLocatieId === 'NIEUW') {
      setObservaties([]);
      return;
    }
    
    async function laadObservaties() {
      setLoading(true);
      const res = await getObservatiesVanLocatie(selectedLocatieId);
      if (res.success && res.data) {
        setObservaties(res.data);
      }
      setLoading(false);
    }
    
    laadObservaties();
  }, [selectedLocatieId]);

  // Handhaaf de wissel naar "Locatie toevoegen"
  const handleLocatieWissel = (id: string) => {
    if (id === 'NIEUW') {
      setIsToevoegen(true);
      setSelectedLocatieId('NIEUW');
    } else {
      setIsToevoegen(false);
      setSelectedLocatieId(id);
    }
  };

  // Actie: Nieuwe locatie opslaan
  async function handleCreateLocatie(e: React.FormEvent) {
    e.preventDefault();
    if (!nieuweNaam) return;

    const res = await createLocatie(nieuweNaam, nieuweBeschrijving || undefined);
    
    if (res.success && res.data) {
      const aangemaakteLocatie = res.data as Locatie;
      // 1. Voeg direct toe aan de lokale lijst
      setLocaties(prev => [...prev, aangemaakteLocatie]);
      // 2. Selecteer direct de nieuwe locatie
      setSelectedLocatieId(aangemaakteLocatie.id);
      // 3. Sluit het toevoeg-venster
      setIsToevoegen(false);
      setNieuweNaam('');
      setNieuweBeschrijving('');
    }
  }

  // Actie: Nieuw kenmerk opslaan
  async function handleObservatieSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLocatieId || selectedLocatieId === 'NIEUW' || !selectedKenmerkId || !waarde) return;

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
    } else {
      setStatusMessage('❌ Fout bij opslaan.');
    }
  }

  const actieveLocatie = locaties.find(l => l.id === selectedLocatieId);
  const actiefKenmerk = kenmerken.find(k => k.id === selectedKenmerkId);

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Linkerkant: Selectie & Formulieren */}
      <div className="space-y-6">
        
        {/* Locatiekiezer */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">1. Kies of maak een Locatie</h2>
          <select 
            value={selectedLocatieId} 
            onChange={(e) => handleLocatieWissel(e.target.value)}
            className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-blue-500 text-slate-800"
          >
            <optgroup label="Bestaande locaties">
              {locaties.map(l => (
                <option key={l.id} value={l.id}>{l.naam}</option>
              ))}
            </optgroup>
            <optgroup label="Beheer">
              <option value="NIEUW" className="text-blue-600 font-semibold">+ Nieuwe locatie toevoegen...</option>
            </optgroup>
          </select>
          
          {actieveLocatie?.beschrijving && !isToevoegen && (
            <p className="text-xs text-slate-500 mt-2 italic">{actieveLocatie.beschrijving}</p>
          )}
        </div>

        {/* Dynamisch formulier: Locatie Toevoegen */}
        {/* Dynamisch formulier: Locatie Toevoegen met GPS */}
{isToevoegen && (
  <form onSubmit={handleCreateLocatie} className="bg-amber-50/50 p-6 rounded-xl border border-amber-200 shadow-xs space-y-4 animate-in fade-in duration-200">
    <h2 className="text-base font-semibold text-amber-900">Nieuwe Locatie Aanmaken</h2>
    
    <div>
      <label className="block text-xs font-medium text-amber-800 uppercase tracking-wider mb-1">Locatienaam *</label>
      <input 
        type="text" 
        required
        value={nieuweNaam}
        onChange={(e) => setNieuweNaam(e.target.value)}
        placeholder="Bijv. Meetpunt Beek Zuid"
        className="w-full p-2.5 border border-amber-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-amber-500"
      />
    </div>

    <div>
      <label className="block text-xs font-medium text-amber-800 uppercase tracking-wider mb-1">Beschrijving</label>
      <textarea 
        value={nieuweBeschrijving}
        onChange={(e) => setNieuweBeschrijving(e.target.value)}
        rows={2}
        placeholder="Details over deze nieuwe plek..."
        className="w-full p-2.5 border border-amber-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-amber-500"
      />
    </div>

    {/* GPS Sectie */}
    <div className="bg-white p-3 rounded-lg border border-amber-200 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">GPS Coördinaten</span>
        <button
          type="button"
          onClick={() => {
            if (!navigator.geolocation) {
              alert("Geolocatie wordt niet ondersteund door deze browser.");
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (position) => {
                // Sla de coördinaten op in verborgen of zichtbare invoervelden
                const latInput = document.getElementById('lat') as HTMLInputElement;
                const lonInput = document.getElementById('lon') as HTMLInputElement;
                if (latInput && lonInput) {
                  latInput.value = position.coords.latitude.toFixed(6);
                  lonInput.value = position.coords.longitude.toFixed(6);
                }
              },
              (error) => {
                alert(`Fout bij ophalen GPS: ${error.message}`);
              },
              { enableHighAccuracy: true, timeout: 10000 }
            );
          }}
          className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium py-1 px-2 rounded text-xs transition-colors border border-blue-200 flex items-center gap-1"
        >
          📍 Haal GPS op
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input 
          type="text" 
          id="lat" 
          name="latitude" 
          placeholder="Latitude (Breedtegraad)" 
          className="p-2 border border-slate-200 bg-slate-50 text-slate-500 rounded text-xs"
          readOnly
        />
        <input 
          type="text" 
          id="lon" 
          name="longitude" 
          placeholder="Longitude (Lengtegraad)" 
          className="p-2 border border-slate-200 bg-slate-50 text-slate-500 rounded text-xs"
          readOnly
        />
      </div>
    </div>

    <div className="flex gap-2">
      <button 
        type="submit"
        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
      >
        Locatie Opslaan
      </button>
      <button 
        type="button"
        onClick={() => handleLocatieWissel(locaties[0]?.id || '')}
        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg"
      >
        Annuleren
      </button>
    </div>
  </form>
)}

        {/* Formulier: Observatie Vastleggen */}
        {selectedLocatieId && !isToevoegen && (
          <form onSubmit={handleObservatieSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">2. Nieuwe Observatie Vastleggen</h2>
            
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Wat meet je?</label>
              <select 
                value={selectedKenmerkId} 
                onChange={(e) => setSelectedKenmerkId(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500"
              >
                {kenmerken.map(k => (
                  <option key={k.id} value={k.id}>{k.naam} ({k.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                Waarde {actiefKenmerk?.dimensie ? `(in ${actiefKenmerk.dimensie})` : ''}
              </label>
              <input 
                type="text" 
                required
                value={waarde}
                onChange={(e) => setWaarde(e.target.value)}
                placeholder="Voer de meting in..."
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Notities / Opmerkingen</label>
              <textarea 
                value={notities}
                onChange={(e) => setNotities(e.target.value)}
                rows={2}
                placeholder="Bijzonderheden..."
                className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors shadow-xs"
            >
              Meting Opslaan
            </button>

            {statusMessage && (
              <p className="text-xs text-center font-medium text-slate-600 mt-2">{statusMessage}</p>
            )}
          </form>
        )}
      </div>

      {/* Rechterkant: Observaties Historie */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-semibold mb-4 text-slate-900">
          {isToevoegen ? (
            <span className="text-slate-400 italic">Nieuwe locatie configureren...</span>
          ) : (
            <>Metingen Historie voor <span className="text-blue-600">{actieveLocatie?.naam}</span></>
          )}
        </h2>

        {isToevoegen ? (
          <p className="text-sm text-slate-400 italic bg-slate-50 p-4 text-center rounded-lg border border-dashed">
            Sla eerst de nieuwe locatie op om metingen te kunnen bekijken of toe te voegen.
          </p>
        ) : loading ? (
          <p className="text-sm text-slate-400 italic">Metingen ophalen...</p>
        ) : observaties.length === 0 ? (
          <p className="text-sm text-slate-400 italic bg-slate-50 p-4 text-center rounded-lg border border-dashed">
            Er zijn nog geen observaties voor deze locatie ingevoerd.
          </p>
        ) : (
          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
            {observaties.map((obs) => (
              <div key={obs.id} className="border-l-4 border-blue-500 bg-slate-50 p-3 rounded-r-lg space-y-1">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-900 text-sm">{obs.kenmerkNaam}</span>
                  <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-sm">
                    {obs.waarde} {obs.dimensie}
                  </span>
                </div>
                {obs.notities && (
                  <p className="text-xs text-slate-600 bg-white p-1.5 rounded border border-slate-100">{obs.notities}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}