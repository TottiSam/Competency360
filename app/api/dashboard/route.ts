import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
export async function GET() {
  const session = await getSession(); if (!session) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const cycle = (await prisma.assessmentCycle.findFirst({ where: { status: 'OPEN' }, orderBy: { year: 'desc' } })) ?? (await prisma.assessmentCycle.findFirst({ orderBy: { year: 'desc' } }));
  if (!cycle) return NextResponse.json({ cycle: null, stats: { staff: 0, completed: 0, critical: 0, pending: 0 }, priorities: [] });
  const where = session.role === 'STAFF' ? { staffId: session.staffProfile?.id, cycleId: cycle.id } : session.role === 'SUPERVISOR' ? { staff: { supervisorId: session.staffProfile?.id }, cycleId: cycle.id } : { cycleId: cycle.id };
  const assessments = await prisma.assessment.findMany({ where, include: { staff: { include: { user: true, department: true } }, results: { include: { competency: true } } } });
  const completed = assessments.filter(a => a.status === 'COMPLETED').length;
  const critical = assessments.reduce((n,a) => n + a.results.filter(r => r.category === 'CRITICAL').length, 0);
  const grouped = new Map<string, { sum: number; critical: number; count: number }>();
  for (const a of assessments) for (const r of a.results) { const g = grouped.get(r.competency.name) || { sum: 0, critical: 0, count: 0 }; g.sum += r.gap; g.count++; if (r.category === 'CRITICAL') g.critical++; grouped.set(r.competency.name, g); }
  const priorities = [...grouped.entries()].map(([name,g]) => ({ name, averageGap: g.count ? g.sum/g.count : 0, critical: g.critical })).sort((a,b) => b.averageGap-a.averageGap).slice(0,3);
  return NextResponse.json({ cycle, stats: { staff: assessments.length, completed, critical, pending: assessments.length-completed }, priorities, assessments: assessments.map(a => ({ id: a.id, staffId: a.staff.id, staff: a.staff.user.name, department: a.staff.department.name, status: a.status, results: a.results.length })) });
}
