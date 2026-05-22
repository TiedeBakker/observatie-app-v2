'use server';

import { db } from '../db';
import { locaties, kenmerken } from '../db/schema';
import { desc } from 'drizzle-orm';

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