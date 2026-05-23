import { getLocaties, seedStamData } from './actions';
import { db } from '../db';
import { kenmerken } from '../db/schema';
import ObservatieDashboard from './ObservatieDashboard';

export default async function Home() {
  // 1. Haal de locaties op via de actie
  const locatiesResult = await getLocaties();
  
  // Door 'as any[]' te gebruiken dwingen we TypeScript om te accepteren dat dit een geldige array is
  const locatiesLijst = (locatiesResult.success && locatiesResult.data) 
    ? locatiesResult.data 
    : [];

  // 2. Haal alle kenmerken (stamdata) rechtstreeks op uit de DB voor de dropdown
  const alleKenmerken = await db.select().from(kenmerken);

  // Server action voor de seed-knop
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
          
          {/* Compacte Seed Knop voor het geval dat */}
          <form action={handleSeed}>
            <button 
              type="submit" 
              className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 font-medium py-1.5 px-3 rounded-lg transition-colors text-xs"
            >
              Opnieuw Stamdata Seeden
            </button>
          </form>
        </div>

        {/* Het Interactieve Dashboard */}
        <ObservatieDashboard locaties={locatiesLijst} kenmerken={alleKenmerken} />

      </div>
    </main>
  );
}