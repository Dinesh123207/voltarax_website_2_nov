"""Bind the completed required Phase 11 local gate to saved, current evidence."""
import json
from pathlib import Path
import re
import subprocess

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/test-results'
read=lambda name:json.loads((OUT/name).read_text(encoding='utf-8'))
names={
 'backend':'phase11-gate-backend','ai':'phase11-gate-ai','build':'phase11-release-build',
 'lint':'phase11-gate-lint-reviewed','source_types':'phase11-manual-review-types','generated_types':'phase11-release-types',
 'web':'phase11-release-web','api':'phase11-release-api','rules':'phase11-gate-rules',
 'native':'phase11-gate-native','firmware':'phase11-gate-firmware','audit':'phase11-gate-audit',
 'packaging':'phase11-gate-packaging','secrets':'phase11-gate-secrets',
 'latest_shared_regressions':'phase11-final-shared-regressions-reviewed'}
checks={name:read(label+'.json') for name,label in names.items()}
assert all(value['exit_code']==0 for value in checks.values()),'A required check failed'
assert re.search(r'(?:ℹ |# )tests\s+88\b',(OUT/'phase11-gate-backend.log').read_text(encoding='utf-8'))
assert '28 passed' in (OUT/'phase11-gate-ai.log').read_text(encoding='utf-8')
browser={name:read(label+'-browser.json')['stats'] for name,label in [('web','phase11-release-web'),('api','phase11-release-api')]}
assert browser['web']['expected']==10 and browser['api']['expected']==4
assert all(value[key]==0 for value in browser.values() for key in ['skipped','unexpected','flaky'])
matrix=read('phase11-release-web-browser-screen-state-matrix.json')
assert len(matrix['measurements'])==15
assert all(row[key] is True for row in matrix['measurements'] for key in ['loading','empty','offline','error'])
axe_files=sorted(OUT.glob('phase11-release-web-browser-axe-*.json'))
axe_reports=[json.loads(path.read_text(encoding='utf-8')) for path in axe_files]
assert len(axe_reports)==18 and all(report['version']=='4.14.0' for report in axe_reports)
assert all(not report['violations'] for report in axe_reports),'An axe violation remains'
axe={'version':'4.14.0','scans':len(axe_reports),'violations':0,
     'incomplete_findings':sum(len(report['incomplete']) for report in axe_reports),
     'incomplete_rules':sorted({issue['id'] for report in axe_reports for issue in report['incomplete']}),
     'reports':[path.relative_to(ROOT).as_posix() for path in axe_files],
     'scope':'Synthetic 360px owned-browser contexts; automated scan, not WCAG/Lighthouse/legal certification'}
audits={service:read(service+'-production-audit-current.json')['metadata']['vulnerabilities'] for service in ['frontend','backend']}
assert all(not audit['high'] and not audit['critical'] for audit in audits.values())
assert read('phase11-compose.json')['exit_code']==0 and read('phase11-ci-syntax.json')['parsed']
contrast=read('phase11-contrast.json');assert contrast['minimum']>=contrast['threshold']
scan=read('secret-scan-history.json');assert not scan['findings']
git=lambda *args:subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
assert git('branch','--show-current')=='phase-11-gaps'
assert not git('diff','HEAD','--name-only','--','voltarax-web'),'Commit tested product source first'
summary={'phase':11,'status':'Required local gates passed; external activation Partial; optional nonce CSP Skipped',
 'local_checks_passed':True,'tested_code_commit':git('rev-parse','HEAD'),'application_tree':git('rev-parse','HEAD:voltarax-web'),
 'branch':'phase-11-gaps','counts':{'backend':88,'ai':28,'public_ui_browser':10,'actual_api_browser':4,'rules':1,'native':4,'data_screens':15},
 'checks':checks,'browser':browser,'axe':axe,'contrast':contrast,'production_audits':audits,
 'scan':scan,'matrix':matrix,'original_media':read('phase11-media-budget.json'),
 'optional_csp':'Skipped: current static rendering/cache, Next boot scripts, Framer/React style attributes and Checkout need a coordinated nonce/style change; inline allowances remain',
 'not_verified':['Actual Ollama model/server','Real SMTP/Firebase UID/rules/migration','PostgreSQL/Redis servers/queue/backup restoration','Physical hardware/camera/relay','Calibrated real-data AI/weather forecasting','Approved web-sized map/actual locations','Razorpay-hosted TEST provider and business/legal/tax inputs','Actual containers/hosted CI/hosting/TLS/monitoring','Independent fluent Hindi/assistive-technology review'],
 'notes':['Earlier failed attempts retained; only named final checks pass','Full backend suite 88 plus latest 10 shared clock/data/localization regressions; no unrelated full-suite repetition after UI-only fixes','Existing locked installs, not a fresh reinstall','No instrumented coverage percentage','No push/deployment/real message/live payment/user-data migration/deletion/flash']}
(OUT/'phase11-gate-summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'phase':11,'local_checks_passed':True,'counts':summary['counts'],'axe':{key:axe[key] for key in ['scans','violations','incomplete_findings']},'code_commit':summary['tested_code_commit']}))
