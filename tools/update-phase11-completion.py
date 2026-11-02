"""Prepend current Phase 11 results to the exact historical Phase 10 report.

The old tag is read only. Its ten pages and source are retained as an explicitly
historical appendix; no original tag/history is modified.
"""
import hashlib
import html
import io
import json
from pathlib import Path
import re
import subprocess
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,Table,TableStyle,PageBreak
from pypdf import PdfReader,PdfWriter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/test-results'
gate=json.loads((OUT/'phase11-gate-summary.json').read_text(encoding='utf-8'))
assert gate['local_checks_passed']
git=lambda *args:subprocess.check_output(['git',*args],cwd=ROOT)
old_pdf=git('show','phase-10-done:docs/Voltarax_Completion_Summary.pdf')
assert hashlib.sha256(old_pdf).hexdigest()=='ded2f90428ef2b601d840718a0f88c26d1d72395ec0489e2a9a8c95c79c9cc91'
old_source=git('show','phase-10-done:docs/COMPLETION_SUMMARY.md').decode('utf-8')
pages=[f'''# VOLTARAX completion summary
## Phase 11 update - 2 November 2026 IST

Branch: phase-11-gaps. Tested code/evidence checkpoint: `{gate['tested_code_commit']}`.

**Required Phase 11 local work: Done. Connected activation: Partial. Optional nonce CSP: Skipped.**

| Phase 11 task | Current local result |
| --- | --- |
| 0 Original-list audit | Done - 14 items mapped with file evidence |
| 1 Reviewed EN/HI assistant | Done - source citations, human contact, no user text to provider; optional loopback Ollama selector remains off/unverified |
| 2 Original flow media | Done - SVG/CSS hero, silent local clip/poster/captions, lazy/motion/control fallbacks and byte budget |
| 3 360 px data experience | Done - savings first/units second, grouped tabular numbers, data states, measured contrast/axe and keyboard table scrolling |
| 4 IST and reading age | Done - public/dashboard clocks, server-policy Last updated/offline expiry, hidden pause, hydration tests |
| 5 Full nonce CSP | Skipped - coordinated rendering/cache/style/Checkout work needed; inline allowance remains |

| Original pending item | Overall state after local work |
| --- | --- |
| 1 Website/software | Partial - connected inputs/services still needed |
| 2 Payments | Partial - tested code; real TEST provider/business inputs pending |
| 3 India map/locations | Partial - approved geometry and actual site locations missing |
| 4 AI chatbot | Partial - local code Done; actual optional model runtime unverified |
| 5 Real registration OTP | Partial - code/fake sender verified; real delivery not run |
| 6 PostgreSQL | Partial - actual SQL tests; server/restore unverified |
| 7 Hardware integration | Partial - code compiled/simulated; commissioning pending |
| 8 Video UI/UX | Done locally - original assets and browser checks |
| 9 Cybersecurity | Partial - controls verified; advisories/inline CSP/host checks remain |
| 10 Live hosting | Not done - no deployment/hosted CI/container runtime |
| 11 Hardware testing | Partial - local tests/compile; physical tests Not done |
| 12 Dashboard dummy data | Partial - truthful code/tests; live records not inspected/deleted |
| 13 Real AI on website | Partial - model code/validation; calibrated field/weather inputs missing |
| 14 SEO | Partial - technical guards; indexing/publication off |

Detailed baseline and later evidence: PHASE11_GAP_MAP.md. Earlier phases 1-10 passed their recorded local gates. The following appendix preserves their original report; its current/future wording and page numbers describe that historical checkpoint, not later Phase 11 work.
''',f'''# Verification and activation limits

| Saved current local checks | Measured outcome |
| --- | --- |
| Backend / AI | 88 / 28 passed; latest shared regressions 10 passed |
| Browser | 10 UI + 4 actual API cases; no skips/flaky/unexpected cases |
| Data-state matrix | 15 screens: loading, empty, offline and error |
| Axe 4.14.0 | {gate['axe']['scans']} scans, 0 violations; {gate['axe']['incomplete_findings']} incomplete checks retained |
| Metric contrast | Minimum {gate['contrast']['minimum']:.2f}:1 across 12 solid role/surface pairs |
| Rules / native / firmware | 1 / 4 cases; placeholder compile only, no flash |
| Lint / types / build | Passed; standalone assets and bounded media checked |
| Production dependency audit | Frontend 0; backend 8 moderate; no high/critical |
| Packaging / config / patterns | Offline imports, relative dependencies, CI/Compose parse and supported secret patterns pass |

Axe incomplete rule types: {', '.join(gate['axe']['incomplete_rules'])}. The remaining contexts are listed in the reports and need manual review, alongside independent assistive-technology checks. Zero automated violations is not WCAG, Lighthouse or legal certification. Failed attempts remain saved, including corrected semantic/scroll findings and browser-launch/clock-test setup failures. No instrumented coverage percentage is claimed.

## Owner steps before relying on a connected installation

1. Select an isolated project; configure private credentials and first administrator/site access.
2. Review actual Firebase UID/rules/claims, backup and any separately authorized migration; preserve existing data.
3. Calibrate sensors; verify safe relay/camera/reconnect/contact behavior on hardware.
4. Run PostgreSQL/Redis, reviewed schema, shared limits/queues and an isolated encrypted-backup restore drill.
5. Intentionally configure/verify controlled SMTP delivery; fake mail is not an inbox test.
6. Supply approved licensed web-sized India geometry and actual location/state assignments.
7. Validate AI with calibrated real data/labels and trusted artifacts before schedules; weather-ahead forecasting remains Not done.
8. Verify actual Razorpay TEST Checkout/webhooks/refunds with reviewed prices/business/tax inputs; live/GST mode remains unsupported.
9. Complete fluent Hindi, independent accessibility, business/public-asset and counsel review. Legal pages remain drafts/noindex.
10. Separately authorize hosted CI/container/HTTPS/Coolify/DNS/monitoring and prove recovery on the intended host.

No push, external deployment, real message, live payment, user-data migration/deletion or hardware flash occurred. Actual Ollama, server storage/queue/mail, Docker engine/runtime, hardware, approved boundaries and field accuracy remain unverified. Optional nonce work was Skipped rather than presented as hardened.

Use VERIFICATION_AND_RUN_GUIDE.md and its PDF for public preview, owned tests and connected setup. Exact results: test-results/phase11-gate-summary.json. Current issues/manual owners: KNOWN_ISSUES.md and MANUAL_STEPS.md. Source/provenance: SOURCES.md. The next ten pages are the exact Phase 10 historical appendix, retaining its original numbering and source hashes.
''']
assert all(page.isascii() for page in pages)
source='\n\n<!-- pagebreak -->\n\n'.join(pages)+'\n\n<!-- pagebreak -->\n\n# Historical Phase 10 appendix\n\nThe following source is retained from phase-10-done. Current Phase 11 results above supersede its checkpoint wording.\n\n'+old_source
(ROOT/'docs/COMPLETION_SUMMARY.md').write_text(source,encoding='utf-8')
green=colors.HexColor('#166534');ink=colors.HexColor('#173127')
body=ParagraphStyle('Body',fontName='Helvetica',fontSize=8.8,leading=11.8,spaceAfter=6,textColor=ink)
h1=ParagraphStyle('H1',parent=body,fontName='Helvetica-Bold',fontSize=21,leading=25,spaceAfter=12,keepWithNext=True,textColor=green)
h2=ParagraphStyle('H2',parent=body,fontName='Helvetica-Bold',fontSize=11,leading=14,spaceBefore=5,spaceAfter=6,keepWithNext=True,textColor=green)
cell=ParagraphStyle('Cell',parent=body,fontSize=7.7,leading=9.7,spaceAfter=0)
head=ParagraphStyle('Head',parent=cell,fontName='Helvetica-Bold',textColor=colors.white)
def inline(text):
    value=html.escape(text);value=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',value)
    return re.sub(r'`([^`]+)`',r'<font name="Courier" size="7.5">\1</font>',value)
story=[]
for number,page in enumerate(pages):
    if number:story.append(PageBreak())
    lines=page.strip().splitlines();index=0
    while index<len(lines):
        line=lines[index].strip()
        if not line:index+=1;continue
        if line.startswith('|'):
            rows=[]
            while index<len(lines) and lines[index].strip().startswith('|'):
                row=[value.strip() for value in lines[index].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[-: ]+',value) for value in row):rows.append(row)
                index+=1
            table=Table([[Paragraph(inline(value),head if row_index==0 else cell) for value in row] for row_index,row in enumerate(rows)],colWidths=[178,326],repeatRows=1)
            table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),green),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#eef5ef'),colors.white]),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
            story.extend([table,Spacer(1,6)]);continue
        if line.startswith('# '):story.append(Paragraph(inline(line[2:]),h1));index+=1;continue
        if line.startswith('## '):story.append(Paragraph(inline(line[3:]),h2));index+=1;continue
        block=[line];index+=1
        while index<len(lines) and lines[index].strip() and not lines[index].startswith(('#','|')) and not re.match(r'\d+\. ',lines[index]):block.append(lines[index].strip());index+=1
        story.append(Paragraph(inline(' '.join(block)),body))
temp=ROOT/'.local-tools/pdf-review/phase11';temp.mkdir(parents=True,exist_ok=True)
front=temp/'completion-front.pdf'
def footer(canvas,doc):
    canvas.saveState();canvas.setFont('Helvetica',7);canvas.setFillColor(green);canvas.drawString(16*mm,9*mm,'VOLTARAX | Current Phase 11 update | 2 Nov 2026 IST');canvas.drawRightString(A4[0]-16*mm,9*mm,str(doc.page));canvas.restoreState()
SimpleDocTemplate(str(front),pagesize=A4,leftMargin=16*mm,rightMargin=16*mm,topMargin=15*mm,bottomMargin=15*mm,title='Voltarax Phase 11 Update').build(story,onFirstPage=footer,onLaterPages=footer)
assert len(PdfReader(front).pages)==2,'Adjust current pages before combining'
writer=PdfWriter();writer.append(PdfReader(front));writer.append(PdfReader(io.BytesIO(old_pdf)))
writer.add_metadata({'/Title':'Voltarax Completion Summary - Phase 11 with historical Phase 10 appendix','/Author':'Voltarax project workspace'})
pdf=ROOT/'docs/Voltarax_Completion_Summary.pdf'
with pdf.open('wb') as stream:writer.write(stream)
reader=PdfReader(pdf);assert len(reader.pages)==12
proof={'pdf':pdf.relative_to(ROOT).as_posix(),'pages':12,'current_pages':2,'historical_appendix_pages':10,'historical_pdf_sha256':hashlib.sha256(old_pdf).hexdigest(),'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'tested_code_commit':gate['tested_code_commit'],'visual_review':'Pending all-page render inspection'}
(OUT/'phase11-completion-create.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8');print(json.dumps(proof))
