import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
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
  if (!assessment || assessment.status !== 'DRAFT') return NextResponse.json({ error: 'Self-assessment has already been submitted or is unavailable.' }, { status: 400 });
  const validQuestions = await prisma.surveyQuestion.findMany({ where: { id: { in: responses.map((r: any) => r.questionId) }, jobScopeId: session.staffProfile.jobScopeId }, select: { id: true } });
  const allQuestions = await prisma.surveyQuestion.findMany({ where: { jobScopeId: session.staffProfile.jobScopeId }, select: { id: true } });
  if (validQuestions.length !== responses.length || allQuestions.length !== responses.length || allQuestions.some(q => !responses.some((r: any) => r.questionId === q.id))) {
    return NextResponse.json({ error: 'Please answer every question assigned to your job scope exactly once.' }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.selfResponse.createMany({ data: responses.map((r: any) => ({ assessmentId: assessment.id, questionId: r.questionId, score: r.score })) }),
    prisma.assessment.update({ where: { id: assessment.id }, data: { status: 'SELF_SUBMITTED', selfSubmittedAt: new Date() } })
  ]);
  return NextResponse.json({ ok: true, message: 'Self-assessment submitted successfully.' });
}
