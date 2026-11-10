# mokshasbg.github.io

An interactive terminal portfolio that runs entirely in the browser. No backend, no API, no server runtime — it is a static Astro build deployed to GitHub Pages.

Visitors can type commands into a real prompt and get the same output the page shows on load. The transcript is pre-rendered in HTML, so the content and links still work with JavaScript disabled.

## Terminal commands

| Command | What it does |
| --- | --- |
| `whoami` | Name and tagline |
| `about` / `cat about.txt` | The about text |
| `contact` / `ls ./contact` | Email, GitHub, LinkedIn |
| `projects` | All projects with details |
| `ls ./projects` | Compact project list |
| `open <n>` | Project details (`open 1`) |
| `cat project-<n>.md` | Same as `open <n>` |
| `ls` | Home listing |
| `help` | Command reference |
| `neofetch` | Session/system info |
| `banner` | ASCII banner |
| `date`, `pwd`, `echo`, `history`, `uname` | Usual shell things |
| `clear` | Clear the screen |
| `sudo`, `exit`, `rm`, `cd` | Tasteful jokes |

Keyboard: `↑`/`↓` history, `Tab` completion, `Ctrl+L` clear, `Ctrl+C` cancel the line, `Ctrl+U` clear the line. `Shift+Tab` leaves the prompt.

Deep links run a command on load:

```text
https://mokshasbg.github.io/?cmd=projects
https://mokshasbg.github.io/?cmd=open%201
https://mokshasbg.github.io/?cmd=neofetch
```

The query string is cleaned from the URL after the command runs.

## Edit your content

- **Profile, tagline, about, contacts:** `src/data/profile.ts`
- **Projects:** add Markdown files under `src/content/projects/`. They are loaded by the glob loader in `src/content.config.ts`, sorted by the `order` frontmatter field.
- **Colours and CRT effects:** `src/styles/global.css` (green palette) and `src/styles/terminal.css` (terminal UI).

The old `tailwind.config.mjs` was removed because Tailwind v4 uses CSS-first configuration. Theme tokens live in `@theme` in `src/styles/global.css`. The site keeps the original single green CRT palette.

The prompt is part of the transcript (not a separate input panel), and the terminal has no buttons or hint toolbar — commands are typed like a real shell. The only helper text is the tip below the terminal card.

## How it works

```text
src/lib/commands.ts   Pure command parser + HTML output (shared by server and browser)
src/lib/terminal.ts   Browser controller: input, history, tab completion, deep links
src/lib/types.ts      Shared data types
src/data/profile.ts   Static profile data
src/components/Terminal.astro  Terminal markup + serialized data + client entry
src/pages/index.astro          Loads projects and renders the terminal
```

`commands.ts` has no DOM or server dependencies. Astro runs it at build time to render the initial transcript, and the browser runs the exact same function for commands visitors type. That keeps the static output and the interactive output identical.

Everything is client-side: command history is stored in `localStorage`; no data ever leaves the browser.

## Development

```sh
npm install
npm run dev
npm run build
npm run preview
```

Astro dev server in background mode (per `AGENTS.md`):

```sh
astro dev --background
astro dev status
astro dev logs
astro dev stop
```

Deployment is handled by `.github/workflows/deploy.yml` on pushes to `main`.
