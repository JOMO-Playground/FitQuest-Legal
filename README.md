# FitQuest public website

This public repository is the deployable owner for:

- the FitQuest product and release website;
- Privacy, Terms, Support, deletion, and password-recovery routes;
- the signed-in **My Quest** read-only backup portal.

## Live GitHub preview

GitHub Pages publishes the exact checked-in static site from `main` at:

`https://jomo-playground.github.io/FitQuest-Legal/`

`runtime-config.js` contains only the browser-safe Supabase project URL and
publishable key. It is checked in so the portal remains deployable through
branch-based Pages even when hosted Actions runners are unavailable. Supabase
Row Level Security remains the authorization boundary.

The optional artifact workflow can generate the same file during deployment
from:

- repository variable `FITQUEST_SUPABASE_URL`;
- repository secret `FITQUEST_SUPABASE_ANON_KEY`.

No secret key or service-role key belongs in a browser or GitHub Pages
workflow.

## Local preview

The checked-in browser-safe `runtime-config.js` works locally. For another
Supabase project, copy `runtime-config.example.js` and substitute that project's
publishable configuration, then run:

```powershell
python -m http.server 4173
```

Open `http://127.0.0.1:4173/`. Run `node scripts/verify-site.mjs` before pushing.

The portal is read-only. Device restoration remains owned by the Android app.
