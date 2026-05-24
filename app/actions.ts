'use server';

import { db } from '../db';
import { locaties, kenmerken,locatieGroepen, kenmerkGroepen, groepKenmerken, observaties } from '../db/schema';
import { desc } from 'drizzle-orm';
import { eq } from 'drizzle-orm';


// ==========================================
// 1. LOCATIE ACTIONS
// ==========================================

// // 1. Locatie opslaan + direct koppelen aan geselecteerde groepen
// export async function createLocatie(
//   naam: string, 
//   beschrijving?: string, 
//   latitude?: number, 
//   longitude?: number,
//   groepIds: string[] = [] // Array van geselecteerde groep-IDs uit de checkboxes
// ) {
//   try {
//     // Voeg eerst de locatie toe. De id wordt automatisch gegenereerd via uuidPrimaryKey()
//     const [nieuweLocatie] = await db.insert(locaties).values({
//       naam,
//       beschrijving,
//       latitude,
//       longitude
//     }).returning();

//     // Als er groepen zijn aangevinkt, maken we de koppelingen aan
//     if (groepIds.length > 0) {
//       const koppelingen = groepIds.map(gId => ({
//         locatieId: nieuweLocatie.id,
//         groepId: gId
//       }));
//       await db.insert(locatieGroepen).values(koppelingen);
//     }

//     return { success: true, data: nieuweLocatie };
//   } catch (error) {
//     console.error('Fout bij aanmaken locatie met groepen:', error);
//     return { success: false, error: 'Kon locatie en koppelingen nu niet opslaan' };
//   }
// }

// 1. Nieuwe locatie aanmaken + groepen koppelen
export async function createLocatieMetGroepen(
  naam: string, 
  beschrijving: string | null, 
  latitude: number | undefined, 
  longitude: number | undefined, 
  groepIds: string[] = []
) {
  try {
    return await db.transaction(async (tx) => {
      const [nieuweLocatie] = await tx
        .insert(locaties)
        .values({ naam, beschrijving, latitude, longitude })
        .returning();

      if (groepIds.length > 0) {
        const koppelingen = groepIds.map((gId) => ({
          locatieId: nieuweLocatie.id,
          groepId: gId,
        }));
        await tx.insert(locatieGroepen).values(koppelingen);
      }
      return { success: true, data: nieuweLocatie };
    });
  } catch (error) {
    console.error('Fout bij aanmaken locatie:', error);
    return { success: false, error: 'Kon locatie niet aanmaken' };
  }
}

// 2. Bestaande locatie volledig bijwerken (Naam, GPS én Groepen)
export async function updateLocatieVolledig(
  locatieId: string, 
  naam: string, 
  beschrijving: string | null, 
  latitude: number | undefined, 
  longitude: number | undefined, 
  groepIds: string[]
) {
  try {
    await db.transaction(async (tx) => {
      // Update de basisgegevens van de locatie
      await tx
        .update(locaties)
        .set({ naam, beschrijving, latitude, longitude })
        .where(eq(locaties.id, locatieId));

      // Verwijder de oude groepskoppelingen voor deze locatie
      await tx.delete(locatieGroepen).where(eq(locatieGroepen.locatieId, locatieId));

      // Voeg de nieuwe groepskoppelingen toe
      if (groepIds.length > 0) {
        const koppelingen = groepIds.map((gId) => ({
          locatieId,
          groepId: gId,
        }));
        await tx.insert(locatieGroepen).values(koppelingen);
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Fout bij bijwerken locatie:', error);
    return { success: false, error: 'Kon locatie niet bijwerken' };
  }
}

// 2. Locaties ophalen inclusief hun gekoppelde groepen (voor de labels op het dashboard)
export async function getLocatiesWithGroepen() {
  try {
    const alleLocaties = await db.select().from(locaties);
    
    // Haal alle actieve koppelingen op met de namen van de groepen erbij
    const koppelingen = await db.select({
      locatieId: locatieGroepen.locatieId,
      groepId: locatieGroepen.groepId,
      groepNaam: kenmerkGroepen.naam
    })
    .from(locatieGroepen)
    .innerJoin(kenmerkGroepen, eq(locatieGroepen.groepId, kenmerkGroepen.id));

    // Voeg de groepen als een array van tags toe aan elke locatie
    const resultaat = alleLocaties.map(loc => {
      const gekoppeldeGroepen = koppelingen
        .filter(k => k.locatieId === loc.id)
        .map(k => ({ id: k.groepId, naam: k.groepNaam }));
      
      return {
        ...loc,
        groepen: gekoppeldeGroepen
      };
    });

    return { success: true, data: resultaat };
  } catch (error) {
    console.error('Fout bij ophalen locaties met groepen:', error);
    return { success: false, data: [] };
  }
}
// Alle locaties ophalen
// export async function getLocaties() {
//     try {
//         const data = await db.select().from(locaties).orderBy(desc(locaties.createdAt));
//         return { success: true, data };
//     } catch (error) {
//         console.error('Fout bij ophalen locaties:', error);
//         return { success: false, error: 'Kon locaties ikke ophalen' };
//     }
// }

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
// Maakt een nieuwe groep aan en koppelt direct de kenmerken
export async function createGroepMetKenmerken(naam: string, beschrijving?: string, kenmerkIds: string[] = []) {
  try {
    const [nieuweGroep] = await db.insert(kenmerkGroepen).values({
      naam,
      beschrijving
    }).returning();

    // Nu hergebruiken we de zojuist gemaakte update-functie om de kenmerken te koppelen!
    if (kenmerkIds.length > 0) {
      await updateGroepKenmerken(nieuweGroep.id, kenmerkIds);
    }

    return { success: true, data: nieuweGroep };
  } catch (error) {
    console.error('Fout bij aanmaken nieuwe groep met kenmerken:', error);
    return { success: false, error: 'Kon de nieuwe groep niet opslaan' };
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
// Haal alle parametergroepen op
export async function getKenmerkGroepen() {
  try {
    const groepen = await db.select().from(kenmerkGroepen);
    return { success: true, data: groepen };
  } catch (error) {
    console.error('Fout bij ophalen groepen:', error);
    return { success: false, error: 'Kon groepen niet ophalen' };
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

// Muteren van kenmerken binnen een specifieke groep
 export async function updateGroepKenmerken(groepId: string, kenmerkIds: string[]) {
//   try {
//     await db.transaction(async (tx) => {
//       // 1. Verwijder alle bestaande kenmerk-koppelingen voor deze groep
//       await tx.delete(groepKenmerken).where(eq(groepKenmerken.groepId, groepId));

//       // 2. Als er kenmerken zijn geselecteerd, voeg ze opnieuw toe met een volgorde
//       if (kenmerkIds.length > 0) {
//         const nieuweKoppelingen = kenmerkIds.map((kId, index) => ({
//           groepId: groepId,
//           kenmerkId: kId,
//           volgorde: index // Gebruikt de array-index als standaard volgorde
//         }));

//         await tx.insert(groepKenmerken).values(nieuweKoppelingen);
//       }
//     });

//     return { success: true };
//   } catch (error) {
//     console.error('Fout bij muteren van groep-kenmerken:', error);
//     return { success: false, error: 'Mutatie kon niet worden verwerkt' };
//   }
 }
export async function updateGroepVolledig(
  groepId: string, 
  naam: string, 
  beschrijving: string | null, 
  kenmerkIds: string[]
) {
  try {
    await db.transaction(async (tx) => {
      // 1. Update de naam en beschrijving van de groep zelf
      await tx
        .update(kenmerkGroepen)
        .set({ naam, beschrijving })
        .where(eq(kenmerkGroepen.id, groepId));

      // 2. Verwijder de oude kenmerk-koppelingen
      await tx.delete(groepKenmerken).where(eq(groepKenmerken.groepId, groepId));

      // 3. Voeg de actuele kenmerken weer toe
      if (kenmerkIds.length > 0) {
        const nieuweKoppelingen = kenmerkIds.map((kId, index) => ({
          groepId: groepId,
          kenmerkId: kId,
          volgorde: index
        }));
        await tx.insert(groepKenmerken).values(nieuweKoppelingen);
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Fout bij updaten groep:', error);
    return { success: false, error: 'Groep kon niet worden bijgewerkt' };
  }
}

// Extra helper om snel te zien welke kenmerken NU in een groep zitten
export async function getGekoppeldeKenmerkenVanGroep(groepId: string) {
  try {
    const resultaat = await db
      .select({ kenmerkId: groepKenmerken.kenmerkId })
      .from(groepKenmerken)
      .where(eq(groepKenmerken.groepId, groepId));
    
    return { success: true, data: resultaat.map(r => r.kenmerkId) };
  } catch (error) {
    return { success: false, data: [] as string[] };
  }
}