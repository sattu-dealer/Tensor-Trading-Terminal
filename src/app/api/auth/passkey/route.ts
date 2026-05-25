import { NextResponse } from 'next/server';
import { getMemoryKey, setMemoryKey } from '@/lib/memory';

const DEFAULT_PASSKEY = "1234@4567";

export async function GET() {
    try {
        let passkey = await getMemoryKey('tensor_passkey');
        if (!passkey) {
            passkey = DEFAULT_PASSKEY;
            await setMemoryKey('tensor_passkey', passkey);
        }
        return NextResponse.json({ passkey });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { newPasskey } = await request.json();
        if (!newPasskey) return NextResponse.json({ error: "Passkey required" }, { status: 400 });
        
        await setMemoryKey('tensor_passkey', newPasskey);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
