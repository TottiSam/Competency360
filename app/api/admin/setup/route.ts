import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';
export async function GET() {
  const session = await getSession(); if (session?.role !== 'HR') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  const [departments, jobScopes, competencies, cycles] = await Promise.all([prisma.department.findMany(), prisma.jobScope.findMany({ include: { jobCompetencies: { include: { competency: true } } } }), prisma.competency.findMany(), prisma.assessmentCycle.findMany({ orderBy: { year: 'desc' }, include: { cycleJobCompetencies: { include: { jobScope: true, competency: true } } } })]);
  const [questions, staff] = await Promise.all([
    prisma.surveyQuestion.findMany({ include: { competency: true, jobScope: true }, orderBy: [{ jobScopeId: 'asc' }, { id: 'asc' }] }),
    prisma.staffProfile.findMany({ where: { user: { role: { in: ['STAFF', 'SUPERVISOR'] } } }, include: { user: { select: { id: true, name: true, email: true, role: true } }, department: true, jobScope: true }, orderBy: { employeeNo: 'asc' } })
  ]);
  return NextResponse.json({ departments, jobScopes, competencies, cycles, questions, staff });
}
async function handle(req: NextRequest) {
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
      await tx.assessmentCycle.updateMany({ where: { status: 'OPEN' }, data: { status: 'CLOSED' } }); // only one cycle is open at a time
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
  if (body.action === 'updateQuestion') {
    const text = String(body.text || '').trim(); if (!text) return NextResponse.json({ error: 'Question text is required.' }, { status: 400 });
    return NextResponse.json(await prisma.surveyQuestion.update({ where: { id: body.id }, data: { text, negativelyWorded: Boolean(body.negativelyWorded) } }));
  }
  if (body.action === 'deleteQuestion') {
    const q = await prisma.surveyQuestion.findUnique({ where: { id: body.id } }); if (!q) return NextResponse.json({ error: 'Question not found.' }, { status: 404 });
    const same = await prisma.surveyQuestion.count({ where: { jobScopeId: q.jobScopeId, competencyId: q.competencyId } });
    if (same <= 1) return NextResponse.json({ error: 'Each competency needs at least one question. Add another one first.' }, { status: 400 });
    await prisma.$transaction([prisma.selfResponse.deleteMany({ where: { questionId: q.id } }), prisma.surveyQuestion.delete({ where: { id: q.id } })]);
    return NextResponse.json({ ok: true });
  }
  const checkSupervisor = async (id: string) => { const sup = await prisma.staffProfile.findUnique({ where: { id }, include: { user: true } }); return sup?.user.role === 'SUPERVISOR'; };
  if (body.action === 'createStaff') {
    const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase();
    if (!name || !email || !body.departmentId || !body.jobScopeId) return NextResponse.json({ error: 'Name, email, department and job scope are required.' }, { status: 400 });
    const password = String(body.password || 'Password123!'); if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    if (body.supervisorId && !(await checkSupervisor(body.supervisorId))) return NextResponse.json({ error: 'The selected supervisor is not valid.' }, { status: 400 });
    const role = body.role === 'SUPERVISOR' ? 'SUPERVISOR' : 'STAFF';
    const passwordHash = await bcrypt.hash(password, 12);
    const open = await prisma.assessmentCycle.findFirst({ where: { status: 'OPEN' }, orderBy: { year: 'desc' } });
    const profile = await prisma.$transaction(async tx => {
      const user = await tx.user.create({ data: { name, email, role, passwordHash } });
      const p = await tx.staffProfile.create({ data: { userId: user.id, employeeNo: 'EMP' + Date.now().toString().slice(-7), departmentId: body.departmentId, jobScopeId: body.jobScopeId, supervisorId: body.supervisorId || null } });
      if (open) await tx.assessment.create({ data: { staffId: p.id, cycleId: open.id } });
      return p;
    });
    return NextResponse.json({ ok: true, id: profile.id });
  }
  if (body.action === 'updateStaff') {
    const staff = await prisma.staffProfile.findUnique({ where: { id: body.staffId } }); if (!staff) return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
    const data: any = {};
    if (body.departmentId) data.departmentId = body.departmentId;
    if ('supervisorId' in body) {
      if (body.supervisorId && body.supervisorId === staff.id) return NextResponse.json({ error: 'A person cannot supervise themselves.' }, { status: 400 });
      if (body.supervisorId && !(await checkSupervisor(body.supervisorId))) return NextResponse.json({ error: 'The selected supervisor is not valid.' }, { status: 400 });
      data.supervisorId = body.supervisorId || null;
    }
    if (body.jobScopeId && body.jobScopeId !== staff.jobScopeId) {
      const open = await prisma.assessmentCycle.findFirst({ where: { status: 'OPEN' }, orderBy: { year: 'desc' } });
      const a = open ? await prisma.assessment.findUnique({ where: { staffId_cycleId: { staffId: staff.id, cycleId: open.id } } }) : null;
      if (a && a.status !== 'DRAFT') return NextResponse.json({ error: 'This person has already started the current cycle, so their job scope cannot change until it is closed.' }, { status: 400 });
      data.jobScopeId = body.jobScopeId;
    }
    await prisma.staffProfile.update({ where: { id: staff.id }, data });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown setup action.' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try { return await handle(req); }
  catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ error: 'That name or email already exists.' }, { status: 409 });
    if (e?.code === 'P2003' || e?.code === 'P2025') return NextResponse.json({ error: 'The selected record no longer exists. Refresh and try again.' }, { status: 400 });
    return NextResponse.json({ error: 'Could not save. Please check your input and try again.' }, { status: 400 });
  }
}
