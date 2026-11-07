// The rules below mirror CleanEnvironment and the CleanRule types in Sources/CleanerCore.
// shortcut: this only reads the path, not file dates or running apps, so age and open-app rules are stated as conditions. Change it when those rules change.
const NEVER_HOME = [
  ['Documents', 'Documents'], ['Desktop', 'the Desktop'], ['Downloads', 'Downloads'], ['Pictures', 'Pictures and your Photos library'],
  ['Movies', 'Movies'], ['Music', 'Music'], ['Library/Mail', 'Mail'], ['Library/Messages', 'Messages'],
  ['Library/Mobile Documents', 'iCloud Drive'], ['Library/Keychains', 'your keychains'], ['Library/Safari', 'Safari'],
  ['Library/Containers', 'app containers'], ['Library/Group Containers', 'app containers'],
  ['Library/Application Support/Google/Chrome', 'your Chrome profile'], ['Library/Application Support/Firefox', 'your Firefox profile'],
  ['Library/Application Support/BraveSoftware', 'your Brave profile'], ['Library/Application Support/Microsoft Edge', 'your Edge profile'],
  ['Library/Application Support/Arc', 'your Arc profile'], ['Library/Application Support/com.operasoftware.Opera', 'your Opera profile'],
  ['Library/Application Support/com.operasoftware.OperaGX', 'your Opera GX profile'],
];
const WEEKLY = ['.npm/_cacache', 'Library/Caches/Yarn', 'Library/pnpm/store', 'Library/Caches/pip', 'Library/Caches/Homebrew'];
const SKIPPED_CACHES = ['CloudKit', 'GeoServices', 'PassKit', 'FamilyCircle', 'SiriEntityCache', 'GameKit', 'Animoji', 'Cypress', 'electron', 'puppeteer', 'org.webkit.Playwright'];
const LEFTOVER_ROOTS = ['Library/Application Support', 'Library/Preferences', 'Library/Saved Application State', 'Library/HTTPStorages', 'Library/WebKit'];

const inside = (path, root) => path.toLowerCase() === root.toLowerCase() || path.toLowerCase().startsWith(root.toLowerCase() + '/');

function judge(raw) {
  const typed = raw.trim().replace(/\/+$/, '');
  if (!typed) return { word: 'Type a path.', why: 'Try a file or folder from your Mac, such as ~/Library/Caches/com.spotify.client.' };
  if (/^\/Volumes(\/|$)/i.test(typed)) return { word: 'Never.', why: 'External drives are off limits. Lightly only works on the disk your Mac starts from.' };
  const path = typed.replace(/^\/Users\/[^/]+/i, '~').replace(/^\$HOME/, '~').replace(/^~$/, '~/');
  if (!path.startsWith('~/')) return { word: 'Never.', why: 'System folders and installed apps sit outside the folders Lightly may enter, and it never asks for an admin password.' };

  const rest = path.slice(2);
  for (const [root, name] of NEVER_HOME) {
    if (inside(rest, root)) return { word: 'Never.', why: `That is inside ${name}, which is on the list Lightly refuses, whatever else happens.` };
  }
  if (WEEKLY.some((root) => inside(rest, root) && rest.length > root.length)) return { word: 'Weekly.', why: 'Developer caches are cleared once a week. Your tools download what they need again.' };
  if (inside(rest, 'Library/Developer/Xcode/DerivedData') && rest.length > 'Library/Developer/Xcode/DerivedData'.length) return { word: 'After 7 idle days.', why: 'Xcode build data goes in the weekly clean, once a project has not changed for 7 days.' };
  if (inside(rest, 'Library/Caches') && rest.length > 'Library/Caches'.length) {
    const name = rest.split('/')[2];
    if (name.toLowerCase().startsWith('com.apple.') || name.startsWith('ms-playwright') || SKIPPED_CACHES.includes(name)) return { word: 'No.', why: 'Lightly skips this cache on purpose. Apple’s own caches and a few that are slow to rebuild stay put.' };
    return { word: 'Yes, when closed.', why: 'App caches are cleared while the app is shut. If the app is open, its cache is skipped. A folder no installed app claims waits until it has been idle for 7 days.' };
  }
  if (inside(rest, 'Library/Logs/DiagnosticReports')) return { word: 'No.', why: 'Crash reports are kept, in case you want them.' };
  if (inside(rest, 'Library/Logs') && rest.length > 'Library/Logs'.length) return { word: 'After 7 days.', why: 'Log files older than 7 days are deleted. Crash reports are kept.' };
  if (inside(rest, '.Trash') && rest.length > '.Trash'.length) return { word: 'After 30 days.', why: 'Items in the Trash go once they have sat there for 30 days. This needs Full Disk Access. Without it, the Trash is skipped.' };
  if (LEFTOVER_ROOTS.some((root) => inside(rest, root) && rest.length > root.length)) return { word: 'Only if the app is gone.', why: 'This is an app’s own data. It moves to the Trash, not away for good, once the app has been missing for 30 days and its files are unused.' };
  return { word: 'No.', why: 'That sits outside the folders Lightly may enter, so the gateway would refuse it.' };
}

globalThis.lightlyJudge = judge;

if (typeof document !== 'undefined') {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.facts, .rules tbody, .faq-list, .faq-split, .big-list, .plate, .plate figcaption, .plate-pair, .warning, .steps, .close-row, .page-head .intro, .ask-try').forEach((el) => el.setAttribute('data-rise', ''));
  for (const box of document.querySelectorAll('[data-rise]')) {
    [...box.children].forEach((child, i) => child.style.setProperty('--i', Math.min(i, 6)));
  }
  const seen = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('in');
      seen.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('[data-rise], .shutter, .clock').forEach((el) => seen.observe(el));

  for (const form of document.querySelectorAll('[data-ask]')) {
    const input = form.querySelector('input');
    const word = form.querySelector('.ask-word');
    const why = form.querySelector('.ask-why');
    const chips = [...form.querySelectorAll('.chip')];
    const show = () => {
      const answer = judge(input.value);
      word.textContent = answer.word;
      why.textContent = answer.why;
      for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.textContent === input.value));
    };
    form.addEventListener('submit', (event) => event.preventDefault());
    input.addEventListener('input', show);
    for (const chip of chips) chip.addEventListener('click', () => { input.value = chip.textContent; show(); });
    show();
  }

  const press = document.querySelector('.press');
  if (press) {
    const note = document.querySelector('.press-note');
    press.addEventListener('click', () => {
      press.classList.add('spent');
      note.textContent = 'Nothing happened. Lightly already cleaned this hour, by itself.';
    });
  }

  const slider = document.querySelector('.stages input[type="range"]');
  if (slider) {
    const parts = [...document.querySelectorAll('[data-stage]')];
    const names = [...document.querySelectorAll('.stage-names li')];
    const show = () => {
      const stop = slider.value;
      for (const part of parts) part.classList.toggle('on', part.dataset.stage === stop);
      names.forEach((name, i) => name.classList.toggle('on', String(i) === stop));
      slider.parentElement.style.setProperty('--done', stop / slider.max);
      slider.setAttribute('aria-valuetext', names[stop].textContent);
    };
    slider.addEventListener('input', show);
    show();
  }

  const names = [...document.querySelectorAll('.names li')];
  if (names.length) {
    let lit = 0;
    names[0].classList.add('lit');
    if (calm) names.forEach((name) => name.classList.add('lit'));
    else setInterval(() => {
      names[lit].classList.remove('lit');
      lit = (lit + 1) % names.length;
      names[lit].classList.add('lit');
    }, 2000);
  }
}
