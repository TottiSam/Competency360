import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const [ict, training, admin] = await Promise.all([
    prisma.department.upsert({ where: { name: 'ICT Unit' }, update: {}, create: { name: 'ICT Unit' } }),
    prisma.department.upsert({ where: { name: 'Training Unit' }, update: {}, create: { name: 'Training Unit' } }),
    prisma.department.upsert({ where: { name: 'Administration' }, update: {}, create: { name: 'Administration' } })
  ]);
  const [developer, lecturer, officer] = await Promise.all([
    prisma.jobScope.upsert({ where: { name: 'System Developer' }, update: {}, create: { name: 'System Developer' } }),
    prisma.jobScope.upsert({ where: { name: 'Lecturer' }, update: {}, create: { name: 'Lecturer' } }),
    prisma.jobScope.upsert({ where: { name: 'Admin Officer' }, update: {}, create: { name: 'Admin Officer' } })
  ]);
  const names = ['Programming','Database','Security','Teaching Delivery','Assessment','Digital Tools','Records Management','Customer Service','Office Productivity'];
  const comps: Record<string,string> = {};
  for (const name of names) { const c = await prisma.competency.upsert({ where: { name }, update: {}, create: { name } }); comps[name] = c.id; }
  const setup = [
    { job: developer, rows: [['Programming',4],['Database',3],['Security',4]] },
    { job: lecturer, rows: [['Teaching Delivery',4],['Assessment',4],['Digital Tools',3]] },
    { job: officer, rows: [['Records Management',3],['Customer Service',4],['Office Productivity',3]] }
  ];
  for (const item of setup) for (const [name, level] of item.rows) await prisma.jobCompetency.upsert({ where: { jobScopeId_competencyId: { jobScopeId: item.job.id, competencyId: comps[name as string] } }, update: { requiredLevel: level as number }, create: { jobScopeId: item.job.id, competencyId: comps[name as string], requiredLevel: level as number } });
  const questionSets = [
    { job: developer, rows: [
      ['Programming','I can build a feature from requirement to deployment on my own.',false],
      ['Programming','I often need help to debug my code.',true],
      ['Database','I can design normalised tables for a new module.',false],
      ['Database','I can write efficient queries that join 3 or more tables.',false],
      ['Security','I apply input validation and access checks by default.',false]
    ]},
    { job: lecturer, rows: [
      ['Teaching Delivery','I adapt my teaching to different learner levels.',false],
      ['Teaching Delivery','I find it hard to keep trainees engaged in practical sessions.',true],
      ['Assessment','I design assessments aligned to the National Occupational Skills Standard (NOSS).',false],
      ['Assessment','I give written feedback that helps trainees improve.',false],
      ['Digital Tools','I struggle to use the LMS to run assessments.',true]
    ]},
    { job: officer, rows: [
      ['Records Management','I file and retrieve records accurately following the SOP.',false],
      ['Records Management','I handle personal data according to PDPA requirements.',false],
      ['Customer Service','I respond to enquiries within the client charter timeline.',false],
      ['Customer Service','I often need to pass routine complaints to my supervisor.',true],
      ['Office Productivity','I can summarise data in a spreadsheet using formulas or pivot tables.',false]
    ]}
  ];
  for (const set of questionSets) for (const [competency, text, negative] of set.rows) {
    const existing = await prisma.surveyQuestion.findFirst({ where: { jobScopeId: set.job.id, text: text as string } });
    if (!existing) await prisma.surveyQuestion.create({ data: { jobScopeId: set.job.id, competencyId: comps[competency as string], text: text as string, negativelyWorded: negative as boolean } });
  }
  const hash = await bcrypt.hash('Password123!', 12);
  const users = [
    { email: 'hr@competency360.local', name: 'HR Administrator', role: 'HR', dept: ict, job: developer, no: 'HR001' },
    { email: 'supervisor@competency360.local', name: 'Aina Supervisor', role: 'SUPERVISOR', dept: ict, job: developer, no: 'ICT001' },
    { email: 'staff@competency360.local', name: 'Daniel Staff', role: 'STAFF', dept: ict, job: developer, no: 'ICT002' },
    { email: 'lecturer@competency360.local', name: 'Farah Lecturer', role: 'STAFF', dept: training, job: lecturer, no: 'TR001' },
    { email: 'officer@competency360.local', name: 'Amir Officer', role: 'STAFF', dept: admin, job: officer, no: 'AD001' }
  ];
  const profiles: Record<string,string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({ where: { email: u.email }, update: { name: u.name, role: u.role, passwordHash: hash }, create: { email: u.email, name: u.name, role: u.role, passwordHash: hash } });
    const profile = await prisma.staffProfile.upsert({ where: { employeeNo: u.no }, update: { userId: user.id, departmentId: u.dept.id, jobScopeId: u.job.id }, create: { employeeNo: u.no, userId: user.id, departmentId: u.dept.id, jobScopeId: u.job.id } });
    profiles[u.email] = profile.id;
  }
  for (const email of ['staff@competency360.local','lecturer@competency360.local','officer@competency360.local']) await prisma.staffProfile.update({ where: { id: profiles[email] }, data: { supervisorId: profiles['supervisor@competency360.local'] } });
  const cycle = await prisma.assessmentCycle.upsert({ where: { name: 'Annual Assessment 2026' }, update: {}, create: { name: 'Annual Assessment 2026', year: 2026, status: 'OPEN' } });
  for (const item of setup) for (const [name, level] of item.rows) await prisma.cycleJobCompetency.upsert({ where: { cycleId_jobScopeId_competencyId: { cycleId: cycle.id, jobScopeId: item.job.id, competencyId: comps[name as string] } }, update: { requiredLevel: level as number }, create: { cycleId: cycle.id, jobScopeId: item.job.id, competencyId: comps[name as string], requiredLevel: level as number } });
  for (const email of ['supervisor@competency360.local','staff@competency360.local','lecturer@competency360.local','officer@competency360.local']) await prisma.assessment.upsert({ where: { staffId_cycleId: { staffId: profiles[email], cycleId: cycle.id } }, update: {}, create: { staffId: profiles[email], cycleId: cycle.id } });
  console.log('Seed complete. Demo password for all users: Password123!');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
