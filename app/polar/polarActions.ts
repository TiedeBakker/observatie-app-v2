'use server';

import { db } from '../../db';
import { polarConfig, sportSessies, sportSessieMetingen } from '../../db/schema';
import { eq } from 'drizzle-orm';

async function getPolarCredentials() {
    const configs = await db.select().from(polarConfig).limit(1);
    return configs.length > 0 ? configs[0] : null;
}

export async function synchroniseerPolarTrainingen() {
    console.log('--- START POLAR RELATIONELE SYNCHRONISATIE ---');
    const creds = await getPolarCredentials();
    if (!creds) return { success: false, error: 'Geen actieve Polar koppeling gevonden.' };

    try {
        // 0. Zorg ervoor dat deze user geregistreerd is bij Polar
        console.log('Polar user registratie checken...');
        const regRes = await fetch('https://www.polaraccesslink.com/v3/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${creds.accessToken}`
            },
            body: JSON.stringify({ 'member-id': creds.polarUserId })
        });
        
        if (regRes.status !== 200 && regRes.status !== 201 && regRes.status !== 409) {
            return { success: false, error: `Registratie geweigerd door Polar: ${regRes.status}` };
        }

        // 1. Start een nieuwe transactie bij Polar
        console.log('Wachtrij controleren bij Polar...');
        const transRes = await fetch(`https://www.polaraccesslink.com/v3/users/${creds.polarUserId}/exercise-transactions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${creds.accessToken}`, 'Accept': 'application/json' }
        });

        // We gaan een lijst van "training-taken" opbouwen die we uniform kunnen verwerken
        let trainingenLijst: any[] = [];
        let transactieId: string | null = null;
        let viaWachtrij = true;

        if (transRes.status === 204) {
            console.log('Polar cloud meldt een lege wachtrij. We proberen de directe fallback...');
            viaWachtrij = false;
        } else if (!transRes.ok) {
            console.error(`Transactiefout (${transRes.status}), we proberen de directe fallback...`);
            viaWachtrij = false;
        } else {
            const transactieData = await transRes.json();
            transactieId = transactieData['transaction-id'];
            const oefeningUrls = transactieData['exercises'] || [];
            console.log(`Transactie ${transactieId} geopend. ${oefeningUrls.length} trainingen in wachtrij.`);
            
            // Voor de wachtrij moeten we de details straks nog wel los ophalen via de URL
            trainingenLijst = oefeningUrls.map((url: string) => ({ url, moetFetchDetails: true }));
        }

        // FALLBACK: Als de wachtrij leeg is, probeer direct de exercises op te vragen
        if (!viaWachtrij || trainingenLijst.length === 0) {
            console.log('Direct ophalen van recente exercises (fallback)...');
            const fallbackRes = await fetch('https://www.polaraccesslink.com/v3/exercises', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${creds.accessToken}`, 'Accept': 'application/json' }
            });
            
            if (fallbackRes.ok && fallbackRes.status !== 204) {
                const directeLijst = await fallbackRes.json();
                console.log(`Fallback succesvol! ${directeLijst.length} trainingen direct gevonden via API.`);
                
                // Bij de fallback hebben we de data AL DIRECT. We hoeven geen losse detail fetch te doen!
                trainingenLijst = directeLijst.map((ex: any) => ({
                    ...ex,
                    moetFetchDetails: false,
                    // Sla de ID op die we nodig hebben
                    idString: String(ex.id || ex['transaction-id'] || '')
                }));
            }
            
            if (transactieId) {
                console.log(`Lege transactie ${transactieId} netjes sluiten bij Polar...`);
                await fetch(`https://www.polaraccesslink.com/v3/users/${creds.polarUserId}/exercise-transactions/${transactieId}`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${creds.accessToken}` }
                });
            }
        }

        if (trainingenLijst.length === 0) {
            return { success: true, count: 0, message: 'Geen nieuwe of recente trainingen gevonden in Polar Flow.' };
        }

        let succesvolOpgeslagen = 0;

        // 2. Loop door de trainingen heen
        for (const item of trainingenLijst) {
            let training: any;
            let exerciseId: string;
            let samplesBaseUrl: string;

            if (item.moetFetchDetails) {
                // Route A: Wachtrij (We moeten de details nog ophalen)
                exerciseId = item.url.split('/').pop() || String(Date.now());
                console.log(`\n=== [Wachtrij] Verwerken sessie ID: ${exerciseId} ===`);
                
                const detailRes = await fetch(item.url, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${creds.accessToken}`, 'Accept': 'application/json' }
                });
                if (!detailRes.ok) {
                    console.error(`Kon details voor sessie ${exerciseId} niet ophalen. Status: ${detailRes.status}`);
                    continue;
                }
                training = await detailRes.json();
                samplesBaseUrl = item.url; // Bij wachtrij is de sample URL gelijk aan de exercise URL
            } else {
                // Route B: Fallback (We hebben de data al!)
                training = item;
                exerciseId = item.idString;
                console.log(`\n=== [Fallback] Verwerken sessie ID: ${exerciseId} ===`);
                
                // Belangrijk voor fallback: de samples moeten worden opgehaald via /v3/exercises/{id}/samples/...
                samplesBaseUrl = `https://www.polaraccesslink.com/v3/exercises/${exerciseId}`;
            }

            // Bereken de duur
            let duurInSeconden = 0;
            if (training.duration) {
                if (typeof training.duration === 'string' && training.duration.startsWith('PT')) {
                    const matches = training.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
                    const uren = parseInt(matches?.[1] || '0', 10);
                    const minuten = parseInt(matches?.[2] || '0', 10);
                    const seconden = parseInt(matches?.[3] || '0', 10);
                    duurInSeconden = (uren * 3600) + (minuten * 60) + seconden;
                } else {
                    duurInSeconden = parseInt(String(training.duration), 10) || 0;
                }
            }

            // Schrijf of update sportSessies
            await db.insert(sportSessies)
                .values({
                    id: exerciseId,
                    startTijd: training.startTime || training['start-time'] || new Date().toISOString(),
                    duur: duurInSeconden,
                    calorieen: training.calories || 0,
                    gemiddeldeHartslag: training['heart-rate']?.average || training['heart-rate-average'] || null,
                    maximaleHartslag: training['heart-rate']?.maximum || training['heart-rate-maximum'] || null,
                    sportType: training.sport || 'UNKNOWN',
                    createdAt: new Date().toISOString()
                })
                .onConflictDoUpdate({
                    target: sportSessies.id,
                    set: {
                        startTijd: training.startTime || training['start-time'] || new Date().toISOString(),
                        duur: duurInSeconden,
                        calorieen: training.calories || 0,
                        gemiddeldeHartslag: training['heart-rate']?.average || training['heart-rate-average'] || null,
                        maximaleHartslag: training['heart-rate']?.maximum || training['heart-rate-maximum'] || null,
                        sportType: training.sport || 'UNKNOWN'
                    }
                });

            // Download detailmetingen (samples)
            console.log(`-> Hartslagmetingen ophalen via: ${samplesBaseUrl}/samples/heart-rate`);
            const hrRes = await fetch(`${samplesBaseUrl}/samples/heart-rate`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${creds.accessToken}`, 'Accept': 'application/json' }
            });
            
            console.log(`   Hartslag response status: ${hrRes.status}`);
            const hrData = hrRes.ok ? await hrRes.json() : null;
            const hartslagen = hrData?.samples || [];
            console.log(`   ${hartslagen.length} hartslag samples gevonden.`);

            console.log(`-> GPS-locaties ophalen via: ${samplesBaseUrl}/samples/locations`);
            const locRes = await fetch(`${samplesBaseUrl}/samples/locations`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${creds.accessToken}`, 'Accept': 'application/json' }
            });
            
            console.log(`   GPS response status: ${locRes.status}`);
            const locData = locRes.ok ? await locRes.json() : null;
            const locaties = locData?.samples || [];
            console.log(`   ${locaties.length} GPS samples gevonden.`);

            // Samenvoegen in de Map
            const metingenMap = new Map<number, { hr?: number; lat?: number; lon?: number; alt?: number }>();
            
            hartslagen.forEach((sample: any) => {
                const offsetString = sample.sampleId ?? sample.offset ?? '0';
                const offset = parseInt(String(offsetString), 10);
                metingenMap.set(offset, { hr: sample.value });
            });

            locaties.forEach((sample: any) => {
                const offsetString = sample.sampleId ?? sample.offset ?? '0';
                const offset = parseInt(String(offsetString), 10);
                const bestaand = metingenMap.get(offset) || {};
                metingenMap.set(offset, { 
                    ...bestaand, 
                    lat: sample.latitude, 
                    lon: sample.longitude, 
                    alt: sample.elevation 
                });
            });

            if (metingenMap.size > 0) {
                console.log(`-> Oude detailmetingen wissen voor sessie ${exerciseId}...`);
                await db.delete(sportSessieMetingen).where(eq(sportSessieMetingen.sessieId, exerciseId));
                
                console.log(`-> ${metingenMap.size} nieuwe detailmetingen invoegen in sport_sessie_metingen...`);
                const recordsToInsert = Array.from(metingenMap.entries()).map(([offset, data]) => ({
                    sessieId: exerciseId,
                    tijdVerschuiving: offset,
                    hartslag: data.hr || null,
                    latitude: data.lat || null,
                    longitude: data.lon || null,
                    hoogte: data.alt || null
                }));

                const chunkSize = 500;
                for (let i = 0; i < recordsToInsert.length; i += chunkSize) {
                    await db.insert(sportSessieMetingen).values(recordsToInsert.slice(i, i + chunkSize));
                }
                console.log(`   Batch schrijven voltooid.`);
            } else {
                console.log(`⚠️ Geen detailmetingen kunnen vinden voor sessie ${exerciseId}.`);
            }
            succesvolOpgeslagen++;
        }

        if (viaWachtrij && transactieId && succesvolOpgeslagen > 0) {
            console.log(`Transactie ${transactieId} committen bij Polar...`);
            await fetch(`https://www.polaraccesslink.com/v3/users/${creds.polarUserId}/exercise-transactions/${transactieId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${creds.accessToken}` }
            });
        }

        return { 
            success: true, 
            count: succesvolOpgeslagen, 
            message: `Succes! Er zijn ${succesvolOpgeslagen} trainingen geanalyseerd.` 
        };

    } catch (error: any) {
        console.error('Synchronisatiefout:', error);
        return { success: false, error: `Fout: ${error.message || error}` };
    }
}

export async function getOpgeslagenTrainingen() {
    try {
        return await db.select().from(sportSessies).orderBy(sportSessies.startTijd);
    } catch (error) {
        return [];
    }
}