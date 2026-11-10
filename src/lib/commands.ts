import type { Profile, Project } from './types';

export interface CommandContext {
  profile: Profile;
  projects: Project[];
  history: string[];
  sessionStart: number;
  now?: Date;
}

export interface CommandResult {
  /** Output markup, without the echoed prompt line. */
  output: string;
  clear?: boolean;
  /** Opened in a new tab by the browser controller, when the visitor asks for a link. */
  openUrl?: string;
}

interface CommandSpec {
  name: string;
  usage: string;
  description: string;
}

export const COMMANDS: CommandSpec[] = [
  { name: 'whoami', usage: 'whoami', description: 'print who you are looking at' },
  { name: 'about', usage: 'about', description: 'read about.txt' },
  { name: 'contact', usage: 'contact', description: 'list email, github and linkedin' },
  { name: 'projects', usage: 'projects', description: 'list all projects with details' },
  { name: 'open', usage: 'open <n>', description: 'inspect project n, or open a contact' },
  { name: 'ls', usage: 'ls [dir]', description: 'list home, ./projects or ./contact' },
  { name: 'cat', usage: 'cat <file>', description: 'read about.txt or project-<n>.md' },
  { name: 'help', usage: 'help', description: 'show this list' },
  { name: 'clear', usage: 'clear', description: 'clear the screen (ctrl+l also works)' },
  { name: 'neofetch', usage: 'neofetch', description: 'print system information' },
  { name: 'date', usage: 'date', description: 'current date and time' },
  { name: 'pwd', usage: 'pwd', description: 'print the working directory' },
  { name: 'echo', usage: 'echo <text>', description: 'print text back' },
  { name: 'history', usage: 'history', description: 'show commands from this session' },
  { name: 'banner', usage: 'banner', description: 'print the big banner' },
  { name: 'sudo', usage: 'sudo', description: 'try it and see' },
  { name: 'uname', usage: 'uname', description: 'print the system name' },
  { name: 'exit', usage: 'exit', description: 'attempt to leave' },
];

export const COMMAND_WORDS = Array.from(
  new Set([
    ...COMMANDS.map((command) => command.name),
    '?',
    'man',
    'cls',
    'dir',
    'contacts',
    'time',
    'logout',
    'quit',
  ]),
);

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

function safeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    const url = new URL(href);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? href : undefined;
  } catch {
    return undefined;
  }
}

function linkTag(href: string | undefined, label: string, className = 't-link'): string {
  const safe = safeHref(href);
  if (!safe) return `<span class="t-dim">${escapeHtml(label)}</span>`;
  const external = safe.startsWith('http');
  const target = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a class="${className}" href="${escapeHtml(safe)}"${target}>${escapeHtml(label)}</a>`;
}

export function promptHtml(profile: Profile): string {
  return [
    '<span class="t-prompt">',
    `<span class="t-user">${escapeHtml(profile.user)}</span>`,
    '<span class="t-dim">@</span>',
    `<span class="t-host">${escapeHtml(profile.host)}</span>`,
    '<span class="t-dim">:</span>',
    `<span class="t-path">${escapeHtml(profile.path)}</span>`,
    '<span class="t-sign">$</span>',
    '</span>',
  ].join('');
}

export function renderEcho(input: string, profile: Profile): string {
  return `<div class="t-echo">${promptHtml(profile)}<span class="t-cmd">${escapeHtml(input)}</span></div>`;
}

function ok(output: string): CommandResult {
  return { output };
}

function fail(message: string): CommandResult {
  return { output: `<p class="t-error-line">${escapeHtml(message)}</p>` };
}

function aboutHtml(profile: Profile): string {
  return `<p class="t-text">${escapeHtml(profile.about)}</p>`;
}

function contactHtml(profile: Profile): string {
  if (!profile.contacts.length) {
    return '<p class="t-dim">no contact links found.</p>';
  }

  const rows = profile.contacts
    .map(
      (contact) => `<div class="t-row">
        <span class="t-perm">-rw-r--r--</span>
        ${linkTag(contact.href, contact.label, 't-link t-contact')}
        <span class="t-contact-value">${escapeHtml(contact.value)}</span>
      </div>`,
    )
    .join('');

  return `<div class="t-list">${rows}</div>`;
}

function projectLinksHtml(project: Project): string {
  const links: string[] = [];
  if (project.link) links.push(linkTag(project.link, 'live ↗'));
  if (project.repo) links.push(linkTag(project.repo, 'source ↗'));
  return links.length ? `<span class="t-links">${links.join('')}</span>` : '';
}

function projectListHtml(projects: Project[], detailed: boolean): string {
  if (!projects.length) {
    return '<p class="t-dim">no projects yet — add a markdown file to <span class="t-code">src/content/projects/</span>.</p>';
  }

  const items = projects
    .map((project, index) => {
      const number = String(index + 1).padStart(2, '0');
      const description = detailed
        ? `<p class="t-proj-desc">${escapeHtml(project.description)}</p>`
        : '';
      const stack = project.stack.length
        ? `<span class="t-stack">[${project.stack.map(escapeHtml).join(', ')}]</span>`
        : '';

      return `<div class="t-proj">
        <div class="t-proj-head">
          <span class="t-proj-index">${number}</span>
          <span class="t-proj-title">${escapeHtml(project.title)}</span>
          <span class="t-year">${escapeHtml(project.year)}</span>
        </div>
        ${description}
        <div class="t-proj-meta">
          ${stack}
          ${projectLinksHtml(project)}
          <span class="t-dim t-proj-cmd">open ${index + 1}</span>
        </div>
      </div>`;
    })
    .join('');

  return `<div class="t-projects">${items}</div>`;
}

function projectDetailHtml(project: Project, index: number): string {
  const links = projectLinksHtml(project);
  return `<div class="t-detail">
    <div class="t-detail-kicker"><span class="t-dim">project</span> ${String(index + 1).padStart(2, '0')}</div>
    <div class="t-detail-title">${escapeHtml(project.title)}</div>
    <div class="t-kv"><span class="t-key">year</span><span>${escapeHtml(project.year)}</span></div>
    <div class="t-kv"><span class="t-key">stack</span><span>${project.stack.map(escapeHtml).join(', ') || '—'}</span></div>
    <p class="t-text">${escapeHtml(project.description)}</p>
    ${links ? `<div class="t-detail-links">${links}</div>` : ''}
    <p class="t-dim t-detail-hint">type <span class="t-code">projects</span> to see everything again</p>
  </div>`;
}

function homeListingHtml(detailed: boolean): string {
  const files = ['about.txt', 'contact/', 'projects/'];

  if (!detailed) {
    return `<div class="t-files">${files.map((file) => `<span>${escapeHtml(file)}</span>`).join('')}</div>`;
  }

  const rows = files
    .map((file, index) => {
      const permission = index === 0 ? '-rw-r--r--' : 'drwxr-xr-x';
      return `<div class="t-row t-row--2">
        <span class="t-perm">${permission}</span>
        <span>${escapeHtml(file)}</span>
      </div>`;
    })
    .join('');

  return `<div class="t-list">${rows}</div>`;
}

function normalizePath(value: string): string {
  return value
    .trim()
    .replace(/^~\/?/, '')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function projectIndex(value: string): number | null {
  const match = value.match(/(\d+)/);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isInteger(number) && number >= 1 ? number - 1 : null;
}

function lsCommand(args: string[], context: CommandContext): CommandResult {
  const flags = args.filter((argument) => argument.startsWith('-'));
  const targets = args.filter((argument) => !argument.startsWith('-'));
  const detailed = flags.some((flag) => flag.includes('l') || flag.includes('a'));
  const target = normalizePath(targets[0] ?? '');

  if (!target) return ok(homeListingHtml(detailed));
  if (target === 'projects' || target === 'project') {
    return ok(projectListHtml(context.projects, detailed));
  }
  if (target === 'contact' || target === 'contacts') {
    return ok(contactHtml(context.profile));
  }
  if (target === 'about.txt' || target === 'about') {
    return ok(`<div class="t-row t-row--2"><span class="t-perm">-rw-r--r--</span><span>about.txt</span></div>`);
  }

  return fail(`ls: cannot access '${targets[0] ?? target}': No such file or directory`);
}

function catCommand(args: string[], context: CommandContext): CommandResult {
  if (!args.length) return fail('cat: missing operand');

  const raw = args[0] ?? '';
  const path = normalizePath(raw);

  if (path === 'about.txt' || path === 'about') return ok(aboutHtml(context.profile));
  if (path === 'banner.txt' || path === 'banner') return ok(bannerHtml());

  const looksLikeProject =
    /^\d+$/.test(path) ||
    /^project[-_ ]?\d+(\.md)?$/.test(path) ||
    /^projects\/\d+(\.md)?$/.test(path);

  if (looksLikeProject) {
    const index = projectIndex(path);
    const project = index === null ? undefined : context.projects[index];
    if (project && index !== null) return ok(projectDetailHtml(project, index));
    return fail(`cat: ${raw}: No such file or directory`);
  }

  return fail(`cat: ${raw}: No such file or directory`);
}

function openCommand(args: string[], context: CommandContext): CommandResult {
  if (!args.length) return fail('open: missing operand — try `open 1` or `open github`');

  const raw = args[0] ?? '';
  const target = raw.toLowerCase();
  const looksLikeProject = /^\d+$/.test(target) || /^project[-_ ]?\d+(\.md)?$/.test(target);

  if (looksLikeProject) {
    const index = projectIndex(target);
    const project = index === null ? undefined : context.projects[index];
    if (project && index !== null) return ok(projectDetailHtml(project, index));
    return fail(`open: project ${(index ?? 0) + 1} not found`);
  }

  const contact = context.profile.contacts.find(
    (item) => item.label.toLowerCase() === target || item.value.toLowerCase().includes(target),
  );

  if (contact) {
    const href = safeHref(contact.href);
    if (href) {
      return {
        output: `<p>opening ${linkTag(href, contact.label)} <span class="t-dim">(${escapeHtml(contact.value)})</span>…</p>`,
        openUrl: href.startsWith('http') ? href : undefined,
      };
    }
  }

  return fail(`open: '${raw}': no such project or contact`);
}

function helpHtml(): string {
  const rows = COMMANDS.map(
    (command) =>
      `<div class="t-help-row"><span class="t-help-name">${escapeHtml(command.usage)}</span><span class="t-help-desc">${escapeHtml(command.description)}</span></div>`,
  ).join('');

  return `<p class="t-help-title">available commands</p>
    <div class="t-help">${rows}</div>
    <p class="t-help-keys"><span class="t-dim">keys</span> ↑/↓ history · tab complete · ctrl+l clear · ctrl+c cancel</p>`;
}

function historyHtml(history: string[]): string {
  if (!history.length) return '<p class="t-dim">no commands yet.</p>';

  const recent = history.slice(-50);
  const offset = history.length - recent.length;
  const rows = recent
    .map(
      (command, index) =>
        `<div class="t-history-row"><span class="t-dim">${String(offset + index + 1).padStart(3, ' ')}</span><span>${escapeHtml(command)}</span></div>`,
    )
    .join('');

  return `<div class="t-history">${rows}</div>`;
}

function uptimeLabel(sessionStart: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - sessionStart) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function neofetchHtml(context: CommandContext): string {
  const ascii = `  ███╗   ███╗  ██████╗
  ████╗ ████║ ██╔════╝
  ██╔████╔██║ ██║  ███╗
  ██║╚██╔╝██║ ██║   ██║
  ██║ ╚═╝ ██║ ╚██████╔╝
  ╚═╝     ╚═╝  ╚═════╝`;

  const info: Array<[string, string]> = [
    ['os', 'PortfolioOS 1.0 (static)'],
    ['host', 'GitHub Pages'],
    ['shell', 'zsh (simulated)'],
    ['terminal', 'dsh-term'],
    ['projects', String(context.projects.length)],
    ['uptime', uptimeLabel(context.sessionStart)],
  ];

  const rows = info
    .map(
      ([key, value]) =>
        `<div class="t-kv"><span class="t-key">${escapeHtml(key)}</span><span>${escapeHtml(value)}</span></div>`,
    )
    .join('');

  return `<div class="t-neofetch">
    <pre class="t-ascii" aria-hidden="true">${escapeHtml(ascii)}</pre>
    <div class="t-sysinfo">
      <div class="t-sysinfo-head"><span class="t-user">${escapeHtml(context.profile.user)}</span><span class="t-dim">@</span><span class="t-host">${escapeHtml(context.profile.host)}</span></div>
      <div class="t-dim">─────────────────────</div>
      ${rows}
    </div>
  </div>`;
}

function bannerHtml(): string {
  const banner = ` ███╗   ███╗ ██████╗
 ████╗ ████║██╔════╝
 ██╔████╔██║██║  ███╗
 ██║╚██╔╝██║██║   ██║
 ██║ ╚═╝ ██║╚██████╔╝
 ╚═╝     ╚═╝ ╚═════╝`;
  return `<pre class="t-banner" aria-hidden="true">${escapeHtml(banner)}</pre>`;
}

export function runCommand(input: string, context: CommandContext): CommandResult {
  const trimmed = input.trim();
  if (!trimmed) return { output: '' };

  const tokens = tokenize(trimmed);
  const command = (tokens[0] ?? '').toLowerCase();
  const args = tokens.slice(1);

  switch (command) {
    case 'whoami':
      return ok(`<div class="t-hero">
        <div class="t-name">${escapeHtml(context.profile.name)}</div>
        <div class="t-tagline">${renderTagline(context.profile.tagline)}</div>
      </div>`);

    case 'about':
      return ok(aboutHtml(context.profile));

    case 'contact':
    case 'contacts':
      return ok(contactHtml(context.profile));

    case 'projects':
      return ok(projectListHtml(context.projects, true));

    case 'ls':
    case 'dir':
      return lsCommand(args, context);

    case 'cat':
      return catCommand(args, context);

    case 'open':
      return openCommand(args, context);

    case 'help':
    case '?':
    case 'man':
      return ok(helpHtml());

    case 'clear':
    case 'cls':
      return { output: '', clear: true };

    case 'pwd':
      return ok(`<p>/home/${escapeHtml(context.profile.user)}</p>`);

    case 'date':
    case 'time':
      return ok(`<p>${escapeHtml((context.now ?? new Date()).toString())}</p>`);

    case 'echo':
      return ok(`<p class="t-text">${args.length ? escapeHtml(args.join(' ')) : '&nbsp;'}</p>`);

    case 'history':
      return ok(historyHtml(context.history));

    case 'neofetch':
      return ok(neofetchHtml(context));

    case 'banner':
      return ok(bannerHtml());

    case 'uname':
      return ok(`<p>PortfolioOS ${escapeHtml(context.profile.host)} 1.0.0 static</p>`);

    case 'sudo':
      return ok(`<p class="t-dim">[sudo] password for ${escapeHtml(context.profile.user)}:</p>
        <p class="t-error-line">${escapeHtml(context.profile.user)} is not in the sudoers file. This incident has been reported to /dev/null.</p>`);

    case 'rm':
      if (args.join(' ').includes('/')) {
        return fail("rm: it is not possible to remove '/': this is a static website.");
      }
      return fail(`rm: ${args[0] ?? ''}: permission denied`);

    case 'cd':
      if (!args.length) return ok('');
      return fail(`cd: no such file or directory: ${args[0] ?? ''}`);

    case 'exit':
    case 'logout':
    case 'quit':
      return ok(`<p>logout</p>
        <p class="t-dim">connection to ${escapeHtml(context.profile.host)} closed.</p>
        <p class="t-dim">just kidding — this is a static page, so there is nowhere to disconnect from.</p>`);

    default: {
      const name = escapeHtml(tokens[0] ?? trimmed);
      return {
        output: `<p class="t-error-line">zsh: command not found: <span class="t-error-name">${name}</span></p>
          <p class="t-dim">type <span class="t-code">help</span> to see the available commands.</p>`,
      };
    }
  }
}

function renderTagline(tagline: string): string {
  return tagline
    .split('//')
    .map((part) => escapeHtml(part.trim()))
    .join(' <span class="t-dim">//</span> ');
}

export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (const character of input.trim()) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === '\\' && quote !== "'") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) quote = null;
      else current += character;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (/\s/.test(character)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    current += character;
  }

  if (current) tokens.push(current);
  return tokens;
}

export interface CompletionResult {
  /** Index in the input where the completed word starts. */
  start: number;
  candidates: string[];
}

export function getCompletions(
  input: string,
  profile: Profile,
  projects: Project[],
): CompletionResult {
  const match = /^(.*?)(\S*)$/.exec(input);
  const before = match?.[1] ?? '';
  const word = match?.[2] ?? '';
  const start = before.length;
  const tokens = before.trim() ? before.trim().split(/\s+/) : [];
  let candidates: string[] = [];

  if (tokens.length === 0) {
    const needle = word.toLowerCase();
    candidates = COMMAND_WORDS.filter((candidate) => candidate.startsWith(needle));
  } else if (tokens.length === 1) {
    const command = (tokens[0] ?? '').toLowerCase();
    const needle = word.toLowerCase();

    if (command === 'open') {
      candidates = [
        ...projects.map((_, index) => String(index + 1)),
        ...profile.contacts.map((contact) => contact.label),
      ].filter((candidate) => candidate.startsWith(needle));
    } else if (command === 'ls' || command === 'dir') {
      candidates = ['about.txt', 'contact', 'projects', './contact', './projects'].filter((candidate) =>
        candidate.startsWith(word),
      );
    } else if (command === 'cat') {
      candidates = [
        'about.txt',
        'banner.txt',
        ...projects.map((_, index) => `project-${index + 1}.md`),
      ].filter((candidate) => candidate.startsWith(word));
    }
  }

  return { start, candidates: Array.from(new Set(candidates)) };
}

export function commonPrefix(values: string[]): string {
  if (!values.length) return '';
  let prefix = values[0] ?? '';
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) prefix = prefix.slice(0, -1);
    if (!prefix) break;
  }
  return prefix;
}

export function renderCommandBlock(input: string, context: CommandContext): string {
  const result = runCommand(input, context);
  if (result.clear || !result.output) return '';
  return `<div class="t-block">${renderEcho(input.trim(), context.profile)}${result.output}</div>`;
}

export function renderInitialTranscript(context: CommandContext): string {
  const blocks = [
    renderCommandBlock('whoami', context),
    renderCommandBlock('cat about.txt', context),
    renderCommandBlock('ls ./contact', context),
    renderCommandBlock('ls -la ./projects', context),
  ];

  return blocks.filter(Boolean).join('');
}
