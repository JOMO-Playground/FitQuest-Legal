(function () {
  'use strict';

  var config = window.FITQUEST_CONFIG || {};
  var authPanel = document.getElementById('auth-panel');
  var portal = document.getElementById('portal');
  var authForm = document.getElementById('auth-form');
  var authStatus = document.getElementById('auth-status');
  var portalStatus = document.getElementById('portal-status');
  var signInTab = document.getElementById('sign-in-tab');
  var signUpTab = document.getElementById('sign-up-tab');
  var authTitle = document.getElementById('auth-title');
  var authCopy = document.getElementById('auth-copy');
  var authSubmit = document.getElementById('auth-submit');
  var password = document.getElementById('password');
  var mode = 'sign-in';
  var client = null;
  var latestBackup = null;
  var latestEnvelope = null;

  function setStatus(element, message, isError) {
    element.textContent = message || '';
    element.classList.toggle('error', Boolean(isError));
  }

  function setMode(nextMode) {
    mode = nextMode;
    var signingUp = mode === 'sign-up';
    signInTab.classList.toggle('active', !signingUp);
    signUpTab.classList.toggle('active', signingUp);
    signInTab.setAttribute('aria-selected', String(!signingUp));
    signUpTab.setAttribute('aria-selected', String(signingUp));
    authTitle.textContent = signingUp ? 'Create your FitQuest account.' : 'Sign in securely.';
    authCopy.textContent = signingUp
      ? 'One account can reconnect future devices to private recovery snapshots.'
      : 'Use the same email and password as the FitQuest Android app.';
    authSubmit.textContent = signingUp ? 'Create account' : 'Sign in';
    password.autocomplete = signingUp ? 'new-password' : 'current-password';
    document.getElementById('forgot-password').hidden = signingUp;
    setStatus(authStatus, '');
  }

  function formatNumber(value) {
    return new Intl.NumberFormat().format(Math.max(0, Math.round(value || 0)));
  }

  function safeDate(value) {
    if (!value) return 'Unknown time';
    var date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Unknown time'
      : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }

  function calculateLevel(entries) {
    var unique = new Set();
    var totalXp = 0;
    (entries || []).forEach(function (entry) {
      var key = String(entry.evidence_kind) + ':' + String(entry.evidence_id);
      if (unique.has(key)) return;
      unique.add(key);
      totalXp += Math.max(0, Math.floor(Number(entry.xp) || 0));
    });
    var level = 1;
    var within = totalXp;
    var required = 200;
    while (within >= required) {
      within -= required;
      level += 1;
      required = 200 + (level - 1) * 50;
    }
    return { level: level, totalXp: totalXp, within: within, required: required };
  }

  function renderSnapshot(envelope, backups) {
    var data = envelope.data || {};
    var profile = data.profile || {};
    var workouts = (data.workout_sessions || []).filter(function (item) {
      return Boolean(item.completed_at) && !item.abandoned_at;
    });
    var steps = (data.daily_steps || []).reduce(function (total, item) {
      return total + Math.max(0, Number(item.steps) || 0);
    }, 0);
    var workoutMinutes = workouts.reduce(function (total, item) {
      return total + Math.max(0, Number(item.duration_seconds) || 0) / 60;
    }, 0);
    var goals = (data.goals || []).filter(function (item) { return Number(item.completed) !== 1; });
    var progression = calculateLevel(data.xp_ledger || []);
    var quests = (data.scheduled_quests || [])
      .filter(function (item) { return item.status === 'planned'; })
      .sort(function (a, b) {
        return String(a.scheduled_date || '').localeCompare(String(b.scheduled_date || ''));
      });
    var nextQuest = quests[0];
    var percent = progression.required > 0
      ? Math.min(100, Math.max(0, progression.within / progression.required * 100))
      : 0;

    document.getElementById('athlete-name').textContent = profile.display_name || 'Athlete';
    document.getElementById('snapshot-time').textContent = 'Snapshot protected ' + safeDate(envelope.created_at || envelope.exported_at);
    document.getElementById('metric-level').textContent = String(progression.level);
    document.getElementById('level-title').textContent = progression.level >= 10
      ? 'Proven momentum'
      : progression.level >= 5
        ? 'Building capability'
        : 'Foundation';
    document.getElementById('level-detail').textContent = profile.fitness_level
      ? 'Training profile: ' + String(profile.fitness_level).replace(/_/g, ' ') + '.'
      : 'Your completed evidence shapes the next prescription.';
    document.getElementById('level-progress').style.transform = 'scaleX(' + (percent / 100) + ')';
    document.getElementById('level-xp').textContent =
      formatNumber(progression.totalXp) + ' XP · ' + formatNumber(progression.required - progression.within) + ' to next level';
    document.getElementById('metric-workouts').textContent = formatNumber(workouts.length);
    document.getElementById('metric-training-time').textContent = formatNumber(workoutMinutes) + ' training minutes';
    document.getElementById('metric-steps').textContent = formatNumber(steps);
    document.getElementById('metric-goals').textContent = formatNumber(goals.length);
    document.getElementById('metric-goal-detail').textContent = goals[0]
      ? goals[0].title + ': ' + formatNumber(goals[0].current_value) + ' / ' + formatNumber(goals[0].target_value) + ' ' + (goals[0].unit || '')
      : 'No active goal in this snapshot';
    document.getElementById('metric-streak').textContent = formatNumber((data.streak || {}).current_streak);
    document.getElementById('next-quest-title').textContent = nextQuest
      ? nextQuest.routine_name || 'Planned quest'
      : 'No planned quest found';
    document.getElementById('next-quest-detail').textContent = nextQuest
      ? 'Scheduled for ' + safeDate(nextQuest.scheduled_date) + '. Open the Android app to review readiness and start.'
      : 'Generate or schedule your next workout in the Android app.';
    document.getElementById('backup-count').textContent =
      backups.length + (backups.length === 1 ? ' private snapshot' : ' private snapshots');
    document.getElementById('backup-detail').textContent =
      'Newest file: ' + latestBackup.name + '. The website is read-only.';
    document.getElementById('download-backup').disabled = false;
  }

  async function loadBackups(user) {
    latestBackup = null;
    latestEnvelope = null;
    setStatus(portalStatus, 'Reading your private recovery index…');
    var listed = await client.storage.from('backups').list(user.id, {
      limit: 20,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (listed.error) {
      setStatus(
        portalStatus,
        'Cloud recovery is not active for this release yet. Your app account is still available.',
        false,
      );
      document.getElementById('snapshot-time').textContent = 'No verified cloud snapshot is available.';
      return;
    }
    var backups = (listed.data || []).filter(function (item) { return /\.json$/i.test(item.name); });
    if (backups.length === 0) {
      setStatus(portalStatus, 'No cloud backup exists for this account yet.');
      document.getElementById('snapshot-time').textContent = 'Sign in to the Android app and open Backups to create the first snapshot.';
      return;
    }

    latestBackup = backups[0];
    var downloaded = await client.storage.from('backups').download(user.id + '/' + latestBackup.name);
    if (downloaded.error) {
      setStatus(portalStatus, 'The latest snapshot could not be read. Nothing was changed.', true);
      return;
    }
    try {
      var parsed = JSON.parse(await downloaded.data.text());
      if (
        !parsed
        || parsed.version !== 22
        || parsed.user_id !== user.id
        || !parsed.data
        || typeof parsed.data !== 'object'
      ) {
        throw new Error('Unsupported backup envelope');
      }
      latestEnvelope = parsed;
      renderSnapshot(parsed, backups);
      setStatus(portalStatus, 'Private snapshot loaded. This page made no changes to it.');
    } catch (_error) {
      setStatus(portalStatus, 'The latest snapshot format is invalid or unsupported.', true);
    }
  }

  async function showSession(session) {
    var signedIn = Boolean(session && session.user);
    authPanel.hidden = signedIn;
    portal.hidden = !signedIn;
    if (signedIn) await loadBackups(session.user);
  }

  async function initialize() {
    if (
      !config.supabaseUrl
      || !config.supabaseAnonKey
      || !window.supabase
      || typeof window.supabase.createClient !== 'function'
    ) {
      authForm.querySelectorAll('input,button').forEach(function (element) { element.disabled = true; });
      setStatus(authStatus, 'The account portal is being connected. Use the Android app for account access for now.', true);
      return;
    }

    client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    var result = await client.auth.getSession();
    if (result.error) setStatus(authStatus, result.error.message, true);
    await showSession(result.data && result.data.session);
    client.auth.onAuthStateChange(function (_event, session) {
      window.setTimeout(function () { void showSession(session); }, 0);
    });
  }

  signInTab.addEventListener('click', function () { setMode('sign-in'); });
  signUpTab.addEventListener('click', function () { setMode('sign-up'); });
  authForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (!client) return;
    var email = String(document.getElementById('email').value || '').trim();
    var secret = String(password.value || '');
    if (!email || secret.length < 8) {
      setStatus(authStatus, 'Enter a valid email and a password of at least 8 characters.', true);
      return;
    }
    authSubmit.disabled = true;
    setStatus(authStatus, mode === 'sign-up' ? 'Creating your account…' : 'Signing in…');
    var result = mode === 'sign-up'
      ? await client.auth.signUp({
        email: email,
        password: secret,
        options: { emailRedirectTo: window.location.origin + window.location.pathname },
      })
      : await client.auth.signInWithPassword({ email: email, password: secret });
    authSubmit.disabled = false;
    if (result.error) {
      setStatus(authStatus, result.error.message, true);
      return;
    }
    if (mode === 'sign-up' && !result.data.session) {
      setStatus(authStatus, 'Check your email to confirm the account, then return here to sign in.');
    }
  });

  document.getElementById('forgot-password').addEventListener('click', async function () {
    if (!client) return;
    var email = String(document.getElementById('email').value || '').trim();
    if (!email) {
      setStatus(authStatus, 'Enter your email first, then request the recovery link.', true);
      return;
    }
    var result = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname.replace(/account\.html$/, 'auth-reset.html'),
    });
    setStatus(
      authStatus,
      result.error ? result.error.message : 'Recovery email requested. Use only the newest link.',
      Boolean(result.error),
    );
  });

  document.getElementById('sign-out').addEventListener('click', async function () {
    if (!client) return;
    await client.auth.signOut();
    latestBackup = null;
    latestEnvelope = null;
    setStatus(portalStatus, '');
  });

  document.getElementById('download-backup').addEventListener('click', function () {
    if (!latestBackup || !latestEnvelope) return;
    var blob = new Blob([JSON.stringify(latestEnvelope, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = latestBackup.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  });

  setMode('sign-in');
  void initialize();
}());
