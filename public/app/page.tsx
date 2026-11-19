'use client';
import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, BarChart3, BookOpenCheck, BriefcaseBusiness, CheckCircle2, ChevronRight, ClipboardList, FileBarChart2, LayoutDashboard, LogOut, Plus, Search, Settings2, ShieldCheck, Users, X } from 'lucide-react';

type User = { id: string; name: string; email: string; role: 'HR'|'SUPERVISOR'|'STAFF'; staffProfile?: { id: string } | null };
type Question = { id: string; text: string; negativelyWorded: boolean; competency: { name: string } };
const money = (n:number) => Number(n || 0).toFixed(2);
const titleRole = (r:string) => r === 'HR' ? 'HR Administrator' : r === 'SUPERVISOR' ? 'Supervisor' : 'Staff Member';

export default function Home() {
  const [user,setUser] = useState<User|null>(null); const [data,setData] = useState<any>(null); const [tab,setTab] = useState('overview'); const [loading,setLoading] = useState(true); const [notice,setNotice] = useState(''); const [error,setError] = useState('');
  const [survey,setSurvey] = useState<any>(null); const [answers,setAnswers] = useState<Record<string,number>>({}); const [reviews,setReviews] = useState<any[]>([]); const [selected,setSelected] = useState<any>(null); const [ratings,setRatings] = useState<Record<string,number>>({}); const [report,setReport] = useState<any>(null); const [deptReport,setDeptReport] = useState<any>(null); const [setup,setSetup] = useState<any>(null); const [staffReportId,setStaffReportId] = useState('');
  async function api(url:string, init?:RequestInit) { const r = await fetch(url,{...init,headers:{'Content-Type':'application/json',...(init?.headers||{})}}); const j=await r.json(); if(!r.ok) throw new Error(j.error||'Request failed'); return j; }
  async function refresh() { setLoading(true); try { const me=await api('/api/me'); setUser(me); const d=await api('/api/dashboard'); setData(d); } catch { setUser(null); } finally { setLoading(false); } }
  useEffect(()=>{ refresh(); },[]);
  useEffect(()=>{ if(!user) return; if(tab==='survey') loadSurvey(); if(tab==='reviews') loadReviews(); if(tab==='department') loadDept(); if(tab==='setup') loadSetup(); if(tab==='report' && user.staffProfile?.id) loadIndividual(user.staffProfile.id); },[tab,user]);
  async function loadSurvey(){ try { const d=await api('/api/assessment/self'); setSurvey(d); const initial:Record<string,number>={}; for(const r of d.assessment?.responses||[]) initial[r.questionId]=r.score; setAnswers(initial); }catch(e:any){setError(e.message);} }
  async function loadReviews(){ try{const d=await api('/api/assessment/supervisor');setReviews(d.assessments||[]);}catch(e:any){setError(e.message);} }
  async function loadIndividual(id:string){try{setReport(await api(`/api/reports/individual/${id}`));}catch(e:any){setError(e.message);}}
  async function loadDept(id?:string){try{setDeptReport(await api('/api/reports/department'+(id?'?departmentId='+id:'')));}catch(e:any){setError(e.message);}}
  async function loadSetup(){try{setSetup(await api('/api/admin/setup'));}catch(e:any){setError(e.message);}}
  async function logout(){await api('/api/auth/logout',{method:'POST'});setUser(null);setData(null);}
  async function submitSurvey(){try{await api('/api/assessment/self',{method:'POST',body:JSON.stringify({responses:Object.entries(answers).map(([questionId,score])=>({questionId,score}))})});setNotice('Self-assessment submitted successfully.');await loadSurvey();await refresh();}catch(e:any){setError(e.message);}}
  async function submitReview(){if(!selected)return;try{await api('/api/assessment/supervisor',{method:'POST',body:JSON.stringify({assessmentId:selected.id,ratings:Object.entries(ratings).map(([competencyId,score])=>({competencyId,score}))})});setNotice('Supervisor review submitted and report generated.');setSelected(null);setRatings({});await loadReviews();await refresh();}catch(e:any){setError(e.message);}}
  const nav = useMemo(()=>[{id:'overview',label:'Overview',icon:LayoutDashboard,roles:['HR','SUPERVISOR','STAFF']},{id:'survey',label:'My assessment',icon:ClipboardList,roles:['STAFF','SUPERVISOR']},{id:'reviews',label:'Supervisor reviews',icon:ShieldCheck,roles:['SUPERVISOR','HR']},{id:'report',label:'Individual report',icon:FileBarChart2,roles:['STAFF','SUPERVISOR','HR']},{id:'department',label:'Department report',icon:BarChart3,roles:['HR']},{id:'setup',label:'System setup',icon:Settings2,roles:['HR']}].filter(x=>user&&x.roles.includes(user.role)),[user]);
  if(loading) return <div className="loading"><div className="brand-mark">C</div><p>Loading Competency360…</p></div>;
  if(!user) return <Login onLogin={refresh} api={api}/>;
  const active=nav.find(n=>n.id===tab);
  return <div className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark">C</div><div><strong>Competency<span>360</span></strong><small>PEOPLE DEVELOPMENT</small></div></div><div className="workspace-label">WORKSPACE</div><nav>{nav.map(n=><button key={n.id} title={n.label} aria-label={n.label} className={`nav-item ${tab===n.id?'active':''}`} onClick={()=>{setTab(n.id);setError('');setNotice('');}}><n.icon size={20}/><span>{n.label}</span>{tab===n.id&&<ChevronRight size={15} className="nav-chevron"/>}</button>)}</nav><div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><Activity size={17}/></div><strong>Need a hand?</strong><p>Contact your HR administrator for assessment support.</p></div><div className="profile-mini"><div className="avatar">{user.name.slice(0,1)}</div><div className="profile-text"><strong>{user.name}</strong><small>{titleRole(user.role)}</small></div><button className="icon-button" title="Sign out" onClick={logout}><LogOut size={17}/></button></div></div></aside>
  <main className="main-area"><header className="topbar"><div className="breadcrumbs">{tab==='overview'?<strong className="dashboard-overview-title">Dashboard Overview</strong>:<>Workspace <ChevronRight size={14}/> <strong>{active?.label}</strong></>}</div><div className="topbar-search"><Search size={16}/><input aria-label="Search dashboard" placeholder="Search people, competencies..." /></div><div className="topbar-right"><span className="cycle-pill"><span/> {data?.cycle?.name||'No open cycle'}</span><div className="avatar small" title={user.name}>{user.name.slice(0,1)}</div><button className="button secondary small-button topbar-logout" type="button" onClick={logout} title="Sign out"><LogOut size={15}/><span>Sign out</span></button></div></header><div className="page-content"><div className={`page-heading ${tab==='overview'?'page-heading-overview':''}`}><div>{tab!=='overview'&&<><div className="eyebrow">{user.role==='HR'?'PEOPLE ANALYTICS':user.role==='SUPERVISOR'?'TEAM DEVELOPMENT':'MY DEVELOPMENT'}</div><h1>{active?.label}</h1><p>Manage and review competency information for the current assessment cycle.</p></>}</div>{user.role==='HR'&&tab!=='overview'&&<button className="button primary" onClick={()=>setTab('setup')}><Plus size={16}/> Configure system</button>}</div>
  {notice&&<div className="notice success"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}{error&&<div className="notice error"><AlertTriangle size={17}/>{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
  {tab==='overview'&&<><div className="intelligence-dashboard">
    <section className="intelligence-hero">
      <WelcomeHanger user={user}/>
      <div className="intelligence-hero-copy"><span className="intelligence-kicker"><i/> COMPETENCY360 · PEOPLE INTELLIGENCE</span><h2>PEOPLE FIRST.<br/>PROGRESS ALWAYS.</h2><p>A clearer view of your people, their capabilities, and the progress happening across every team.</p>{user.role==='HR'&&<button className="button primary hero-configure-button" onClick={()=>setTab('setup')}><Plus size={16}/> Configure system</button>}<div className="hero-mini-metrics"><span><b>{data?.stats?.staff??0}</b><small>PEOPLE IN CYCLE</small></span><span><b>{data?.stats?.completed??0}</b><small>COMPLETED</small></span></div></div>
      <div className="skill-ecosystem-art" aria-hidden="true"><div className="ecosystem-orbit orbit-one"/><div className="ecosystem-orbit orbit-two"/><div className="ecosystem-core"><span>360</span><small>GROWTH</small></div><div className="ecosystem-node node-one"><Users size={19}/><small>PEOPLE</small></div><div className="ecosystem-node node-two"><Activity size={19}/><small>SKILLS</small></div><div className="ecosystem-node node-three"><BarChart3 size={19}/><small>PROGRESS</small></div><div className="ecosystem-leaf leaf-one"/><div className="ecosystem-leaf leaf-two"/></div>
      <div className="hero-cycle-chip"><span/> {data?.cycle?.name||'No open assessment cycle'}</div>
    </section>
    <div className="intelligence-kpi-grid">
      <div className="intelligence-kpi"><span className="kpi-symbol"><Users size={19}/></span><div><small>{user.role==='STAFF'?'MY ASSESSMENT':'PEOPLE IN CYCLE'}</small><strong>{data?.stats?.staff??0}</strong><em>Staff records</em></div><span className="kpi-mark">↗</span></div>
      <div className="intelligence-kpi"><span className="kpi-symbol green"><CheckCircle2 size={19}/></span><div><small>COMPLETED</small><strong>{data?.stats?.completed??0}</strong><em>Reports ready</em></div><span className="kpi-mark">✓</span></div>
      <div className="intelligence-kpi"><span className="kpi-symbol amber"><ClipboardList size={19}/></span><div><small>IN PROGRESS</small><strong>{data?.stats?.pending??0}</strong><em>Awaiting completion</em></div><span className="kpi-mark">◷</span></div>
      <div className="intelligence-kpi"><span className="kpi-symbol red"><AlertTriangle size={19}/></span><div><small>CRITICAL GAPS</small><strong>{data?.stats?.critical??0}</strong><em>Priority attention</em></div><span className="kpi-mark">!</span></div>
    </div>
    <div className="intelligence-main-grid">
      <section className="intelligence-panel gap-analytics"><div className="intelligence-panel-head"><div><span className="panel-eyebrow">WORKFORCE DEVELOPMENT</span><h3>Training priorities</h3><p>Competencies with the highest average skill gaps</p></div><span className="panel-period">Top priorities <ChevronRight size={14}/></span></div>
        {(data?.priorities||[]).length?<div className="priority-chart">{data.priorities.slice(0,5).map((p:any,i:number)=><div className="priority-chart-row" key={p.name}><div className="priority-chart-label"><span>{p.name}</span><b>{money(p.averageGap)}</b></div><div className="priority-chart-track"><i style={{width:`${Math.max(4,Math.min(100,p.averageGap/4*100))}%`}}/><span style={{left:`${Math.max(4,Math.min(100,p.averageGap/4*100))}%`}}/></div><small>{p.critical} critical cases</small></div>)}</div>:<div className="intelligence-empty"><Activity size={25}/><strong>No training priorities yet</strong><span>Priority insights will appear after competency reviews are completed.</span></div>}
        <div className="chart-legend"><span><i className="legend-green"/> Skill gap level</span><span><i className="legend-grey"/> Review attention</span></div>
      </section>
      <div className="intelligence-side-stack">
        <section className="intelligence-panel cycle-health"><div className="intelligence-panel-head compact"><div><span className="panel-eyebrow">ASSESSMENT STATUS</span><h3>Cycle health</h3></div><span className="health-dot"/></div><div className="health-ring-wrap"><div className="health-ring" style={{'--completion':`${data?.stats?.staff?Math.round((data.stats.completed/data.stats.staff)*100):0}%`} as React.CSSProperties}><div><strong>{data?.stats?.staff?Math.round((data.stats.completed/data.stats.staff)*100):0}%</strong><small>COMPLETE</small></div></div><div className="health-legend"><span><i className="legend-green"/> Completed <b>{data?.stats?.completed??0}</b></span><span><i className="legend-grey"/> Pending <b>{data?.stats?.pending??0}</b></span></div></div></section>
        <section className="intelligence-panel people-snapshot"><div className="intelligence-panel-head compact"><div><span className="panel-eyebrow">YOUR WORKFORCE</span><h3>People overview</h3></div><Users size={18}/></div>{(data?.assessments||[]).slice(0,3).map((person:any,i:number)=><button className="snapshot-person" key={person.id} onClick={()=>{setStaffReportId(person.staffId);loadIndividual(person.staffId);setTab('report')}}><span className={`snapshot-avatar snapshot-${i%4}`}>{person.staff?.split(' ').map((n:string)=>n[0]).slice(0,2).join('').toUpperCase()}</span><span><b>{person.staff}</b><small>{person.department||'Staff member'}</small></span><em className={person.status==='COMPLETED'?'snapshot-done':'snapshot-pending'}>{person.status==='COMPLETED'?'Done':'Pending'}</em></button>)}{!(data?.assessments||[]).length&&<span className="snapshot-empty">Staff records will appear here.</span>}</section>
      </div>
    </div>
    <section className="intelligence-panel workflow-panel"><div className="intelligence-panel-head"><div><span className="panel-eyebrow">HOW IT WORKS</span><h3>Assessment workflow</h3><p>A clear path from self-reflection to actionable development insights.</p></div><BookOpenCheck size={21}/></div><div className="workflow-steps-modern"><div><span>01</span><b>Self-assessment</b><small>Staff reflect on current competencies</small></div><i/><div><span>02</span><b>Supervisor review</b><small>Managers evaluate demonstrated skills</small></div><i/><div><span>03</span><b>Gap analysis</b><small>Development priorities are generated</small></div></div><button className="intelligence-link" onClick={()=>setTab(user.role==='STAFF'?'survey':user.role==='SUPERVISOR'?'reviews':'department')}>Continue to {user.role==='STAFF'?'my assessment':user.role==='SUPERVISOR'?'supervisor reviews':'department report'} <ArrowUpRight size={15}/></button></section>
    <section className="intelligence-panel table-panel"><div className="panel-heading"><div><h2>{user.role==='STAFF'?'My assessment status':'Assessment overview'}</h2><p>People and assessment progress</p></div><span className="subtle-tag">{data?.assessments?.length||0} RECORDS</span></div><AssessmentTable rows={data?.assessments||[]} role={user.role} onView={(id:string)=>{setStaffReportId(id);loadIndividual(id);setTab('report')}}/></section>
  </div></>}
{tab==='survey'&&<section className="panel"><div className="panel-heading"><div><h2>Competency self-assessment</h2><p>Rate each statement based on your current ability. Scale: 1 (Strongly disagree) to 5 (Strongly agree).</p></div><span className="subtle-tag">{survey?.questions?.length||0} QUESTIONS</span></div>{survey?.assessment?.status!=='DRAFT'?<Empty text="Your self-assessment has already been submitted, or no assessment is currently available."/>:<><div className="survey-note"><AlertTriangle size={17}/> Some statements are negatively worded. The system automatically reverse-scores these responses.</div>{(survey?.questions||[]).map((q:Question,i:number)=><div className="question-card" key={q.id}><div className="question-top"><span>QUESTION {String(i+1).padStart(2,'0')}</span><span className="question-competency">{q.competency.name}</span></div><p>{q.text}</p>{q.negativelyWorded&&<span className="negative-label">Reverse-scored question</span>}<div className="scale-row">{['Strongly disagree','Disagree','Neutral','Agree','Strongly agree'].map((label,j)=><label key={j} className={`scale-option ${answers[q.id]===j+1?'selected':''}`}><input type="radio" name={q.id} checked={answers[q.id]===j+1} onChange={()=>setAnswers({...answers,[q.id]:j+1})}/><b>{j+1}</b><small>{label}</small></label>)}</div></div>)}<div className="form-footer"><span>{Object.keys(answers).length} of {survey?.questions?.length||0} answered</span><button className="button primary" disabled={Object.keys(answers).length!==(survey?.questions?.length||0)} onClick={submitSurvey}>Submit assessment <ChevronRight size={16}/></button></div></>}</section>}
  {tab==='reviews'&&<section className="panel"><div className="panel-heading"><div><h2>Pending supervisor reviews</h2><p>Review direct reports who have submitted their self-assessment.</p></div><span className="subtle-tag">{reviews.length} PENDING</span></div>{selected?<><div className="review-banner"><div className="avatar">{selected.staff.user.name.slice(0,1)}</div><div><strong>{selected.staff.user.name}</strong><small>{selected.staff.jobScope.name} · {selected.staff.employeeNo}</small></div><button className="icon-button" onClick={()=>setSelected(null)}><X/></button></div>{(selected.requiredCompetencies||selected.staff.jobScope.jobCompetencies||[]).map((jc:any)=><div className="rating-row" key={jc.competencyId}><div><strong>{jc.competency.name}</strong><small>Rate current competency from 1 to 5</small></div><div className="rating-buttons">{[1,2,3,4,5].map(n=><button key={n} className={ratings[jc.competencyId]===n?'chosen':''} onClick={()=>setRatings({...ratings,[jc.competencyId]:n})}>{n}</button>)}</div></div>)}<div className="form-footer"><span>Supervisor rating carries 70% weight.</span><button className="button primary" disabled={Object.keys(ratings).length!==(selected.requiredCompetencies||selected.staff.jobScope.jobCompetencies).length} onClick={submitReview}>Submit review & calculate results</button></div></>:reviews.length?reviews.map(a=><div className="list-row" key={a.id}><div className="avatar">{a.staff.user.name.slice(0,1)}</div><div className="list-main"><strong>{a.staff.user.name}</strong><small>{a.staff.jobScope.name}</small></div><span className="status pending">Self submitted</span><button className="button secondary small-button" onClick={()=>{setSelected(a);setRatings({});}}>Review <ChevronRight size={15}/></button></div>):<Empty text="No staff members are waiting for your review."/>}</section>}
  {tab==='report'&&<section className="panel"><div className="panel-heading"><div><h2>Individual competency report</h2><p>Competency results sorted by largest gap first.</p></div><button className="button secondary" onClick={()=>user.staffProfile?.id&&loadIndividual(user.staffProfile.id)}>Refresh</button></div>{report?.assessment?.results?.length?<><div className="report-header"><div><small>STAFF MEMBER</small><strong>{report.staff.user.name}</strong></div><div><small>JOB SCOPE</small><strong>{report.staff.jobScope.name}</strong></div><div><small>DEPARTMENT</small><strong>{report.staff.department.name}</strong></div><div><small>ASSESSMENT CYCLE</small><strong>{report.assessment.cycle.name}</strong></div></div><div className="table-wrap"><table><thead><tr><th>Competency</th><th>Required</th><th>Actual</th><th>Gap</th><th>Category</th></tr></thead><tbody>{report.assessment.results.map((r:any)=><tr key={r.id}><td><strong>{r.competency.name}</strong></td><td>{r.requiredLevel}</td><td>{money(r.actualLevel)}</td><td>{money(r.gap)}</td><td><Category value={r.category}/></td></tr>)}</tbody></table></div><div className="summary-line"><strong>Summary:</strong> {report.assessment.results.filter((r:any)=>r.category==='CRITICAL').length} Critical · {report.assessment.results.filter((r:any)=>r.category==='MODERATE').length} Moderate · {report.assessment.results.filter((r:any)=>r.category==='MINOR').length} Minor. Suggested focus: <strong>{report.assessment.results[0]?.competency.name}</strong>.</div><div className="formula-note">Actual score = (Self-assessment × 30%) + (Supervisor rating × 70%). Gap = max(0, Required − Actual).</div></>:<Empty text="Your report will be available after your supervisor submits the review."/>}</section>}
  {tab==='department'&&<section className="panel"><div className="panel-heading"><div><h2>Department competency report</h2><p>Average competency levels and gap distribution for completed assessments.</p></div><div className="report-controls"><select value={deptReport?.department?.id||''} onChange={e=>loadDept(e.target.value)}>{(deptReport?.departments||[]).map((d:any)=><option key={d.id} value={d.id}>{d.name}</option>)}</select><span className="subtle-tag">{deptReport?.cycle?.name||'CURRENT CYCLE'}</span></div></div>{deptReport?.report?.length?<><div className="report-header"><div><small>DEPARTMENT</small><strong>{deptReport.department.name}</strong></div><div><small>ASSESSMENT CYCLE</small><strong>{deptReport.cycle.name}</strong></div><div><small>STAFF ASSESSED</small><strong>{deptReport.assessed} of {deptReport.totalStaff}</strong></div><div><small>COMPLETION</small><strong>{deptReport.totalStaff?Math.round(deptReport.assessed/deptReport.totalStaff*100):0}%</strong></div></div><div className="table-wrap"><table><thead><tr><th>Competency</th><th>Avg actual</th><th>Avg gap</th><th>Critical</th><th>Moderate</th><th>Minor</th></tr></thead><tbody>{deptReport.report.map((r:any,i:number)=><tr key={i}><td><strong>{r.competency}</strong></td><td>{money(r.avgActual)}</td><td>{money(r.avgGap)}</td><td>{r.critical}</td><td>{r.moderate}</td><td>{r.minor}</td></tr>)}</tbody></table></div><div className="summary-line"><strong>Top 3 training priorities</strong>{[...deptReport.report].sort((a:any,b:any)=>b.avgGap-a.avgGap).slice(0,3).map((r:any,i:number)=><div key={i}>{i+1}. {r.competency} — average gap {money(r.avgGap)}, {r.critical} staff Critical</div>)}</div></>:<Empty text="Department results will appear after supervisor reviews are completed."/>}</section>}
  {tab==='setup'&&<Setup setup={setup} api={api} onSaved={()=>{loadSetup();refresh();setNotice('System configuration saved.');}}/>}
  </div></main></div>;
}
function Login({onLogin,api}:any){
  const [email,setEmail]=useState('hr@competency360.local');
  const [password,setPassword]=useState('Password123!');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [showPassword,setShowPassword]=useState(false);
  const [role,setRole]=useState('HR');
  const [done,setDone]=useState(false);
  async function submit(e:any){
    e.preventDefault(); setBusy(true); setError('');
    try{
      await api('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});
      setDone(true);
      await new Promise(resolve=>setTimeout(resolve,450));
      await onLogin();
    } catch(e:any){setError(e.message);}
    finally{setBusy(false);setDone(false);}
  }
  function chooseDemo(nextRole:string){
    setRole(nextRole);
    const accounts:any={HR:'hr@competency360.local',SUPERVISOR:'supervisor@competency360.local',STAFF:'staff@competency360.local'};
    setEmail(accounts[nextRole]); setPassword('Password123!'); setError('');
  }
  return <main className="reference-login" aria-label="Competency360 sign in">
    <div className="reference-glow reference-glow-one" aria-hidden="true"/><div className="reference-glow reference-glow-two" aria-hidden="true"/>
    <div className="reference-ghost" aria-hidden="true">COMPETENCY</div>
    <nav className="reference-nav reference-nav-minimal" aria-label="Competency360"><b>Competency<span>360</span></b></nav>
    <div className="reference-login-layout">
      <section className="reference-login-art" id="about">
        <div className="reference-art-caption"><h1>Develop people. Drive <em>performance.</em></h1></div>
        <svg className="reference-scene" viewBox="0 0 480 340" role="img" aria-label="Illustration of a person reviewing a competency gap report">
          <rect x="250" y="14" width="190" height="120" rx="12" fill="#fff" opacity=".55"/><rect x="262" y="26" width="166" height="96" rx="6" fill="#BFE3F5"/><circle className="reference-sun" cx="395" cy="56" r="16" fill="#FFE9A8"/><path d="M345 26v96M262 74h166" stroke="#fff" strokeWidth="5"/>
          <circle cx="120" cy="50" r="26" fill="#fff"/><path className="reference-hand" d="M120 50V30" stroke="#0F2A3D" strokeWidth="3" strokeLinecap="round"/><path d="M120 50l12 6" stroke="#0F2A3D" strokeWidth="3" strokeLinecap="round"/>
          <rect x="20" y="262" width="450" height="12" rx="6" fill="#fff" opacity=".9"/><rect x="60" y="274" width="10" height="60" rx="4" fill="#fff" opacity=".7"/><rect x="420" y="274" width="10" height="60" rx="4" fill="#fff" opacity=".7"/>
          <rect x="44" y="148" width="14" height="110" rx="7" fill="#7FA6C9"/><rect x="44" y="236" width="86" height="14" rx="7" fill="#7FA6C9"/><rect x="82" y="250" width="8" height="62" rx="4" fill="#5E86AA"/><ellipse cx="86" cy="318" rx="46" ry="8" fill="#5E86AA"/><rect x="104" y="236" width="96" height="24" rx="12" fill="#2F4B66"/><rect x="180" y="246" width="24" height="76" rx="12" fill="#2F4B66"/><ellipse cx="196" cy="324" rx="20" ry="7" fill="#0F2A3D"/>
          <g className="reference-idle"><rect x="72" y="142" width="66" height="104" rx="30" fill="#1E5BFF"/><circle cx="104" cy="106" r="28" fill="#F2C1A0"/><path d="M76 104a28 28 0 0156-10c-12-14-44-14-56 10z" fill="#2B2B3A"/><circle className="reference-blink" cx="118" cy="108" r="3.5" fill="#0F2A3D"/></g>
          <rect x="226" y="248" width="184" height="12" rx="6" fill="#D5E2EA"/><rect x="244" y="116" width="150" height="134" rx="10" fill="#12304A"/><rect x="254" y="126" width="130" height="114" rx="6" fill="#EAF6FB"/><text x="264" y="146" fontSize="10" fontWeight="700" fill="#0F2A3D" fontFamily="Inter,sans-serif">Gap report</text>
          <rect x="264" y="160" width="110" height="8" rx="4" fill="#C9DDE8"/><rect className="reference-bar" x="264" y="160" width="68" height="8" rx="4" fill="#F5B83D"/><rect x="264" y="186" width="110" height="8" rx="4" fill="#C9DDE8"/><rect className="reference-bar reference-bar-two" x="264" y="186" width="50" height="8" rx="4" fill="#F5B83D"/><rect x="264" y="212" width="110" height="8" rx="4" fill="#C9DDE8"/><rect className="reference-bar reference-bar-three" x="264" y="212" width="94" height="8" rx="4" fill="#34D399"/>
          <g className="reference-pop"><circle cx="396" cy="112" r="17" fill="#34D399"/><path d="M388 112l6 6 11-12" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></g><g className="reference-arm"><path d="M120 166L152 214L222 234" stroke="#1E5BFF" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" fill="none"/><circle cx="228" cy="236" r="9" fill="#F2C1A0"/></g><rect x="436" y="236" width="24" height="26" rx="5" fill="#E8946B"/><g className="reference-leaf"><path d="M448 238c-20-20-18-44-4-56 6 16 10 34 4 56z" fill="#34D399"/><path d="M448 238c18-14 28-36 20-52-12 12-20 30-20 52z" fill="#10B981"/></g>
        </svg>
      </section>
      <section className={`reference-login-card ${done?'reference-login-done':''}`} id="welcome">
        <div className="reference-card-orb reference-card-orb-one"/><div className="reference-card-orb reference-card-orb-two"/>
        <div className="reference-card-heading"><span>WELCOME BACK</span><h2>Competency<span>360</span></h2><small>PEOPLE DEVELOPMENT</small><p>Sign in to access your competency assessment and development insights.</p></div>
        <form className="reference-form" onSubmit={submit}>
          <fieldset className="reference-roles"><legend>QUICK DEMO ACCESS</legend><label className={role==='STAFF'?'selected':''}><input type="radio" name="role" checked={role==='STAFF'} onChange={()=>chooseDemo('STAFF')}/>Staff</label><label className={role==='SUPERVISOR'?'selected':''}><input type="radio" name="role" checked={role==='SUPERVISOR'} onChange={()=>chooseDemo('SUPERVISOR')}/>Supervisor</label><label className={role==='HR'?'selected':''}><input type="radio" name="role" checked={role==='HR'} onChange={()=>chooseDemo('HR')}/>HR</label></fieldset>
          <label className="reference-field"><span>Email address</span><input type="email" autoComplete="username" placeholder="you@organisation.edu.my" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
          <label className="reference-field"><span>Password</span><span className="reference-password-wrap"><input type={showPassword?'text':'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e=>setPassword(e.target.value)} required/><button type="button" className="reference-eye" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?'Hide':'Show'}</button></span></label>
          {error&&<div className="reference-error" role="alert"><b>!</b>{error}</div>}
          <button className="reference-submit" type="submit" disabled={busy}>{busy?'Signing in…':<>Log in <span>↗</span></>}</button>
        </form>
        <div className="reference-demo-note">Demo password: <b>Password123!</b></div>
        <div className="reference-card-footer"><span>© 2026 Competency360</span><span>People first. Progress always.</span></div>
        <div className="reference-success-mark" aria-live="polite"><span>✓</span><b>Welcome back</b><small>Opening your workspace…</small></div>
      </section>
    </div>
  </main>
}

function WelcomeHanger({ user }: { user: User }) {
  const [length, setLength] = useState(230);
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ x: 0, y: 0, length: 230, angle: 0, time: 0 });
  const velocity = useRef({ angle: 0, length: 0 });
  const frame = useRef<number | null>(null);

  const firstName = user.name.trim().split(/\s+/)[0] || user.name;
  const greeting = user.role === 'HR' ? 'Hey, HR!'
    : user.role === 'SUPERVISOR' ? 'Hey, Supervisor!' : `Hey, ${firstName}!`;
  const roleLabel = user.role === 'HR' ? 'HR ADMINISTRATOR'
    : user.role === 'SUPERVISOR' ? 'SUPERVISOR' : 'STAFF MEMBER';

  function stopAnimation() {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }

  function handleDown(e: PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    stopAnimation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, length, angle, time: performance.now() };
    velocity.current = { angle: 0, length: 0 };
    setDragging(true);
  }

  function handleMove(e: PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const nextLength = Math.max(100, Math.min(390, drag.current.length + dy));
    const nextAngle = Math.max(-72, Math.min(72,
      drag.current.angle + Math.atan2(dx, Math.max(90, drag.current.length + dy)) * 180 / Math.PI
    ));
    const now = performance.now();
    const dt = Math.max(8, now - drag.current.time);
    velocity.current = {
      angle: (nextAngle - angle) / dt * 16,
      length: (nextLength - length) / dt * 16
    };
    drag.current.time = now;
    setLength(nextLength);
    setAngle(nextAngle);
  }

  function handleUp() {
    if (!dragging) return;
    setDragging(false);

    let a = angle * Math.PI / 180;
    let angularVelocity = velocity.current.angle * Math.PI / 180 * 0.85;
    let l = length;
    let lengthVelocity = velocity.current.length * 0.45;
    let previous = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(2, (now - previous) / 16.67);
      previous = now;

      // Pendulum gravity + air resistance; elastic lanyard returns to its resting length.
      const gravity = 0.018;
      const angularAcceleration = -(gravity / Math.max(0.72, l / 230)) * Math.sin(a) - 0.012 * angularVelocity;
      angularVelocity += angularAcceleration * dt;
      a += angularVelocity * dt;

      lengthVelocity += ((230 - l) * 0.018 - lengthVelocity * 0.105) * dt;
      l += lengthVelocity * dt;

      if (Math.abs(a) < 0.0025 && Math.abs(angularVelocity) < 0.0018 &&
          Math.abs(l - 230) < 0.6 && Math.abs(lengthVelocity) < 0.25) {
        setAngle(0); setLength(230); frame.current = null; return;
      }

      setAngle(a * 180 / Math.PI);
      setLength(l);
      frame.current = requestAnimationFrame(animate);
    };

    stopAnimation();
    frame.current = requestAnimationFrame(animate);
  }

  useEffect(() => () => stopAnimation(), []);

  return <div className="welcome-hanger" aria-label="Interactive swinging welcome badge">
    
    <div className="welcome-id-pivot" style={{ '--lanyard-angle': `${angle}deg` } as React.CSSProperties}>
      <div className="welcome-id"
        style={{ transform: 'none' }}
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
        onLostPointerCapture={handleUp}>
        <img className="welcome-lanyard-real" src="/competency360-lanyard.png" alt="Woven Competency360 lanyard with metal ring and clasp" draggable={false} />
        <div className={`welcome-id-card ${dragging ? 'is-dragging' : ''}`}>
          <div className="welcome-id-brand">
            <span className="welcome-id-logo">C</span>
            <span>COMPETENCY<span>360</span></span>
          </div>
          <div className="welcome-id-content">
            <small>WELCOME TO YOUR WORKSPACE</small>
            <h2>{greeting}</h2>
            <p>{user.name}</p>
            <span className="welcome-id-role">{roleLabel}</span>
          </div>
          <div className="welcome-id-footer">
            <span>PEOPLE DEVELOPMENT</span><span>✦ 360</span>
          </div>
          <div className="welcome-id-print-details">
            <span>ID: C360-{user.id.slice(0,6).toUpperCase()}</span>
            <span className="welcome-id-barcode" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></span>
            <span className="welcome-id-dept">PEOPLE<br/>DEVELOPMENT</span>
          </div>
        </div>
        <div className="welcome-id-hint">{dragging ? 'LET GO TO SWING' : 'GRAB & SWING'}</div>
      </div>
    </div>
  </div>;
}
function Stat({icon,label,value,tone,detail}:any){return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-detail">{detail}</div></div>}
function Empty({text}:any){return <div className="empty-state"><div className="empty-icon"><Search size={20}/></div><p>{text}</p></div>}
function Category({value}:any){const label=value==='CRITICAL'?'Critical':value==='MODERATE'?'Moderate':'Minor';return <span className={`category ${value.toLowerCase()}`}>{label}</span>}
function AssessmentTable({rows,role,onView}:any){return rows.length?<div className="table-wrap"><table><thead><tr><th>Staff member</th><th>Department</th><th>Status</th><th>Competencies</th><th></th></tr></thead><tbody>{rows.map((r:any)=><tr key={r.id}><td><strong>{r.staff}</strong></td><td>{r.department}</td><td><span className={`status ${r.status==='COMPLETED'?'complete':'pending'}`}>{r.status.replaceAll('_',' ').toLowerCase()}</span></td><td>{r.results}</td><td><button className="text-button" onClick={()=>onView(r.staffId)}>View <ArrowUpRight size={14}/></button></td></tr>)}</tbody></table></div>:<Empty text="No assessment records are available for this cycle."/>}
function Setup({setup,api,onSaved}:any){const [name,setName]=useState('');const [action,setAction]=useState('department');const [job,setJob]=useState('');const [competency,setCompetency]=useState('');const [level,setLevel]=useState('3');const [question,setQuestion]=useState('');const [negative,setNegative]=useState(false);const [cycle,setCycle]=useState('Annual Assessment 2027');const [cycleId,setCycleId]=useState('');const [year,setYear]=useState('2027');const [error,setError]=useState('');const availableCompetencies=action==='question'&&job?(setup?.jobScopes?.find((x:any)=>x.id===job)?.jobCompetencies||[]).map((x:any)=>x.competency):(setup?.competencies||[]);async function submit(e:any){e.preventDefault();setError('');try{let body:any={action};if(['department','jobScope','competency'].includes(action))body.name=name;else if(action==='requiredLevel')body={action,jobScopeId:job,competencyId:competency,requiredLevel:Number(level)};else if(action==='cycleRequiredLevel')body={action,cycleId,jobScopeId:job,competencyId:competency,requiredLevel:Number(level)};else if(action==='question')body={action,jobScopeId:job,competencyId:competency,text:question,negativelyWorded:negative};else if(action==='cycle')body={action,name:cycle,year:Number(year)};await api('/api/admin/setup',{method:'POST',body:JSON.stringify(body)});setName('');setQuestion('');onSaved();}catch(e:any){setError(e.message);}}async function closeCycle(id:string){try{await api('/api/admin/setup',{method:'POST',body:JSON.stringify({action:'closeCycle',id})});onSaved();}catch(e:any){setError(e.message);}}return <div className="setup-grid"><section className="panel"><div className="panel-heading"><div><h2>System configuration</h2><p>Manage HR setup data and assessment cycles.</p></div><Settings2 size={19}/></div>{error&&<div className="notice error">{error}</div>}<form className="setup-form" onSubmit={submit}><label>Configuration type<select value={action} onChange={e=>{setAction(e.target.value);setCompetency('');}}><option value="department">Add department</option><option value="jobScope">Add job scope</option><option value="competency">Add competency</option><option value="requiredLevel">Set default required competency level</option><option value="cycleRequiredLevel">Set required level for an assessment year</option><option value="question">Add survey question</option><option value="cycle">Create assessment cycle</option></select></label>{['department','jobScope','competency'].includes(action)&&<label>Name<input value={name} onChange={e=>setName(e.target.value)} required/></label>}{action==='cycleRequiredLevel'&&<label>Assessment cycle<select value={cycleId} onChange={e=>setCycleId(e.target.value)} required><option value="">Select cycle</option>{setup?.cycles?.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}{['requiredLevel','cycleRequiredLevel','question'].includes(action)&&<><label>Job scope<select value={job} onChange={e=>{setJob(e.target.value);setCompetency('');}} required><option value="">Select job scope</option>{setup?.jobScopes?.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Competency<select value={competency} onChange={e=>setCompetency(e.target.value)} required><option value="">Select competency</option>{availableCompetencies.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label></>}{['requiredLevel','cycleRequiredLevel'].includes(action)&&<label>Required level (1–5)<select value={level} onChange={e=>setLevel(e.target.value)}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label>}{action==='question'&&<><label>Question text<textarea value={question} onChange={e=>setQuestion(e.target.value)} required/></label><label className="check-label"><input type="checkbox" checked={negative} onChange={e=>setNegative(e.target.checked)}/> Negatively worded question (reverse score)</label></>}{action==='cycle'&&<><label>Cycle name<input value={cycle} onChange={e=>setCycle(e.target.value)} required/></label><label>Year<input type="number" value={year} onChange={e=>setYear(e.target.value)} required/></label></>}<button className="button primary">Save configuration</button></form></section><section className="panel"><div className="panel-heading"><div><h2>Current setup</h2><p>Configured departments, job scopes and competencies.</p></div></div><h3 className="setup-subhead">Departments</h3><div className="chip-list">{setup?.departments?.map((x:any)=><span key={x.id}>{x.name}</span>)}</div><h3 className="setup-subhead">Job scopes & required levels</h3>{setup?.jobScopes?.map((x:any)=><div className="setup-job" key={x.id}><strong>{x.name}</strong><div className="chip-list">{x.jobCompetencies.map((jc:any)=><span key={jc.id}>{jc.competency.name} · L{jc.requiredLevel}</span>)}</div></div>)}<h3 className="setup-subhead">Assessment cycles & annual requirements</h3>{setup?.cycles?.map((x:any)=><div className="setup-job" key={x.id}><div className="list-row compact"><div className="list-main"><strong>{x.name}</strong><small>{x.year}</small></div><span className={`status ${x.status==='OPEN'?'complete':'pending'}`}>{x.status.toLowerCase()}</span>{x.status==='OPEN'&&<button className="text-button" onClick={()=>closeCycle(x.id)}>Close cycle</button>}</div><div className="chip-list">{x.cycleJobCompetencies.map((jc:any)=><span key={jc.id}>{jc.jobScope.name}: {jc.competency.name} · L{jc.requiredLevel}</span>)}</div></div>)}</section></div>}
