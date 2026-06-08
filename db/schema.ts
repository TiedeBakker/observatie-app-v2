import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Helper voor een gestandaardiseerde offline-ready UUID primary key
const uuidPrimaryKey = () => 
  text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

// =========================================================================
// 1. STAMTABELLEN (De fundamentele bouwstenen)
// =========================================================================

// Locaties (Waar wordt gemeten/geobserveerd, bijv. 'Woning 1', 'Bosperceel X')
export const locaties = sqliteTable('locaties', {
  id: uuidPrimaryKey(),
  naam: text('naam').notNull(),
  beschrijving: text('beschrijving'),
  // Vaste fallback GPS-coördinaten voor de hoofdlocatie
  latitude: real('latitude'),
  longitude: real('longitude'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// De Universele Kenmerkenbibliotheek (Parameters én Soorten samen!)
export const kenmerken = sqliteTable('kenmerken', {
  id: uuidPrimaryKey(),
  // Type bepaalt het karakter van het kenmerk
  type: text('type', { enum: ['fysisch', 'chemisch', 'biologisch'] }).notNull(),
  naam: text('naam').notNull(), // bijv. 'Gasstand', 'Koolmees', 'Nitraat'
  
  // Specifiek voor biologische soorten
  wetenschappelijkeNaam: text('wetenschappelijke_naam'), 
  
  // Specifiek voor fysische/chemische grootheden
  dimensie: text('dimensie'), // bijv. 'kWh', 'm3', 'mg/l'
  
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});

// Groepen (Hulpmiddel om sets van kenmerken te bundelen, bijv. 'Meterstanden Woning 1' of 'Turflijst Vogels')
export const kenmerkGroepen = sqliteTable('kenmerk_groepen', {
  id: uuidPrimaryKey(),
  naam: text('naam').notNull(),
  beschrijving: text('beschrijving'),
  createdAt: text('created_at').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
});


// =========================================================================
// 2. RELATIETABELLEN (De flexibele, datagestuurde configuratieschil)
// =========================================================================

// De n-op-m koppeltabel tussen Groepen en Kenmerken
// Bepaalt exact welke parameters/soorten in welke groep zitten én de volgorde!
export const groepKenmerken = sqliteTable('groep_kenmerken', {
  id: uuidPrimaryKey(),
  groepId: text('groep_id')
    .notNull()
    .references(() => kenmerkGroepen.id, { onDelete: 'cascade' }),
  kenmerkId: text('kenmerk_id')
    .notNull()
    .references(() => kenmerken.id, { onDelete: 'cascade' }),
  // Jouw cruciale toevoeging: bepaalt de positie op het specifieke invoerformulier
  volgorde: integer('volgorde').default(0).notNull(),
});

// De n-op-m koppeltabel tussen Locaties en Groepen
// Bepaalt welke parametergroepen beschikbaar zijn op welke locatie
export const locatieGroepen = sqliteTable('locatie_groepen', {
  id: uuidPrimaryKey(), // We gebruiken jouw eigen vertrouwde ID helper!
  locatieId: text('locatie_id')
    .notNull()
    .references(() => locaties.id, { onDelete: 'cascade' }),
  groepId: text('groep_id')
    .notNull()
    .references(() => kenmerkGroepen.id, { onDelete: 'cascade' }),
});


// =========================================================================
// 3. TRANSACTIETABEL (De daadwerkelijke data)
// =========================================================================

// De centrale tabel waar ALLE waarnemingen, metingen en tellingen samenkomen
export const observaties = sqliteTable('observaties', {
  id: uuidPrimaryKey(),
  
  locatieId: text('locatie_id')
    .notNull()
    .references(() => locaties.id, { onDelete: 'restrict' }),
  
  kenmerkId: text('kenmerk_id')
    .notNull()
    .references(() => kenmerken.id, { onDelete: 'restrict' }),
  
  // Het exacte moment van de waarneming
  tijdstip: text('tijdstip').default(sql`(CURRENT_TIMESTAMP)`).notNull(),
  
  // Jouw flexibele universele waarde-opslag (slaat '4', '2415.2' of 'Aanwezig' op)
  waarde: text('waarde').notNull(),
  
  // Exacte GPS op het moment van invoeren (Overschrijft indien gevuld de locatie-GPS, bijv. bij wandelingen)
  latitude: real('latitude'),
  longitude: real('longitude'),
  
  notities: text('notities'),
});

// =========================================================================
// TS TYPE DEFINITIES (Handig voor autocomplete in je hele app)
// =========================================================================
export type Locatie = typeof locaties.$inferSelect;
export type Kenmerk = typeof kenmerken.$inferSelect;
export type KenmerkGroep = typeof kenmerkGroepen.$inferSelect;
export type Observatie = typeof observaties.$inferSelect;
export type LocatieGroep = typeof locatieGroepen.$inferSelect;

// 1. Hoofdtabel voor de sportsessies (Polar)
export const sportSessies = sqliteTable('sport_sessies', {
    id: text('id').primaryKey(), // We gebruiken hier straks de unieke 'transaction-id' of 'exercise-id' van Polar zelf
    startTijd: text('start_tijd').notNull(), // ISO string van de start van je training
    duur: integer('duur').notNull(), // Duur in seconden
    calorieen: integer('calorieen'),
    gemiddeldeHartslag: integer('gemiddelde_hartslag'),
    maximaleHartslag: integer('maximale_hartslag'),
    sportType: text('sport_type'), // Bijv. 'RUNNING', 'CYCLING'
    createdAt: text('created_at').default(new Date().toISOString()),
});

// 2. Detailtabel voor de seconden-data (Hartslag & GPS)
export const sportSessieMetingen = sqliteTable('sport_sessie_metingen', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessieId: text('sessie_id')
        .notNull()
        .references(() => sportSessies.id, { onDelete: 'cascade' }), // Als een sessie wordt gewist, gaan alle metingen mee
    tijdVerschuiving: integer('tijd_verschuiving').notNull(), // Aantal seconden sinds de start van de sessie
    hartslag: integer('hartslag'), // Hartslag op dit specifieke moment
    latitude: real('latitude'), // GPS Breedtegraad (indien beschikbaar)
    longitude: real('longitude'), // GPS Lengtegraad (indien beschikbaar)
    hoogte: real('hoogte'), // Hoogte in meters (indien beschikbaar)
});
// Tabel om de Polar API-koppeling voor de gebruiker te onthouden
export const polarConfig = sqliteTable('polar_config', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    polarUserId: text('polar_user_id').notNull().unique(), // Deze 'unique' is cruciaal
    accessToken: text('access_token').notNull(),
    gekoppeldOp: text('gekoppeld_op').default(new Date().toISOString()),
});