# FitQuest public website

This public repository is the deployable owner for:

- the FitQuest product and release website;
- Privacy, Terms, Support, deletion, and password-recovery routes;
- the signed-in **My Quest** read-only backup portal.

## Live GitHub preview

Every push to `main` runs `.github/workflows/deploy-pages.yml` and publishes the
exact checked-in static site to:

`https://jomo-playground.github.io/FitQuest-Legal/`

The workflow generates `runtime-config.js` during deployment from:

- repository variable `FITQUEST_SUPABASE_URL`;
- repository secret `FITQUEST_SUPABASE_ANON_KEY`.

The generated runtime file is ignored and must never be committed. No
service-role key belongs in a browser or GitHub Pages workflow.

## Local preview

Create an ignored `runtime-config.js` from `runtime-config.example.js`, then run:

```powershell
python -m http.server 4173
```

Open `http://127.0.0.1:4173/`. Run `node scripts/verify-site.mjs` before pushing.

The portal is read-only. Device restoration remains owned by the Android app.
