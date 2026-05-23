'use server';

import { db } from '../db';
import { locaties, kenmerken, kenmerkGroepen, groepKenmerken, observaties } from '../db/schema';
import { desc } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

// ==========================================
// 1. LOCATIE ACTIONS
// ==========================================

// Locatie toevoegen
export async function createLocatie(naam: string, beschrijving?: string, latitude?: number, longitude?: number) {
    try {
        const [nieuweLocatie] = await db.insert(locaties).values({
            naam,
            beschrijving,
            latitude,
            longitude,
        }).returning();

        return { success: true, data: nieuweLocatie };
    } catch (error) {
        console.error('Fout bij aanmaken locatie:', error);
        return { success: false, error: 'Kon locatie niet aanmaken' };
    }
}

// Alle locaties ophalen
export async function getLocaties() {
    try {
        const data = await db.select().from(locaties).orderBy(desc(locaties.createdAt));
        return { success: true, data };
    } catch (error) {
        console.error('Fout bij ophalen locaties:', error);
        return { success: false, error: 'Kon locaties ikke ophalen' };
    }
}

// ==========================================
// 2. KENMERKEN ACTIONS (Soorten & Parameters)
// ==========================================

export async function createKenmerk(params: {
    type: 'fysisch' | 'chemisch' | 'biologisch';
    naam: string;
    wetenschappelijkeNaam?: string;
    dimensie?: string;
}) {
    try {
        const [nieuwKenmerk] = await db.insert(kenmerken).values({
            type: params.type,
            naam: params.naam,
            wetenschappelijkeNaam: params.wetenschappelijkeNaam,
            dimensie: params.dimensie,
        }).returning();

        return { success: true, data: nieuwKenmerk };
    } catch (error) {
        console.error('Fout bij aanmaken kenmerk:', error);
        return { success: false, error: 'Kon kenmerk niet aanmaken' };
    }
}

// ==========================================
// 3. GROEPEN & KOPPELINGEN ACTIONS
// ==========================================

// Maak een nieuwe groep aan (bijv. "Waterkwaliteit" of "Vogels")
export async function createKenmerkGroep(naam: string, beschrijving?: string) {
    try {
        const [nieuweGroep] = await db.insert(kenmerkGroepen).values({
            naam,
            beschrijving,
        }).returning();
        return { success: true, data: nieuweGroep };
    } catch (error) {
        console.error('Fout bij aanmaken groep:', error);
        return { success: false, error: 'Kon groep niet aanmaken' };
    }
}

// Koppel een bestaand kenmerk aan een groep
export async function koppelKenmerkAanGroep(groepId: string, kenmerkId: string, volgorde: number = 0) {
    try {
        const [koppeling] = await db.insert(groepKenmerken).values({
            groepId,
            kenmerkId,
            volgorde,
        }).returning();
        return { success: true, data: koppeling };
    } catch (error) {
        console.error('Fout bij koppelen kenmerk aan groep:', error);
        return { success: false, error: 'Kon kenmerk niet koppelen' };
    }
}

// ==========================================
// 4. OBSERVATIE ACTIONS (De Kern)
// ==========================================

// Sla een nieuwe observatie/meting op
export async function createObservatie(params: {
    locatieId: string;
    kenmerkId: string;
    waarde: string;
    notities?: string;
}) {
    try {
        const [nieuweObservatie] = await db.insert(observaties).values({
            locatieId: params.locatieId,
            kenmerkId: params.kenmerkId,
            waarde: params.waarde,
            notities: params.notities,
        }).returning();

        return { success: true, data: nieuweObservatie };
    } catch (error) {
        console.error('Fout bij aanmaken observatie:', error);
        return { success: false, error: 'Kon observatie niet opslaan' };
    }
}

// Haal observaties op voor een specifieke locatie (inclusief relaties)
export async function getObservatiesVanLocatie(locatieId: string) {
    try {
        const data = await db
            .select({
                id: observaties.id,
                waarde: observaties.waarde,
                notities: observaties.notities,
                kenmerkNaam: kenmerken.naam,
                kenmerkType: kenmerken.type,
                dimensie: kenmerken.dimensie,
            })
            .from(observaties)
            .leftJoin(kenmerken, eq(observaties.kenmerkId, kenmerken.id))
            .where(eq(observaties.locatieId, locatieId));

        return { success: true, data };
    } catch (error) {
        console.error('Fout bij ophalen observaties:', error);
        return { success: false, error: 'Kon observaties niet ophalen' };
    }
}

// ==========================================
// 5. SEED DATA ACTION
// ==========================================

export async function seedStamData() {
  try {
    // 1. Maak de groepen aan
    const [groepWater] = await db.insert(kenmerkGroepen).values({
      naam: 'Waterkwaliteit',
      beschrijving: 'Metingen gerelateerd aan de fysieke en chemische staat van het water',
    }).returning();

    const [groepEcologie] = await db.insert(kenmerkGroepen).values({
      naam: 'Ecologie & Soorten',
      beschrijving: 'Flora en fauna waarnemingen op de locatie',
    }).returning();

    // 2. Maak de kenmerken aan
    const [kTemp] = await db.insert(kenmerken).values({
      type: 'fysisch',
      naam: 'Watertemperatuur',
      dimensie: '°C',
    }).returning();

    const [kPH] = await db.insert(kenmerken).values({
      type: 'chemisch',
      naam: 'pH-waarde',
      dimensie: 'pH',
    }).returning();

    const [kSnoek] = await db.insert(kenmerken).values({
      type: 'biologisch',
      naam: 'Snoek (Esox lucius)',
      wetenschappelijkeNaam: 'Esox lucius',
      dimensie: 'stuks',
    }).returning();

    // 3. Koppel de kenmerken aan de juiste groepen
    if (groepWater && kTemp && kPH) {
      await db.insert(groepKenmerken).values([
        { groepId: groepWater.id, kenmerkId: kTemp.id, volgorde: 1 },
        { groepId: groepWater.id, kenmerkId: kPH.id, volgorde: 2 },
      ]);
    }

    if (groepEcologie && kSnoek) {
      await db.insert(groepKenmerken).values([
        { groepId: groepEcologie.id, kenmerkId: kSnoek.id, volgorde: 1 },
      ]);
    }

    return { success: true, message: 'Database succesvol gevuld met stamdata!' };
  } catch (error) {
    console.error('Fout tijdens seeden:', error);
    return { success: false, error: 'Database seeden is mislukt' };
  }
}