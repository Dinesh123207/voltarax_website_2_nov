"""Build the evidence-bound completion Markdown/PDF with the bundled PDF runtime.

Run only after the local gate and release-candidate tag exist. Rendering/visual
verification is a separate required step; this script never claims field assurance.
"""
import hashlib
import html
import json
from pathlib import Path
import re
import subprocess

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parents[1]
RESULTS=ROOT/'docs/test-results'
git=lambda *args:subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
gate=json.loads((RESULTS/'phase10-gate-summary.json').read_text(encoding='utf-8'))
candidate=git('rev-parse','release-candidate')
assert git('branch','--show-current')=='phase-10-release'
assert gate['status'].startswith('local gate passed')
assert gate['counts']=={'backend':81,'ai':28,'public_browser':7,'actual_api_browser':3,'database_rules':1,'native':4}
assert gate['application_tree']==git('rev-parse','release-candidate:voltarax-web')
assert not git('diff','release-candidate','--name-only','--','voltarax-web'),'Application changed after candidate'

pages=[]
pages.append(f'''# VOLTARAX
## Completion summary

**Local code and verification complete. Real installation activation remains partial.**

Date: 2 November 2026 IST

Branch: phase-10-release

Code/evidence tag: release-candidate

Latest commit at report generation: `{candidate}`

Tested application source: `{gate['tested_code_commit']}`

Application tree: `{gate['application_tree']}`

The report/artifact commit follows the code/evidence tag. Application source is unchanged. The final phase-10-done tag identifies the completed artifact commit; this document does not pretend to contain its own future commit hash.

| Recorded local results | Count |
| --- | --- |
| Backend cases | 81 |
| AI cases | 28 |
| Browser cases | 10 (7 UI fixtures + 3 actual API) |
| Database-rule / native cases | 1 / 4 |
| Current source-bound bilingual messages | 1045 |

Test results are engineering evidence, not measured business performance. No production-readiness, field-accuracy, legal or accessibility certification is claimed.

Source: docs/COMPLETION_SUMMARY.md. Exact command evidence: docs/test-results/phase10-gate-summary.json. PDF text/layout/render review is recorded separately in docs/test-results/phase10-pdf-proof.json after this file is rendered.
''')
pages.append('''# Executive summary

The existing Voltarax application was improved in place through all ten phases. Firebase telemetry/accounts and the Express, Next.js, NodeMCU, Raspberry Pi and Python architecture remain. PostgreSQL/Drizzle now supports relational operations and test commerce. Data quality, authorization, missing-data behavior, recorded IST energy, device commands, inspection inputs, AI validation and bilingual public flows were corrected or added. All final local checks passed. Configuration and recovery guides are prepared, while real services, hardware, approved map data, business/legal content and deployment still need the named owners. No user data was migrated/deleted, no push/deployment occurred, and no real message or live payment was sent.

## Phase status at a glance

| Phase | Local status | Activation/input status |
| --- | --- | --- |
| 1 Stabilization | Done - gate passed | Partial - field/live migration |
| 2 Accounts/security | Done - gate passed | Partial - SMTP/Redis/HTTPS |
| 3 Hardware code | Done - gate passed | Partial - physical verification |
| 4 Operations/reports | Done - gate passed | Partial - real SQL/queue/restore |
| 5 Inspections | Done - gate passed | Partial - camera/actual inputs |
| 6 AI | Done - gate passed | Partial - real data/weather |
| 7 Commerce code | Done - gate passed | Partial - provider/legal/tax |
| 8 Public/English/Hindi | Done - gate passed | Partial - review/PDF/mail |
| 9 Map viewer/join | Done - gate passed | Partial - approved web outline |
| 10 Release preparation | Done - local gate | Partial - hosted/runtime rollout |

Done means implemented and checked locally. Partial names an external input or verification gap. Not done and Skipped are identified explicitly on the following pages. No completion percentage or national fleet total has been invented.
''')
pages.append('''# What was done: phases 1-3

## Phase 1 - stabilization: Done locally

Reviewed the original source/claims, retained the architecture and fixed IST period boundaries, recorded-energy integration/coverage and carbon assumptions. Shared quality metadata and UI badges distinguish Measured, Estimated, Calculated and Unavailable. Missing observations no longer imply zero/OFF/Healthy. Site-partitioned bounded telemetry reads retain legacy compatibility, with an offline migration tool that was not run on user data. Patched dependency findings/configuration and meaningful regressions were added.

Main files: backend services/energy.js, dataQuality.js, telemetryRepository.js, dashboardData.js; firmware/AI partition readers; frontend dashboard badges; migration and audit tools. FILE_INVENTORY.md is the historical baseline review, not current line coverage.

## Phase 2 - accounts/security: Done locally

Email-only OTP uses hashed purpose-bound challenges, expiry, attempt/replay/resend controls and a fake sender in tests. Verified viewers, administrator site/role assignment, revocable cookies, validation, safe errors, rate limits, redacted logs and headers protect current routes. Actual local browser tests verify registration, promotion/site grant, old-session revocation, login and role denial. RTDB rules test role/site/device isolation and protected account secrets.

Main files: backend User, auth/validate/security middleware, OTP/session/accountVerification/rateLimits/logger services, protected routes and firebase.rules.json. Real SMTP, shared Redis and intended TLS/proxy remain Partial.

## Phase 3 - devices/relay: Done locally

Added one-time hashed device keys and guarded registration/rotation/disable, authenticated ingest with time/schema/order/replay checks, freshness suppression, bounded firmware buffering/backoff/time/sensor helpers and a clearly synthetic loopback simulator. Relay commands require administrator confirmation and OTP, expire, preserve audit/ack states and never infer contact feedback from a GPIO acknowledgement.

Main files: backend devices/deviceIngest/relay services and routes, hardware/nodemcu src/include/test, tools/device-simulator and dashboard device/relay screens. Four native cases and placeholder firmware compile pass; no board flash or physical switching occurred.
''')
pages.append('''# What was done: phases 4-7

## Phase 4 - relational operations/reports: Done locally

Drizzle schema and explicit migrations support persistent alerts, work orders, history, audit and transactional outbox records. Operator transitions/assignment/version checks are tested with actual PGlite SQL. Disabled-by-default queue delivery has retries/dead letters; real-input ESG PDFs require coverage and reviewed factors, refusing synthetic/insufficient inputs. Backups/imports remain explicit operator tasks.

Main files: backend db/schema.ts and migrations, operations/notifications/reports/auditLog services, protected routes and corresponding dashboard screens. Actual PostgreSQL/Redis, mail transport and restore are Partial.

## Phase 5 - inspections: Done locally

Fixed server-only camera endpoints, scoped access, redirect/type/size guards, raster sanitation and stored photos/manual coating observations use actual supplied inputs and server/observation dates. Categorical trends do not claim an automatic diagnosis or numerical coating sensor score.

Main files: backend camera/image/inspections services/routes, relational inspection schema and frontend inspection screens. Actual camera/field observations are Partial; automatic diagnosis/validated coating score are Not done.

## Phase 6 - AI: Done locally

Bounded validated telemetry, chronological evaluation, training-only preprocessing, baseline comparisons, acceptance policies and trusted versioned artifacts replace unverified accuracy claims. Input/model/publication clocks, current-condition inference and drift checks preserve missing/stale states. Twenty-eight Python cases pass on synthetic/local fixtures.

Main files: ai-engine data/models/pipeline/scripts and backend AI contracts. Real calibrated performance/labels/schedules are Partial. Weather-ahead forecasting is Not done without suitable time-aligned data.

## Phase 7 - test commerce: Done locally

Unpriced plans, immutable SQL orders/payments/events, raw HMAC verification, idempotency, uncertainty reconciliation, manual refund records and test receipt hashes/PDFs are implemented with buyer/admin controls. Actual local browser tests prove that a signed browser callback stays pending and a captured webhook replay produces one payment/invoice. No sample business prices ship.

Main files: backend commerce/paymentPolicy/invoices services, schema/routes and frontend commerce/account pages. Provider TEST transport/refunds are Partial; live mode/GST/real fulfilment are Not done/guarded.
''')
pages.append('''# What was done: phases 8-10

## Phase 8 - public site/English/Hindi: Done locally

Removed unsupported scientific/business/people/patent/deployment claims. Existing routes now support English and /hi Hindi with 1045 exact-source/parameter-bound messages and stable API option values. Entered names/notes/IDs retain their original content. Prepared FAQ, IST clock, keyboard/focus/mobile/form contrast and reduced-motion fixes have scoped browser checks. Review-gated metadata/robots/sitemap, an original brand PNG and noindex legal drafts default to no public indexing.

Main files: frontend existing app/[locale], i18n/messages, public-site/seo/clock helpers, legal/UI components and browser tests. Full Hindi PDF shaping/email templates are Not done; fluent/counsel/independent AT/performance/public-asset review are Partial. No Lighthouse/WCAG certification.

## Phase 9 - boundary verification/map: Done locally

Recovered the exact archived LFS object and validated it offline: 164447698 bytes, 36 features, 1071165 coordinate pairs, actual ST_NM/state/id keys. Fingerprint matches the archive. The authenticated Leaflet client-only viewer joins only the authorized configured site's registered devices and recorded IST energy, with nulls, preserved zero, coverage/legend/safe tooltips and a table alternative. Missing/invalid/unapproved geometry shows Map data missing.

Main files: mapBoundaries/stateMap services, verify-geojson.mjs, protected map routes and frontend map page/component. Raw source exceeds the 8 MiB/250000-point web budget and is not publication-approved. Current authority/rights/web-sized data and exact state assignment are Partial; a fabricated/approximated India outline was Skipped.

## Phase 10 - release engineering: Done locally

Final tests/build/types/lint pass against the standalone artifact, with seven UI fixtures and three separate actual-API browser workflows. Safe cached/coalesced readiness distinguishes liveness/dependencies. Pinned CI actions, non-root multi-stage images, private full-stack Compose and detailed Coolify/environment/TLS/backup/rollback/monitoring guides are prepared. Configuration parsing is verified; container/hosted operation is not.

Main files: .github/workflows/ci.yml, Dockerfiles/Compose, readiness/healthz, original loopback test wrappers and release documents. Evidence report/source generation is Done from passed gates; final rendered-file review and artifact commit are recorded separately. Hosted CI, image/runtime/deployment/recovery are Partial, with no push or external action.
''')
pages.append('''# What was not done, and who must act

| Item/status | Reason and owner |
| --- | --- |
| Partial - SMTP/shared limits/HTTPS | Messaging and release owners must supply intended credentials/recipients, verify transport/cookies/proxy/Redis and separately authorize delivery |
| Partial - real SQL/queue/migrations | Operations owner needs an actual PostgreSQL/Redis host, reviewed migrations, concurrency and dead-letter checks; PGlite is not a server |
| Partial - physical installation | Hardware owner must calibrate sensors, verify safe wiring/reconnect/relay/camera and supply actual observations; contact feedback stays Unavailable |
| Partial - AI field assurance | Data/field reviewers must provide calibrated readings/labels and review chronological performance, drift and trusted artifact ownership |
| Not done - future weather forecast | Suitable time-aligned weather/future targets/provider inputs are absent; current-condition estimates must not be relabelled forecasts |
| Partial - approved map activation | Geospatial owner must approve current outline/rights, provide licensed web-sized data and exact state assignment; raw recovery is not approval |
| Partial - provider test workflow | Commerce owner must verify actual Razorpay TEST Checkout/webhook/reconciliation/refunds; all local gateway/widget responses were fake |
| Not done - live/GST/fulfilment | No live keys, reviewed seller/tax facts, real prices or fulfilment policy were supplied; guards remain, a future reviewed implementation is required |
| Not done - full Hindi PDF/mail | Licensed embedding/shaping and mixed-script tests plus translated email templates remain; original Unicode data is preserved, PDF labels explicitly unavailable |
| Partial - legal/content/accessibility | Owner/counsel/fluent/AT reviewers must confirm business/public-asset facts/rights, current legal processes, wording and complete accessibility/performance |
| Partial - hosted/container/recovery | Release/operations owners must run hosted CI, actual engine/images/Coolify/DNS/TLS/monitoring and encrypted isolated restore/rollback drills |
| Skipped - prohibited external action | No push, deployment/publication, real message, live payment, live migration or data deletion was authorized/performed |

Manual specifics and owners: MANUAL_STEPS.md, RELEASE_OPERATIONS.md, MAP_DATA.md and LEGAL_REVIEW.md. Missing credentials, hardware, reviewed data/legal facts and external authorization did not block independent local work. These rows remain open for the named owners; this report does not turn a test fixture into field evidence.
''')
verification=[('Backend','81 pass; 94.79 s','phase10-gate-backend'),('AI','28 pass; 15.51 s','phase10-gate-ai'),('Expanded lint','Pass; 8.27 s','phase10-gate-lint'),('Source/generated types','Pass; 9.66/10.71 s','phase10-gate-source-types / generated-types'),('Standalone build/assets','Pass; 209.66 s','phase10-gate-build'),('UI + HTTP','7 pass; 63.87 s browser, 71.18 s outer','phase10-gate-web / browser / fixture'),('Actual API browser','3 pass; 150.25 s browser, 174.32 s outer','phase10-gate-api / browser / fixture'),('RTDB rules','1 case pass; 7.65 s','phase10-gate-rules'),('Native C++','4 pass; 22.89 s','phase10-gate-native-corrected'),('ESP8266 placeholders','Compile pass; 234.61 s; no flash','phase10-gate-firmware'),('Production audit','Frontend 0; backend 8 moderate; no high/critical','phase10-gate-audit / production-current'),('Full dependency audit','Frontend 18 / backend 21 moderate; dry-run changes 0','phase10-audit-disposition'),('CI / Compose','Syntax/pins pass; hosted/engine not run','phase10-ci-syntax / gate-compose'),('Pattern scan at code gate','1107 paths / 1778 text blobs; no findings/large skips','phase10-gate-secrets / gate-summary')]
table='\n'.join('| '+' | '.join(row)+' |' for row in verification)
pages.append('''# Verification: exactly what ran

Counts are framework cases, not assertion counts or measured line coverage. All latest applicable checks pass. Browser reports contain zero skipped, flaky or unexpected cases. Every evidence prefix below resolves under docs/test-results/ to saved command/result/log files.

| Check | Actual result | Evidence prefix |
| --- | --- | --- |
'''+table+'''

Seven UI cases intercept API responses. Three separate cases use real product routes, cookies/OTP/site roles, actual demo RTDB/temporary SQL, raw signatures/replay and PDF download. Only delivery/gateway/widget/device responses are fake. Visibility is a simulated event; firmware compilation/native tests are not physical operation.

Earlier failures/timeouts were retained and corrected runs identified. The first native run missed its compiler path; the successful retry uses the existing isolated core. Placeholder compile populated a normal default SDK cache and emitted upstream Python SyntaxWarnings; no user data/cache was removed. No line/branch coverage percentage or Lighthouse score was measured.
''')
pages.append('''# Known issues and practical risks

- Backend production retains eight moderate SDK-tree package matches; full frontend/backend trees have 18/21 moderate matches. These are package matches and can share one advisory. Both non-breaking dry runs changed zero packages. Exact exposure/candidate metadata is in KNOWN_ISSUES.md and phase10-audit-disposition.json. Do not apply suggested old ESLint/config-next/nodemon/Firebase-CLI versions blindly.
- Narrow RTDB application use does not prove SDK advisories unexploitable. Current CSP allows inline rendering. Shared Redis/rate limits, real database/process concurrency and intended HTTPS proxy behavior need actual-host checks.
- Telemetry has a 50000-row safety ceiling; large reporting periods need reviewed aggregation. Missing/gapped/stale data is not extrapolated into operating hours, generation or healthy panels. Configured carbon/physical factors remain estimates and are not official reporting or savings assurance.
- Mail delivery is at-least-once, not exactly-once. Dead letters and uncertain orders/refunds need deliberate reconciliation. A browser payment callback never establishes capture or real fulfilment.
- Source trust, calibration, camera/GPIO/contact state, AI accuracy and future weather data are not verified by synthetic inputs. No numerical coating or automatic camera-diagnosis performance promise was added.
- Raw boundary schema/hash is verified, but the upstream is not proof of survey authority/current outline/underlying rights. It is too large for the browser budget; product geometry stays missing. No national fleet totals or substitute India outline exist.
- Hindi UI/source/option guards and scoped screenshots do not establish complete fluent/legal/AT/performance conformance. PDFs are English/ASCII with explicit unavailable labels for non-ASCII names; mail remains English. Original records are never transliterated to hide a glyph problem.
- Privacy/terms/refunds remain noindex drafts. Entity/contact, current law/applicability, retention/age/rights/processors, tax/refunds and public facts/assets need owner/counsel review. Indexing stays off.
- Docker engine, real image/runtime permissions/storage, hosted CI, Coolify/DNS/TLS, monitoring and encrypted backups/restore/rollback are unverified. No uptime or recovery-time commitment is invented.
- Pattern scanning found no supported credential patterns in current/history text, with scope recorded. It cannot prove every credential format absent. Private keys/exports/raw geometry/traces remain ignored/local; rotate intended operator credentials before separately authorized activation.

No user data was migrated/deleted, source pushed or private material published by this run. No real messages, live payments or external deployments occurred.
''')
pages.append('''# Assumptions, provenance and licenses

[ASSUMED] Existing single-configured-site authorization/aggregation, conservative integration/freshness/budget/probe policies and current-condition AI acceptance are engineering choices, not business or field guarantees. [UNVERIFIED] Real calibration/performance, current outline authority/rights, actual services/proxy/recovery and legal applicability need the owners listed in the manual checklist. The full ledger is DECISIONS.md.

The 23 archives were kept read-only under ignored reference storage. Baseline inventory review is not a claim that every line of those third-party repositories was read. Normal packages/original integration were used; no template rebuild or copyleft/source-available product code was adapted. Notices remain in installed dependencies and product license files. Sources below summarize SOURCES.md; its exact URLs/versions/nested-license caveats are authoritative.

| Reference/dependency group | License assessment / use |
| --- | --- |
| System-Design-KIT | MIT reference; no source copied |
| transformers.js | Apache-2.0 reference; not imported as PV training/accuracy evidence |
| TimescaleDB / Renovate | Source-available or mixed / AGPL; no code adaptation; original Renovate configuration only |
| PostHog | Mixed root; not enabled, privacy default |
| next-intl / next-sitemap | MIT; installed stable packages, original bilingual/SEO integration |
| Coolify / pgBackRest | Apache-2.0 / MIT; operation runbooks, not deployed tools |
| Pino / BullMQ / rate-limit references | MIT; normal dependencies/equivalent controls, original application logic |
| React Email reference | Mixed root; exact installed package licenses retained, original templates |
| Playwright | Apache-2.0; installed stable test dependency, isolated existing Edge |
| Drizzle / PGlite | Apache-2.0; actual SQL integration/test dependency, no vendoring |
| better-auth / Mosquitto | MIT / BSD-like terms needing review; references, no copied auth/broker code |
| Mapviewer / India boundaries / Leaflet | MIT / Apache-2.0 / BSD-2; reference viewer, unpublished raw data, installed vector library/notices |
| Razorpay / dashboard templates / Jenkins-PlatformIO | MIT references/packages; no sample cards/business data/template code copied |
| Python/Node/container dependencies | Installed notices and recorded metadata; external PostgreSQL/Redis licenses retained, image distribution/runtime review remains manual |

Primary references include official Firebase/Next/next-intl/Drizzle/scikit-learn/Razorpay/Playwright/Leaflet docs, npm/PyPI/official image registries, pinned GitHub action releases and MeitY Gazette PDFs. Legal PDFs were checked for phased commencement; full consolidated-law/amendment review remains counsel work. No legal/scientific source is treated as deployment or compliance approval.
''')
pages.append('''# Pre-launch checklist for the owner

1. [ ] Credentials/accounts: choose the intended isolated project, least privilege, independent rotated secrets and guarded first-admin/site assignment. No default account/password.
2. [ ] Firebase: verify actual device UID/claims/rules and approved private exports; validate migration/import carefully, back up and preserve legacy data before any authorized cutover.
3. [ ] Hardware: calibrate sensors, verify safe wiring/protection/reconnect/buffering, relay output/contact feedback and actual private camera inputs. Never infer physical state from an acknowledgement.
4. [ ] Storage/recovery: run actual PostgreSQL/Redis and migrations, concurrency/shared limits/dead letters, encrypted backups and a new isolated restore/rollback drill. Approve retention/recovery objectives.
5. [ ] Messaging: configure reviewed TLS SMTP/recipients, verify OTP/outbox transport and failure behavior, then separately authorize any real delivery.
6. [ ] Map: obtain current authoritative/licensed web-sized geometry, rights/India publication review, actual property schema/hash/attribution and exact site assignment. Follow MAP_DATA.md.
7. [ ] AI: provide reviewed calibrated readings/labels, assess held-out performance/baselines/drift and trusted artifacts, then approve schedules/publication. Future forecasting needs suitable weather/targets.
8. [ ] Commerce: provide actual reviewed plans/prices/test credentials; verify provider Checkout/signatures/webhook replay/refunds and legal/tax facts. Keep live/GST guards; future live support is a separate reviewed change.
9. [ ] Publication/review: obtain owner/counsel/fluent/AT review of business/scientific/people/public-asset claims, current privacy/refund/retention/age/rights processes, Hindi PDF/mail and full accessibility/performance. Keep indexing off.
10. [ ] Release: separately authorize hosted CI/container/Coolify/HTTPS/DNS/certificate and monitoring activation; verify recorded source/image digests, incident routing and actual recovery behavior.

## Where to continue

Read MANUAL_STEPS.md for exact owners/actions, RELEASE_OPERATIONS.md for settings/scopes/health/backup/rollback, KNOWN_ISSUES.md for current risks/candidates, COVERAGE_SUMMARY.md for exercised behavior and PROGRESS.md for the latest checkpoint. The final report is FINAL_REPORT.md; complete provenance is SOURCES.md.

There is no remaining independent authorized local implementation step after the report/artifact checks are committed. External activation stays with the named owners. The code/evidence tag and the later artifact commit are deliberately separate so hashes and test claims remain reviewable.
''')

assert len(pages)==10
source='\n\n<!-- pagebreak -->\n\n'.join(page.strip() for page in pages)+'\n'
assert source.isascii(),'Keep this English report free of unsupported base-font glyphs'
md=ROOT/'docs/COMPLETION_SUMMARY.md';pdf=ROOT/'docs/Voltarax_Completion_Summary.pdf'
md.write_text(source,encoding='utf-8')

GREEN=colors.HexColor('#166534');INK=colors.HexColor('#172b25');MUTED=colors.HexColor('#43564c')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='ReportBody',fontName='Helvetica',fontSize=9.3,leading=12.8,textColor=INK,spaceAfter=7,splitLongWords=1))
styles.add(ParagraphStyle(name='ReportH1',fontName='Helvetica-Bold',fontSize=21,leading=25,textColor=GREEN,spaceAfter=14,keepWithNext=True))
styles.add(ParagraphStyle(name='ReportH2',fontName='Helvetica-Bold',fontSize=12.5,leading=16,textColor=GREEN,spaceBefore=8,spaceAfter=7,keepWithNext=True))
styles.add(ParagraphStyle(name='ReportCell',fontName='Helvetica',fontSize=8.25,leading=10.7,textColor=INK,splitLongWords=1))
styles.add(ParagraphStyle(name='ReportTableHead',parent=styles['ReportCell'],fontName='Helvetica-Bold',textColor=colors.white))
styles.add(ParagraphStyle(name='ReportCover',fontName='Helvetica-Bold',fontSize=38,leading=43,textColor=GREEN,spaceAfter=17))
def inline(text):
    text=html.escape(text)
    text=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',text)
    text=re.sub(r'`([^`]+)`',r'<font name="Courier" size="8">\1</font>',text)
    return text
width,height=A4;margin=16*mm;usable=width-2*margin
story=[]
for page_index,page in enumerate(pages):
    if page_index:story.append(PageBreak())
    else:story.append(Spacer(1,15*mm))
    lines=page.strip().splitlines();index=0
    while index<len(lines):
        line=lines[index].strip()
        if not line:index+=1;continue
        if line.startswith('|'):
            rows=[]
            while index<len(lines) and lines[index].strip().startswith('|'):
                cells=[cell.strip() for cell in lines[index].strip().strip('|').split('|')]
                if not all(re.fullmatch(r'[-: ]+',cell) for cell in cells):rows.append(cells)
                index+=1
            count=len(rows[0]);assert all(len(row)==count for row in rows)
            if count==2:ratios=[.43,.57] if page_index!=0 else [.75,.25]
            else:ratios=[.23,.35,.42] if page_index==6 else [.32,.31,.37]
            data=[[Paragraph(inline(cell),styles['ReportTableHead' if row_index==0 else 'ReportCell']) for cell in row] for row_index,row in enumerate(rows)]
            table=Table(data,colWidths=[usable*ratio for ratio in ratios],repeatRows=1,hAlign='LEFT')
            table.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),GREEN),('VALIGN',(0,0),(-1,-1),'TOP'),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.HexColor('#f0f6f2'),colors.white]),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),('LINEBELOW',(0,0),(-1,0),.6,GREEN),('LINEBELOW',(0,1),(-1,-1),.25,colors.HexColor('#d8e3dc'))]))
            story.extend([table,Spacer(1,9)]);continue
        if line.startswith('# '):
            story.append(Paragraph(inline(line[2:]),styles['ReportCover' if page_index==0 else 'ReportH1']));index+=1;continue
        if line.startswith('## '):
            story.append(Paragraph(inline(line[3:]),styles['ReportH2']));index+=1;continue
        block=[line];index+=1
        while index<len(lines) and lines[index].strip() and not lines[index].lstrip().startswith(('#','|','- ')) and not re.match(r'\d+\. ',lines[index].strip()):block.append(lines[index].strip());index+=1
        story.append(Paragraph(inline(' '.join(block)),styles['ReportBody']))

def decorate(canvas,doc):
    canvas.saveState();canvas.setStrokeColor(GREEN);canvas.setLineWidth(1.1);canvas.line(margin,height-10*mm,width-margin,height-10*mm)
    canvas.setFont('Helvetica',7.5);canvas.setFillColor(MUTED);canvas.drawString(margin,9*mm,'VOLTARAX | Local evidence / external activation partial | 2 Nov 2026 IST');canvas.drawRightString(width-margin,9*mm,str(doc.page));canvas.restoreState()
doc=SimpleDocTemplate(str(pdf),pagesize=A4,rightMargin=margin,leftMargin=margin,topMargin=17*mm,bottomMargin=16*mm,title='Voltarax Completion Summary - local evidence',author='Voltarax project workspace')
doc.build(story,onFirstPage=decorate,onLaterPages=decorate)
reader=PdfReader(pdf);texts=[page.extract_text() or '' for page in reader.pages]
expected=['VOLTARAX','Executive summary','What was done: phases 1-3','What was done: phases 4-7','What was done: phases 8-10','What was not done','Verification: exactly','Known issues','Assumptions, provenance','Pre-launch checklist']
assert len(texts)==10,f'Expected 10 pages, got {len(texts)}; inspect before delivery'
assert all(title in text for title,text in zip(expected,texts)), 'A required section is empty/misplaced'
assert candidate in '\n'.join(texts),'Candidate hash was not rendered'
proof={'file':'docs/Voltarax_Completion_Summary.pdf','pages':len(texts),'expected_pages':10,'text_sections_present':True,'candidate_commit':candidate,'tested_code_commit':gate['tested_code_commit'],'application_tree':gate['application_tree'],'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'visual_review':'Pending render inspection; creation is not visual proof'}
(RESULTS/'phase10-pdf-create.json').write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8')
print(json.dumps(proof))
