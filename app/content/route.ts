import { NextResponse } from 'next/server';
import { DEMO_CONTENT } from '../../lib/content';

export async function GET() {
    try {
        return NextResponse.json(DEMO_CONTENT);
    } catch (err) {
        return NextResponse.json({ error: 'Errore caricamento contenuti' }, { status: 500 });
    }
}
