import { NextResponse } from 'next/server';
import { exportActivityCsv } from '@/server/actions/audit';
import { requireUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);
  let organizationId = url.searchParams.get('org') ?? '';

  // Если orgId не передан — берём первую организацию пользователя.
  if (!organizationId) {
    const m = await prisma.member.findFirst({ where: { userId: user.id } });
    organizationId = m?.organizationId ?? '';
  }
  if (!organizationId) {
    return NextResponse.json({ error: 'no organization' }, { status: 400 });
  }

  try {
    const csv = await exportActivityCsv(organizationId);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="taskflow-audit-${stamp}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 403 });
  }
}
