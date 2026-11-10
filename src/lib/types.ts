export interface Contact {
  label: string;
  value: string;
  href: string;
}

export interface Profile {
  user: string;
  host: string;
  path: string;
  displayName: string;
  name: string;
  tagline: string;
  about: string;
  contacts: Contact[];
}

export interface Project {
  title: string;
  description: string;
  stack: string[];
  year: string;
  link?: string;
  repo?: string;
}

export interface TerminalData {
  profile: Profile;
  projects: Project[];
}
