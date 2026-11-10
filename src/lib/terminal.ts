import {
  commonPrefix,
  escapeHtml,
  getCompletions,
  renderEcho,
  runCommand,
  type CommandContext,
} from './commands';
import type { Project, Profile, TerminalData } from './types';

const HISTORY_KEY = 'moksha.terminal.history';
const MAX_HISTORY = 100;
const SEED_HISTORY = ['whoami', 'cat about.txt', 'ls ./contact', 'ls -la ./projects'];

function loadHistory(): string[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) return [...SEED_HISTORY];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...SEED_HISTORY];
    const clean = parsed.filter((item): item is string => typeof item === 'string').slice(-MAX_HISTORY);
    return clean.length ? clean : [...SEED_HISTORY];
  } catch {
    return [...SEED_HISTORY];
  }
}

function saveHistory(history: string[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
  } catch {
    // Private mode / storage disabled: the terminal still works, just without persistence.
  }
}

/**
 * Attaches the interactive terminal behaviour to the markup rendered by
 * Terminal.astro. Safe to call when the terminal is not on the page.
 */
export function initTerminal(): void {
  const root = document.getElementById('terminal');
  const output = document.getElementById('term-output');
  const input = document.getElementById('term-input');
  const typed = document.getElementById('term-typed');
  const inputRow = document.getElementById('term-input-row');
  const dataElement = document.getElementById('term-data');

  if (
    !(root instanceof HTMLElement) ||
    !(output instanceof HTMLElement) ||
    !(input instanceof HTMLInputElement) ||
    !(typed instanceof HTMLElement) ||
    !(inputRow instanceof HTMLElement) ||
    !(dataElement instanceof HTMLScriptElement)
  ) {
    return;
  }

  if (root.dataset.ready === 'true') return;
  root.dataset.ready = 'true';

  let parsed: unknown;
  try {
    parsed = JSON.parse(dataElement.textContent ?? '');
  } catch {
    return;
  }

  if (parsed === null || typeof parsed !== 'object') return;

  const data = parsed as TerminalData;
  if (!data.profile || !Array.isArray(data.projects)) return;

  const profile: Profile = data.profile;
  const projects: Project[] = data.projects;
  const sessionStart = Date.now();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let history = loadHistory();
  let historyIndex = history.length;
  let draft = '';

  function context(): CommandContext {
    return { profile, projects, history, sessionStart };
  }

  function setCommand(value: string): void {
    input.value = value;
    typed.textContent = value;
  }

  function scrollToPrompt(): void {
    inputRow.scrollIntoView({
      block: 'end',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }

  function appendHtml(html: string): void {
    if (!html) return;
    const template = document.createElement('template');
    template.innerHTML = html;
    output.appendChild(template.content);
  }

  function remember(command: string): void {
    if (history[history.length - 1] !== command) {
      history.push(command);
      if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
      saveHistory(history);
    }
    historyIndex = history.length;
  }

  function clearScreen(): void {
    output.replaceChildren();
    root.scrollIntoView({
      block: 'start',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }

  function run(raw: string): void {
    const command = raw.trim();
    if (!command) {
      setCommand('');
      return;
    }

    remember(command);
    const result = runCommand(command, context());

    if (result.clear) {
      clearScreen();
    } else {
      appendHtml(renderEcho(command, profile) + result.output);
      scrollToPrompt();
    }

    if (result.openUrl) {
      window.open(result.openUrl, '_blank', 'noopener,noreferrer');
    }

    setCommand('');
    historyIndex = history.length;
    draft = '';
  }

  function submit(): void {
    const value = input.value;
    if (!value.trim()) {
      setCommand('');
      return;
    }
    run(value);
  }

  function navigate(direction: -1 | 1): void {
    if (!history.length) return;
    if (historyIndex === history.length) draft = input.value;

    const next = Math.max(0, Math.min(history.length, historyIndex + direction));
    if (next === historyIndex) return;

    historyIndex = next;
    setCommand(next === history.length ? draft : (history[next] ?? ''));
  }

  function complete(): void {
    const { start, candidates } = getCompletions(input.value, profile, projects);
    if (!candidates.length) return;

    const prefix = input.value.slice(0, start);
    const currentWord = input.value.slice(start);

    if (candidates.length === 1) {
      const candidate = candidates[0] ?? '';
      const suffix = prefix.includes(' ') ? '' : ' ';
      setCommand(prefix + candidate + suffix);
      return;
    }

    const shared = commonPrefix(candidates);
    if (shared.length > currentWord.length) setCommand(prefix + shared);

    const chips = candidates
      .map((candidate) => `<span class="t-completion">${escapeHtml(candidate)}</span>`)
      .join('');
    appendHtml(`<div class="t-block t-completions">${chips}</div>`);
    scrollToPrompt();
  }

  function cancel(): void {
    appendHtml(
      `<div class="t-block">${renderEcho(input.value, profile)}<span class="t-dim">^C</span></div>`,
    );
    setCommand('');
    historyIndex = history.length;
    draft = '';
    scrollToPrompt();
  }

  function focusInput(revealPrompt = false): void {
    input.focus({ preventScroll: true });
    if (revealPrompt) scrollToPrompt();
  }

  input.addEventListener('input', () => {
    typed.textContent = input.value;
    historyIndex = history.length;
    draft = input.value;
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      navigate(-1);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      navigate(1);
      return;
    }

    // Shift+Tab is allowed through so keyboard users can leave the prompt.
    if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault();
      complete();
      return;
    }

    if (event.ctrlKey && !event.altKey && !event.metaKey) {
      const key = event.key.toLowerCase();
      if (key === 'l') {
        event.preventDefault();
        clearScreen();
        return;
      }
      if (key === 'c') {
        event.preventDefault();
        cancel();
        return;
      }
      if (key === 'u') {
        event.preventDefault();
        setCommand('');
        historyIndex = history.length;
        draft = '';
        return;
      }
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setCommand('');
    }
  });

  input.addEventListener('focus', () => root.classList.add('is-focused'));
  input.addEventListener('blur', () => root.classList.remove('is-focused'));

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('a')) return;
    if (window.getSelection()?.toString()) return;
    focusInput(true);
  });

  document.querySelectorAll<HTMLElement>('[data-last-login]').forEach((element) => {
    element.textContent = new Date().toDateString();
  });

  setCommand('');

  // Deep link: /?cmd=neofetch runs a command on load, then cleans the URL.
  const params = new URLSearchParams(window.location.search);
  const initialCommand = params.get('cmd');
  if (initialCommand) {
    params.delete('cmd');
    const query = params.toString();
    const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', cleanUrl);
    run(initialCommand);
  }

  if (window.matchMedia('(pointer: fine)').matches) {
    window.requestAnimationFrame(focusInput);
  }
}
