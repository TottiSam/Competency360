import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
export async function GET() {
  const session = await getSession(); if (session?.role !== 'HR') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const [departments, jobScopes, competencies, cycles] = await Promise.all([prisma.department.findMany(), prisma.jobScope.findMany({ include: { jobCompetencies: { include: { competency: true } } } }), prisma.competency.findMany(), prisma.assessmentCycle.findMany({ orderBy: { year: 'desc' }, include: { cycleJobCompetencies: { include: { jobScope: true, competency: true } } } })]);
  return NextResponse.json({ departments, jobScopes, competencies, cycles });
}
export async function POST(req: NextRequest) {
  const session = await getSession(); if (session?.role !== 'HR') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const body = await req.json();
  if (body.action === 'department') return NextResponse.json(await prisma.department.create({ data: { name: String(body.name).trim() } }));
  if (body.action === 'jobScope') return NextResponse.json(await prisma.jobScope.create({ data: { name: String(body.name).trim() } }));
  if (body.action === 'competency') return NextResponse.json(await prisma.competency.create({ data: { name: String(body.name).trim(), description: body.description || null } }));
  if (body.action === 'question') {
    const text = String(body.text || '').trim();
    if (!body.jobScopeId || !body.competencyId || !text) return NextResponse.json({ error: 'Job scope, competency and question text are required.' }, { status: 400 });
    const mapping = await prisma.jobCompetency.findUnique({ where: { jobScopeId_competencyId: { jobScopeId: body.jobScopeId, competencyId: body.competencyId } } });
    if (!mapping) return NextResponse.json({ error: 'The selected competency is not assigned to this job scope. Assign its required level first.' }, { status: 400 });
    return NextResponse.json(await prisma.surveyQuestion.create({ data: { jobScopeId: body.jobScopeId, competencyId: body.competencyId, text, negativelyWorded: Boolean(body.negativelyWorded) } }));
  }
  if (body.action === 'cycleRequiredLevel') {
    const level = Number(body.requiredLevel); if (!Number.isInteger(level) || level < 1 || level > 5) return NextResponse.json({ error: 'Required level must be between 1 and 5.' }, { status: 400 });
    return NextResponse.json(await prisma.cycleJobCompetency.upsert({ where: { cycleId_jobScopeId_competencyId: { cycleId: body.cycleId, jobScopeId: body.jobScopeId, competencyId: body.competencyId } }, update: { requiredLevel: level }, create: { cycleId: body.cycleId, jobScopeId: body.jobScopeId, competencyId: body.competencyId, requiredLevel: level } }));
  }
  if (body.action === 'requiredLevel') {
    const level = Number(body.requiredLevel); if (!Number.isInteger(level) || level < 1 || level > 5) return NextResponse.json({ error: 'Required level must be between 1 and 5.' }, { status: 400 });
    return NextResponse.json(await prisma.jobCompetency.upsert({ where: { jobScopeId_competencyId: { jobScopeId: body.jobScopeId, competencyId: body.competencyId } }, update: { requiredLevel: level }, create: { jobScopeId: body.jobScopeId, competencyId: body.competencyId, requiredLevel: level } }));
  }
  if (body.action === 'cycle') {
    const created = await prisma.$transaction(async tx => {
      const cycle = await tx.assessmentCycle.create({ data: { name: String(body.name).trim(), year: Number(body.year) } });
      const defaults = await tx.jobCompetency.findMany();
      if (defaults.length) await tx.cycleJobCompetency.createMany({ data: defaults.map(x => ({ cycleId: cycle.id, jobScopeId: x.jobScopeId, competencyId: x.competencyId, requiredLevel: x.requiredLevel })) });
      const staff = await tx.staffProfile.findMany({ where: { user: { role: { in: ['STAFF', 'SUPERVISOR'] } } } });
      if (staff.length) await tx.assessment.createMany({ data: staff.map(x => ({ staffId: x.id, cycleId: cycle.id })) });
      return cycle;
    });
    return NextResponse.json(created);
  }
  if (body.action === 'closeCycle') return NextResponse.json(await prisma.assessmentCycle.update({ where: { id: body.id }, data: { status: 'CLOSED' } }));
  return NextResponse.json({ error: 'Unknown setup action.' }, { status: 400 });
}
