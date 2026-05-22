import { createLocatie, getLocaties } from './actions';

export default async function Home() {
  // 1. Haal direct de bestaande locaties op vanaf de server
  const result = await getLocaties();
  const locatiesLijst = result.success ? result.data : [];

  // 2. Dit is de server-actie die wordt afgehandeld als het formulier wordt verstuurd
  async function handleForm(formData: FormData) {
    'use server';
    
    const naam = formData.get('naam') as string;
    const beschrijving = formData.get('beschrijving') as string;
    
    if (!naam) return;

    await createLocatie(naam, beschrijving || undefined);
    
    // Hiermee verversen we de pagina zodat de nieuwe locatie direct in de lijst verschijnt
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/');
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8 text-slate-800">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Koptekst */}
        <div className="border-b pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Observatie App v2</h1>
          <p className="text-sm text-slate-500 mt-1">PoC Database & Server Actions Test</p>
        </div>

        {/* Formulier om locatie toe te voegen */}
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-slate-900">Nieuwe Locatie Toevoegen</h2>
          
          <form action={handleForm} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                Locatienaam *
              </label>
              <input
                type="text"
                name="naam"
                required
                placeholder="Bijv. Bosperceel X, Woning 1"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                Beschrijving
              </label>
              <textarea
                name="beschrijving"
                rows={3}
                placeholder="Optionele details over de locatie..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm shadow-sm"
            >
              Locatie Opslaan in Turso
            </button>
          </form>
        </section>

        {/* Lijst met bestaande locaties */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Geregistreerde Locaties ({locatiesLijst?.length || 0})</h2>
          
          {locatiesLijst && locatiesLijst.length === 0 ? (
            <p className="text-sm text-slate-400 italic bg-white p-4 text-center rounded-xl border border-dashed">
              Nog geen locaties aanwezig. Voeg er hierboven een toe!
            </p>
          ) : (
            <div className="grid gap-3">
              {locatiesLijst?.map((locatie) => (
                <div 
                  key={locatie.id} 
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <h3 className="font-medium text-slate-900 text-sm">{locatie.naam}</h3>
                    {locatie.beschrijving && (
                      <p className="text-xs text-slate-500 mt-0.5">{locatie.beschrijving}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md block sm:inline-block">
                      {locatie.id.substring(0, 8)}...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}