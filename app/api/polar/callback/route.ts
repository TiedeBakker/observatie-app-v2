import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../db'; 
import { polarConfig } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
        return NextResponse.json({ error: 'Geen autorisatiecode ontvangen.' }, { status: 400 });
    }

    const clientId = process.env.POLAR_CLIENT_ID;
    const clientSecret = process.env.POLAR_CLIENT_SECRET;
    const redirectUri = process.env.POLAR_REDIRECT_URI;

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    try {
        const bodyParams = `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirectUri || '')}`;

        const res = await fetch('https://polarremote.com/v2/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json;charset=UTF-8'
            },
            body: bodyParams 
        });

        const data = await res.json();

        if (!res.ok) {
            console.error('Polar Token Exchange Fout:', data);
            return NextResponse.json({ error: 'Fout bij inruilen code', details: data }, { status: 500 });
        }

        const polarUserId = String(data.x_user_id);
        const accessToken = data.access_token;

        // ROBUUSTE OPSLAG METHODE (Zonder SQL ON CONFLICT)
        // 1. Controleer eerst of deze user al eens gekoppeld is
        const bestaandeConfig = await db
            .select()
            .from(polarConfig)
            .where(eq(polarConfig.polarUserId, polarUserId))
            .limit(1);

        if (bestaandeConfig.length > 0) {
            // 2a. Bestaat al? Dan updaten we het token
            await db
                .update(polarConfig)
                .set({
                    accessToken: accessToken,
                    gekoppeldOp: new Date().toISOString()
                })
                .where(eq(polarConfig.polarUserId, polarUserId));
            console.log('Polar token succesvol bijgewerkt voor user:', polarUserId);
        } else {
            // 2b. Bestaat nog niet? Nieuw record aanmaken
            await db.insert(polarConfig).values({
                polarUserId: polarUserId,
                accessToken: accessToken,
                gekoppeldOp: new Date().toISOString()
            });
            console.log('Nieuwe Polar koppeling opgeslagen voor user:', polarUserId);
        }

        // Stuur de gebruiker terug naar het dashboard
        return NextResponse.redirect(new URL('/?polar_success=true', request.url));

    } catch (error) {
        console.error('Netwerk- of databasefout tijdens Polar callback:', error);
        return NextResponse.json({ error: 'Interne serverfout.' }, { status: 500 });
    }
}