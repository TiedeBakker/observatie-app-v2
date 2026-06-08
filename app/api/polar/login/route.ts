import { NextResponse } from 'next/server';

export async function GET() {
    const clientId = process.env.POLAR_CLIENT_ID;
    const redirectUri = process.env.POLAR_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json({ error: 'Polar omgevingsvariabelen ontbreken in .env.local' }, { status: 500 });
    }

    // Polar vereist dat we specifiek vragen naar toegang voor 'gegevens' (accesslink.read_all)
    const polarAuthUrl = `https://flow.polar.com/oauth2/authorization?response_type=code&scope=accesslink.read_all&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    // Stuur de gebruiker direct door naar Polar
    return NextResponse.redirect(polarAuthUrl);
}