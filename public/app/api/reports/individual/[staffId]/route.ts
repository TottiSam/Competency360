import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
export async function GET(_req: Request, { params }: { params: Promise<{ staffId: string }> }) {
  const session = await getSession(); if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { staffId } = await params;
  if (session.role === 'STAFF' && session.staffProfile?.id !== staffId) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const staff = await prisma.staffProfile.findUnique({ where: { id: staffId }, include: { user: true, department: true, jobScope: true } });
  if (!staff) return NextResponse.json({ error: 'Staff not found.' }, { status: 404 });
  if (session.role === 'SUPERVISOR' && staff.supervisorId !== session.staffProfile?.id) return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const assessment = await prisma.assessment.findFirst({ where: { staffId }, orderBy: { cycle: { year: 'desc' } }, include: { cycle: true, results: { include: { competency: true } } } });
  return NextResponse.json({ staff, assessment: assessment ? { ...assessment, results: [...assessment.results].sort((a,b) => b.gap-a.gap) } : null });
}
