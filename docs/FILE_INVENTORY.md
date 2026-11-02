# Baseline source inventory (Phase 1)

Historical Phase 1 inventory, retained as review evidence. These line counts/statuses describe that checkpoint, not the expanded Phase 10 tree. Listed source text was reviewed in chunks; later changes/new modules are recorded in Git, PROGRESS.md, COVERAGE_SUMMARY.md and FINAL_REPORT.md. Dependency directories, generated artifacts, lockfiles and binary reference PDF were excluded. Do not treat these baseline counts as current line coverage or a claim that every third-party reference repository was read line by line.

| Path under voltarax-web | Lines | Purpose | Review status |
| --- | ---: | --- | --- |
| `ai-engine/.env.example` | 17 | Python analytics, configuration or test | Fully read; modified since review where applicable |
| `ai-engine/config.py` | 44 | Python analytics, configuration or test | Fully read |
| `ai-engine/data/__init__.py` | 0 | Python analytics, configuration or test | Fully read |
| `ai-engine/data/features.py` | 62 | Python analytics, configuration or test | Fully read |
| `ai-engine/data/ingest.py` | 130 | Python analytics, configuration or test | Fully read; modified since review where applicable |
| `ai-engine/data/schema.py` | 62 | Python analytics, configuration or test | Fully read |
| `ai-engine/models/__init__.py` | 0 | Python analytics, configuration or test | Fully read |
| `ai-engine/models/anomaly/__init__.py` | 0 | Python analytics, configuration or test | Fully read |
| `ai-engine/models/anomaly/isolation_forest_detector.py` | 49 | Python analytics, configuration or test | Fully read |
| `ai-engine/models/base.py` | 58 | Python analytics, configuration or test | Fully read |
| `ai-engine/models/forecast/__init__.py` | 0 | Python analytics, configuration or test | Fully read |
| `ai-engine/models/forecast/gradient_boosting_forecaster.py` | 76 | Python analytics, configuration or test | Fully read |
| `ai-engine/models/health/__init__.py` | 0 | Python analytics, configuration or test | Fully read |
| `ai-engine/models/health/performance_ratio_model.py` | 69 | Python analytics, configuration or test | Fully read |
| `ai-engine/pipeline/__init__.py` | 0 | Python analytics, configuration or test | Fully read |
| `ai-engine/pipeline/orchestrator.py` | 118 | Python analytics, configuration or test | Fully read |
| `ai-engine/pipeline/publish.py` | 35 | Python analytics, configuration or test | Fully read |
| `ai-engine/pipeline/readiness.py` | 38 | Python analytics, configuration or test | Fully read |
| `ai-engine/README.md` | 145 | Python analytics, configuration or test | Fully read |
| `ai-engine/requirements.txt` | 9 | Python analytics, configuration or test | Fully read; modified since review where applicable |
| `ai-engine/scripts/run_once.py` | 43 | Python analytics, configuration or test | Fully read |
| `ai-engine/scripts/schedule_cron.md` | 74 | Python analytics, configuration or test | Fully read |
| `ai-engine/tests/test_pipeline_synthetic.py` | 216 | Python analytics, configuration or test | Fully read; modified since review where applicable |
| `backend/.env.example` | 73 | Backend configuration, model or support | Fully read; modified since review where applicable |
| `backend/config/db.js` | 10 | Backend configuration, model or support | Fully read |
| `backend/config/firebase.js` | 63 | Backend configuration, model or support | Fully read |
| `backend/data/publicKnowledge.js` | 39 | Backend configuration, model or support | Fully read |
| `backend/middleware/auth.js` | 46 | Backend configuration, model or support | Fully read; modified since review where applicable |
| `backend/models/Content.js` | 8 | Backend configuration, model or support | Fully read |
| `backend/models/SolarAnalysis.js` | 23 | Backend configuration, model or support | Fully read; modified since review where applicable |
| `backend/models/SolarTelemetry.js` | 2 | Backend configuration, model or support | Fully read |
| `backend/models/User.js` | 79 | Backend configuration, model or support | Fully read; modified since review where applicable |
| `backend/package.json` | 28 | Backend configuration, model or support | Fully read |
| `backend/README-FIREBASE.md` | 80 | Backend configuration, model or support | Fully read |
| `backend/routes/auth.js` | 84 | Express API route | Fully read; modified since review where applicable |
| `backend/routes/chat.js` | 20 | Express API route | Fully read |
| `backend/routes/content.js` | 141 | Express API route | Fully read |
| `backend/routes/telemetry.js` | 97 | Express API route | Fully read; modified since review where applicable |
| `backend/routes/voltvision.js` | 127 | Express API route | Fully read; modified since review where applicable |
| `backend/scripts/seed.js` | 48 | Backend configuration, model or support | Fully read |
| `backend/server.js` | 90 | Backend configuration, model or support | Fully read |
| `backend/services/aiPredictions.js` | 34 | Backend data or analysis service | Fully read |
| `backend/services/dashboardData.js` | 66 | Backend data or analysis service | Fully read; modified since review where applicable |
| `backend/services/energy.js` | 28 | Backend data or analysis service | Fully read |
| `backend/services/firebaseModel.js` | 138 | Backend data or analysis service | Fully read; modified since review where applicable |
| `backend/services/solarAnalytics.js` | 89 | Backend data or analysis service | Fully read |
| `backend/services/telemetryWatcher.js` | 56 | Backend data or analysis service | Fully read |
| `backend/tests/authorization.test.js` | 34 | Backend automated test | Fully read |
| `backend/tests/energy.test.js` | 19 | Backend automated test | Fully read |
| `backend/tests/firebase-query.test.js` | 20 | Backend automated test | Fully read |
| `CHANGES.md` | 144 | Project configuration or documentation | Fully read |
| `firebase-emulator.json` | 8 | Project configuration or documentation | Fully read; modified since review where applicable |
| `firebase.json` | 5 | Project configuration or documentation | Fully read; modified since review where applicable |
| `firebase.rules.json` | 32 | Project configuration or documentation | Fully read; modified since review where applicable |
| `frontend/.env.local.example` | 11 | Project configuration or documentation | Fully read; modified since review where applicable |
| `frontend/.eslintrc.json` | 10 | Project configuration or documentation | Fully read |
| `frontend/app/about/page.tsx` | 219 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/contact/page.tsx` | 204 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/dashboard/alerts/page.tsx` | 137 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/dashboard/bfci/page.tsx` | 158 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/dashboard/carbon/page.tsx` | 130 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/dashboard/cv/page.tsx` | 129 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/dashboard/error.tsx` | 31 | Frontend page, layout or style | Fully read |
| `frontend/app/dashboard/forecast/page.tsx` | 104 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/dashboard/layout.tsx` | 143 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/dashboard/loading.tsx` | 16 | Frontend page, layout or style | Fully read |
| `frontend/app/dashboard/page.tsx` | 35 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/dashboard/panels/page.tsx` | 222 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/dashboard/relay/page.tsx` | 146 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/dashboard/settings/page.tsx` | 115 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/dashboard/users/page.tsx` | 124 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/dashboard/work-orders/page.tsx` | 146 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/globals.css` | 285 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/layout.tsx` | 74 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/login/page.tsx` | 140 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/page.tsx` | 26 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/products/page.tsx` | 51 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/sustainability/page.tsx` | 199 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/app/technology/page.tsx` | 54 | Frontend page, layout or style | Fully read; modified since review where applicable |
| `frontend/components/chat/ChatWidget.tsx` | 124 | Reusable frontend component | Fully read; modified since review where applicable |
| `frontend/components/landing/HeroSection.tsx` | 103 | Reusable frontend component | Fully read; modified since review where applicable |
| `frontend/components/landing/LandingSections.tsx` | 219 | Reusable frontend component | Fully read; modified since review where applicable |
| `frontend/components/landing/WindTurbineBackdrop.tsx` | 31 | Reusable frontend component | Fully read; modified since review where applicable |
| `frontend/components/ui/AvatarImage.tsx` | 46 | Reusable frontend component | Fully read; modified since review where applicable |
| `frontend/components/ui/CustomCursor.tsx` | 79 | Reusable frontend component | Fully read; modified since review where applicable |
| `frontend/components/ui/Footer.tsx` | 117 | Reusable frontend component | Fully read; modified since review where applicable |
| `frontend/components/ui/LogoBadge.tsx` | 31 | Reusable frontend component | Fully read; modified since review where applicable |
| `frontend/components/ui/Navbar.tsx` | 126 | Reusable frontend component | Fully read; modified since review where applicable |
| `frontend/components/ui/ParticlesBg.tsx` | 97 | Reusable frontend component | Fully read; modified since review where applicable |
| `frontend/components/ui/SiteBackgroundVideo.tsx` | 47 | Reusable frontend component | Fully read; modified since review where applicable |
| `frontend/next-env.d.ts` | 5 | Project configuration or documentation | Fully read |
| `frontend/next.config.js` | 20 | Project configuration or documentation | Fully read; modified since review where applicable |
| `frontend/package.json` | 37 | Project configuration or documentation | Fully read; modified since review where applicable |
| `frontend/postcss.config.js` | 6 | Project configuration or documentation | Fully read; modified since review where applicable |
| `frontend/public/clients/README.md` | 8 | Project configuration or documentation | Fully read |
| `frontend/public/media/README.md` | 11 | Project configuration or documentation | Fully read |
| `frontend/public/partners/README.md` | 6 | Project configuration or documentation | Fully read |
| `frontend/public/team/README.md` | 12 | Project configuration or documentation | Fully read |
| `frontend/tailwind.config.js` | 79 | Project configuration or documentation | Fully read; modified since review where applicable |
| `frontend/tsconfig.json` | 21 | Project configuration or documentation | Fully read; modified since review where applicable |
| `hardware/esp32-cam/README.md` | 16 | Hardware firmware, support or documentation | Fully read |
| `hardware/nodemcu/README.md` | 37 | Hardware firmware, support or documentation | Fully read |
| `hardware/nodemcu/secrets.example.h` | 8 | Hardware firmware, support or documentation | Fully read |
| `hardware/nodemcu/solar_monitor.ino` | 160 | Hardware firmware, support or documentation | Fully read; modified since review where applicable |
| `hardware/raspberry-pi/analysis.py` | 53 | Hardware firmware, support or documentation | Fully read; modified since review where applicable |
| `hardware/raspberry-pi/dashboard.py` | 80 | Hardware firmware, support or documentation | Fully read; modified since review where applicable |
| `hardware/raspberry-pi/requirements.txt` | 3 | Hardware firmware, support or documentation | Fully read; modified since review where applicable |
| `hardware/README.md` | 83 | Hardware firmware, support or documentation | Fully read |
| `hardware/test-ingest.ps1` | 25 | Hardware firmware, support or documentation | Fully read; modified since review where applicable |
| `package.json` | 15 | Project configuration or documentation | Fully read |
| `README.md` | 108 | Project configuration or documentation | Fully read |
| `backend/tests/solar-analytics.test.js` | 12 | Backend automated test | Fully read |
| `backend/tests/ai-freshness.test.js` | 17 | Backend automated test | Fully read |
