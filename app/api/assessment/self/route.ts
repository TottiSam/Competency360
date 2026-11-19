import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { adjustedScore, calculateResult } from '@/lib/gap';
export async function GET() {
  const session = await getSession(); if (!session?.staffProfile) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const cycle = await prisma.assessmentCycle.findFirst({ where: { status: 'OPEN' }, orderBy: { year: 'desc' } });
  if (!cycle) return NextResponse.json({ error: 'No open assessment cycle.' }, { status: 404 });
  const assessment = await prisma.assessment.findUnique({ where: { staffId_cycleId: { staffId: session.staffProfile.id, cycleId: cycle.id } }, include: { responses: true } });
  const questions = await prisma.surveyQuestion.findMany({ where: { jobScopeId: session.staffProfile.jobScopeId }, include: { competency: true } });
  return NextResponse.json({ cycle, assessment, questions });
}
export async function POST(req: NextRequest) {
  const session = await getSession(); if (!session?.staffProfile) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  const { responses } = await req.json();
  if (!Array.isArray(responses) || !responses.length || responses.some((r: any) => !Number.isInteger(r.score) || r.score < 1 || r.score > 5)) return NextResponse.json({ error: 'Provide a score from 1 to 5 for every question.' }, { status: 400 });
  const cycle = await prisma.assessmentCycle.findFirst({ where: { status: 'OPEN' }, orderBy: { year: 'desc' } });
  if (!cycle) return NextResponse.json({ error: 'Assessment cycle is closed.' }, { status: 400 });
  const assessment = await prisma.assessment.findUnique({ where: { staffId_cycleId: { staffId: session.staffProfile.id, cycleId: cycle.id } } });
  if (!assessment) return NextResponse.json({ error: 'No assessment is available for you in this cycle.' }, { status: 400 });
  // Staff may edit their answers until the cycle closes (brief, requirement 2).
  const validQuestions = await prisma.surveyQuestion.findMany({ where: { id: { in: responses.map((r: any) => r.questionId) }, jobScopeId: session.staffProfile.jobScopeId }, select: { id: true } });
  const allQuestions = await prisma.surveyQuestion.findMany({ where: { jobScopeId: session.staffProfile.jobScopeId }, select: { id: true } });
  if (validQuestions.length !== responses.length || allQuestions.length !== responses.length || allQuestions.some(q => !responses.some((r: any) => r.questionId === q.id))) {
    return NextResponse.json({ error: 'Please answer every question assigned to your job scope exactly once.' }, { status: 400 });
  }
  const wasCompleted = assessment.status === 'COMPLETED';
  await prisma.$transaction(async tx => {
    await tx.selfResponse.deleteMany({ where: { assessmentId: assessment.id } });
    await tx.selfResponse.createMany({ data: responses.map((r: any) => ({ assessmentId: assessment.id, questionId: r.questionId, score: r.score })) });
    await tx.assessment.update({ where: { id: assessment.id }, data: { status: wasCompleted ? 'COMPLETED' : 'SELF_SUBMITTED', selfSubmittedAt: new Date() } });
    if (!wasCompleted) return;
    // Supervisor already rated: recalculate the stored results from the edited answers.
    const [ratings, questions, cycleReq] = await Promise.all([
      tx.supervisorRating.findMany({ where: { assessmentId: assessment.id } }),
      tx.surveyQuestion.findMany({ where: { jobScopeId: session.staffProfile!.jobScopeId } }),
      tx.cycleJobCompetency.findMany({ where: { cycleId: cycle.id, jobScopeId: session.staffProfile!.jobScopeId } })
    ]);
    const required = cycleReq.length ? cycleReq : await tx.jobCompetency.findMany({ where: { jobScopeId: session.staffProfile!.jobScopeId } });
    const score = new Map<string, number>(responses.map((r: any) => [r.questionId, r.score]));
    const results = required.flatMap(item => {
      const rating = ratings.find(x => x.competencyId === item.competencyId); if (!rating) return [];
      const adj = questions.filter(q => q.competencyId === item.competencyId).map(q => adjustedScore(score.get(q.id)!, q.negativelyWorded));
      if (!adj.length) return [];
      const selfAverage = adj.reduce((a, b) => a + b, 0) / adj.length;
      return [{ assessmentId: assessment.id, competencyId: item.competencyId, requiredLevel: item.requiredLevel, selfAverage, supervisorScore: rating.score, ...calculateResult(item.requiredLevel, selfAverage, rating.score) }];
    });
    await tx.assessmentResult.deleteMany({ where: { assessmentId: assessment.id } });
    await tx.assessmentResult.createMany({ data: results });
  });
  return NextResponse.json({ ok: true, message: wasCompleted ? 'Answers updated and your results were recalculated.' : 'Self-assessment saved. You can edit it until the cycle closes.' });
}
