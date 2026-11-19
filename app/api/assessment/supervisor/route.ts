import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { adjustedScore, calculateResult } from '@/lib/gap';
export async function GET() {
  const session = await getSession(); if (!session || !['SUPERVISOR','HR'].includes(session.role)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const cycle = await prisma.assessmentCycle.findFirst({ where: { status: 'OPEN' }, orderBy: { year: 'desc' } });
  if (!cycle) return NextResponse.json({ assessments: [] });
  const assessments = await prisma.assessment.findMany({ where: { cycleId: cycle.id, status: 'SELF_SUBMITTED', ...(session.role === 'SUPERVISOR' ? { staff: { supervisorId: session.staffProfile?.id } } : {}) }, include: { staff: { include: { user: true, jobScope: { include: { jobCompetencies: { include: { competency: true } } } } } } } });
  const withRequirements = await Promise.all(assessments.map(async assessment => {
    const cycleRequirements = await prisma.cycleJobCompetency.findMany({ where: { cycleId: assessment.cycleId, jobScopeId: assessment.staff.jobScopeId }, include: { competency: true } });
    const defaults = assessment.staff.jobScope.jobCompetencies;
    const requiredCompetencies = (cycleRequirements.length ? cycleRequirements : defaults).map(item => ({ ...item, competency: item.competency }));
    return { ...assessment, requiredCompetencies };
  }));
  return NextResponse.json({ assessments: withRequirements });
}
export async function POST(req: NextRequest) {
  const session = await getSession(); if (!session || !['SUPERVISOR','HR'].includes(session.role)) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { assessmentId, ratings } = await req.json();
  if (!assessmentId || !Array.isArray(ratings) || !ratings.length || ratings.some((r: any) => !Number.isInteger(r.score) || r.score < 1 || r.score > 5)) return NextResponse.json({ error: 'Valid competency ratings from 1 to 5 are required.' }, { status: 400 });
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, include: { staff: true, responses: { include: { question: true } }, cycle: true } });
  if (!assessment || assessment.status !== 'SELF_SUBMITTED' || assessment.cycle.status !== 'OPEN') return NextResponse.json({ error: 'Assessment is not ready for supervisor review.' }, { status: 400 });
  if (session.role === 'SUPERVISOR' && assessment.staff.supervisorId !== session.staffProfile?.id) return NextResponse.json({ error: 'You can only rate your direct reports.' }, { status: 403 });
  const cycleRequired = await prisma.cycleJobCompetency.findMany({ where: { cycleId: assessment.cycleId, jobScopeId: assessment.staff.jobScopeId }, include: { competency: true } });
  const required = cycleRequired.length ? cycleRequired : await prisma.jobCompetency.findMany({ where: { jobScopeId: assessment.staff.jobScopeId }, include: { competency: true } });
  const ids = new Set(required.map(x => x.competencyId));
  if (ratings.length !== required.length || ratings.some((r: any) => !ids.has(r.competencyId)) || new Set(ratings.map((r: any) => r.competencyId)).size !== ratings.length) return NextResponse.json({ error: 'Please provide exactly one rating for every required competency.' }, { status: 400 });
  const questionMap = new Map<string, number[]>();
  for (const response of assessment.responses) { const list = questionMap.get(response.question.competencyId) || []; list.push(adjustedScore(response.score, response.question.negativelyWorded)); questionMap.set(response.question.competencyId, list); }
  const results = required.map(item => {
    const scores = questionMap.get(item.competencyId) || [];
    if (!scores.length) throw new Error(`No survey response exists for ${item.competency.name}.`);
    const selfAverage = scores.reduce((a,b) => a+b,0) / scores.length;
    const supervisorScore = ratings.find((r: any) => r.competencyId === item.competencyId).score;
    return { competencyId: item.competencyId, requiredLevel: item.requiredLevel, selfAverage, supervisorScore, ...calculateResult(item.requiredLevel, selfAverage, supervisorScore) };
  });
  await prisma.$transaction(async tx => {
    for (const r of ratings) await tx.supervisorRating.upsert({ where: { assessmentId_competencyId: { assessmentId, competencyId: r.competencyId } }, update: { score: r.score, supervisorId: session.id }, create: { assessmentId, competencyId: r.competencyId, score: r.score, supervisorId: session.id } });
    await tx.assessmentResult.deleteMany({ where: { assessmentId } });
    await tx.assessmentResult.createMany({ data: results.map(r => ({ assessmentId, ...r })) });
    await tx.assessment.update({ where: { id: assessmentId }, data: { status: 'COMPLETED', supervisorSubmittedAt: new Date() } });
  });
  return NextResponse.json({ ok: true, message: 'Supervisor review submitted and results calculated.' });
}
