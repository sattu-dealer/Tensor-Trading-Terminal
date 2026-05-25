import { NextResponse } from 'next/server';
import { getMemoryKey, setMemoryKey } from '@/lib/memory';

export async function GET() {
    try {
        const memoryJson = await getMemoryKey('tensor_user_state');
        if (!memoryJson) {
            return NextResponse.json({ data: null });
        }
        return NextResponse.json({ data: JSON.parse(memoryJson) });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        await setMemoryKey('tensor_user_state', JSON.stringify(body));
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
