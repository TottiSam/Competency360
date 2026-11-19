import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
export async function GET(req: NextRequest) {
  const session = await getSession(); if (!session || session.role !== 'HR') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const cycle = await prisma.assessmentCycle.findFirst({ where: { status: 'OPEN' }, orderBy: { year: 'desc' } });
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  const requestedId = req.nextUrl.searchParams.get('departmentId');
  const department = departments.find(d => d.id === requestedId) || departments[0] || null;
  if (!department || !cycle) return NextResponse.json({ cycle, departments, department, assessed: 0, totalStaff: 0, report: [] });
  const [totalStaff, assessed, rows] = await Promise.all([
    prisma.staffProfile.count({ where: { departmentId: department.id, user: { role: { in: ['STAFF', 'SUPERVISOR'] } } } }),
    prisma.assessment.count({ where: { cycleId: cycle.id, status: 'COMPLETED', staff: { departmentId: department.id } } }),
    prisma.assessmentResult.findMany({ where: { assessment: { cycleId: cycle.id, status: 'COMPLETED', staff: { departmentId: department.id } } }, include: { competency: true } })
  ]);
  const byKey = new Map<string, { competency: string; actual: number; gap: number; critical: number; moderate: number; minor: number; count: number }>();
  for (const r of rows) { const g = byKey.get(r.competency.name) || { competency: r.competency.name, actual: 0, gap: 0, critical: 0, moderate: 0, minor: 0, count: 0 }; g.actual += r.actualLevel; g.gap += r.gap; g.count++; g[r.category.toLowerCase() as 'critical'|'moderate'|'minor']++; byKey.set(r.competency.name,g); }
  const report = [...byKey.values()].map(g => ({ ...g, avgActual: g.actual/g.count, avgGap: g.gap/g.count })).sort((a,b) => b.avgGap-a.avgGap);
  return NextResponse.json({ cycle, departments, department, assessed, totalStaff, report });
}
