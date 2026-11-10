import type { Profile } from '../lib/types';

/**
 * Everything the terminal knows about you lives here.
 * Edit this file and the whole site (static HTML + interactive commands)
 * updates together on the next build.
 */
export const profile: Profile = {
  user: 'guest',
  host: 'portfolio',
  path: '~',
  displayName: 'Moksha Gunarathne',
  name: 'MOKSHA_GUNARATHNE',
  tagline: 'full-stack developer // problem solver // terminal enthusiast',
  about:
    'I build things for the web. I like clean code, fast sites, and dark terminals. ' +
    'Currently exploring reverse engineering and binary exploitation.',
  contacts: [
    {
      label: 'email',
      value: 'mokshasbg@proton.me',
      href: 'mailto:mokshasbg@proton.me',
    },
    {
      label: 'github',
      value: 'github.com/mokshasbg',
      href: 'https://github.com/mokshasbg',
    },
    {
      label: 'linkedin',
      value: 'linkedin.com/in/mokshasbg',
      href: 'https://linkedin.com/in/mokshasbg',
    },
  ],
};
