# Competency360 - submission notes

## Checklist (from the brief, section 6)
- [ ] Source code: push this folder to a GitHub repo and share the link
- [ ] Full AI chat or prompt history: export or screenshots
- [ ] Test cases showing the gap calculation is correct: `npm test` (8 tests, see below)
- [ ] 1-2 minute video: see script below
- [ ] Email the details to amirul@sarawakskills.edu.my

## Test cases (`npm test`)
| Case | Expected |
|---|---|
| Negative item, answer 1 / 2 / 5 | 5 / 4 / 1 |
| Self 3, supervisor 4 (30/70) | actual 3.7, gap 0.3, Minor |
| Required 4, self 2, supervisor 2 | actual 2.0, gap 2.0, Critical |
| Required 4, self 3, supervisor 3 | actual 3.0, gap 1.0, Moderate |
| Required 4, self 3.5, supervisor 3.5 | gap 0.5, Minor |
| Actual above required (5 vs 3) | gap 0, Minor |
| All 225 combinations of required x self x supervisor | match exact integer arithmetic |
| Mixed normal and negative questions | negative item reversed before averaging |

## Manual test script (needs a running app)
1. Sign in as staff@competency360.local, submit the survey, then open "My assessment" again and change an answer (allowed until the cycle closes).
2. Sign in as supervisor@competency360.local, rate each competency, and check the individual report (header shows supervisor rating status).
3. Sign in as staff again, edit an answer, and confirm the report numbers change.
4. As HR, close the cycle and confirm staff can no longer edit.
5. Try to open another staff member's report as staff (expect 403).

## Assumptions
- Gap is floored at 0 when actual is above required (stored with full precision, shown to 2 decimals).
- Required levels can be overridden per assessment cycle, so each year keeps its own requirements.
- Results are stored per assessment, so past reports do not change when HR edits requirements later.

## Video script (about 90 seconds)
**0:00-0:40 Demo.** "This is Competency360. As staff I answer the survey for my job scope; some questions are negatively worded and are reverse-scored. Now as supervisor I rate each competency. The system weights 70% supervisor and 30% self, then shows the gap and category: Critical at 2 or more, Moderate at 1 to under 2, Minor below 1. Staff see only their own report, supervisors their direct reports, and HR sees the department report with the top 3 training priorities."
**0:40-1:10 Design decision.** "I store a result row per competency when the supervisor submits, including the required level at that time. That way reports stay stable even if HR changes required levels next year, and each cycle can have its own required levels."
**1:10-1:50 What the AI got wrong.** "The AI-written gap function failed my own test: 3 x 0.3 + 4 x 0.7 came out as 3.6999999999999997, which could put a gap on the wrong side of a category boundary. I caught it by running the tests, and fixed it by calculating in whole numbers and rounding. I also compared the code to the brief and found the AI had blocked staff from editing answers after submitting, which the brief allows until the cycle closes. I fixed that, and results now recalculate if the supervisor has already rated."

## Draft email
Subject: Competency360 - Part A submission
Hi Amirul, please find my submission: GitHub repo [link], AI chat history [attached], test cases (npm test), and a 1-2 minute demo video [link]. Setup steps are in the README. Assumptions are listed in SUBMISSION.md. Thank you.
