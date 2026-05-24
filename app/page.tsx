import { getLocatiesWithGroepen, seedStamData, getKenmerkGroepen } from './actions';
import { db } from '../db';
import { kenmerken } from '../db/schema';
import ObservatieDashboard from './ObservatieDashboard';

export default async function Home() {
  const locatiesResult = await getLocatiesWithGroepen();
  const locatiesLijst = locatiesResult.success ? locatiesResult.data : [];

  const groepenResult = await getKenmerkGroepen();
  const groepenLijst = groepenResult.success ? groepenResult.data : [];

  const alleKenmerken = await db.select().from(kenmerken);

  async function handleSeed() {
    'use server';
    await seedStamData();
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Observatie Dashboard v2</h1>
            <p className="text-sm text-slate-500 mt-1">PoC Relational Schema & Next.js Server Actions</p>
          </div>
          
          <form action={handleSeed}>
            <button 
              type="submit" 
              className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs"
            >
              Opnieuw Stamdata Seeden
            </button>
          </form>
        </div>

        {/* We geven nu ook groepen mee */}
        <ObservatieDashboard 
          locaties={locatiesLijst as any} 
          kenmerken={alleKenmerken as any} 
          groepen={groepenLijst as any}
        />

      </div>
    </main>
  );
}