import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      message: 'Используйте WebSocket (ws/wss) для подключения к этому адресу.',
      hint: 'Custom server Next.js поднимает upgrade на /api/collaboration/*.',
    },
    { status: 426 },
  );
}
