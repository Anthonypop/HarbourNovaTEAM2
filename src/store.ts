import { useSyncExternalStore } from 'react';

export const STAGES = ['Received', 'Checking', 'Fixing', 'Done'] as const;

export type TopicKey = 'login' | 'bill' | 'connection' | 'visit';

export type Topic = {
  key: TopicKey;
  re: RegExp;
  focus: string;
  heard: string;
  noun: string;
  next: string;
};

export const TOPICS: Topic[] = [
  { key: 'login', re: /log ?in|password|sign ?in|locked out|access/i, focus: 'The login', heard: 'You cannot log in.', noun: 'your login', next: 'Our technical team resets your login.' },
  { key: 'bill', re: /bill|charge|invoice|payment|refund|price|overcharg/i, focus: 'The bill', heard: 'Your bill may be wrong.', noun: 'your bill', next: 'Our finance team checks your bill.' },
  { key: 'connection', re: /internet|network|connect|wi-?fi|signal|slow|outage/i, focus: 'The connection', heard: 'Your connection is not working.', noun: 'your connection', next: 'Our technical team tests your connection.' },
  { key: 'visit', re: /visit|install|engineer|appointment|moving|address|site/i, focus: 'The visit', heard: 'You need a visit or an install.', noun: 'your visit', next: 'Our operations team books your visit.' },
];

export function detectTopics(text: string): Topic[] {
  return TOPICS.filter((t) => t.re.test(text));
}

export type CaseState = {
  id: string;
  customer: string;
  story: string;
  topics: TopicKey[];
  focus: TopicKey | null;
  owner: string;
  stage: number;
};

const KEY = 'novaclear.case.v1';

export const DEMO_CASE: CaseState = {
  id: 'HN-26-0135',
  customer: 'Alex',
  story: "I can't log in. And my bill looks wrong.",
  topics: ['login', 'bill'],
  focus: 'login',
  owner: 'Mei',
  stage: 2,
};

function load(): CaseState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEMO_CASE, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable: use the demo case */
  }
  return DEMO_CASE;
}

let state: CaseState = typeof window === 'undefined' ? DEMO_CASE : load();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function setCase(patch: Partial<CaseState>) {
  state = { ...state, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  emit();
}

export function resetCase() {
  state = DEMO_CASE;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load();
      emit();
    }
  });
}

export function useCase(): CaseState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => state,
  );
}

export function topicOf(key: TopicKey | null | undefined): Topic | undefined {
  return TOPICS.find((t) => t.key === key);
}

export function byTomorrow(hour = 17): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const day = d.toLocaleDateString('en-GB', { weekday: 'short' });
  return `By ${day} ${String(hour).padStart(2, '0')}:00`;
}

export type FourPart = { happened: string; who: string; next: string; when: string };

/** The four-part plain update: what happened, who owns it, what happens next, when. */
export function updateFor(c: CaseState): FourPart {
  const topics = c.topics.map((k) => topicOf(k)!).filter(Boolean);
  const focus = topicOf(c.focus) ?? topics[0];
  const other = topics.find((t) => t.key !== focus?.key);
  const nouns = topics.length ? topics.map((t) => t.noun).join(' and ') : 'your request';
  const who = c.owner;
  switch (c.stage) {
    case 0:
      return { happened: 'We have your story.', who, next: `${c.owner} plans the work with our teams.`, when: 'Today' };
    case 1:
      return { happened: `${c.owner} has your full story.`, who, next: `We check ${nouns}.`, when: byTomorrow(12) };
    case 2:
      return {
        happened: other ? `We are checking ${other.noun}.` : `We are working on ${focus?.noun ?? 'your request'}.`,
        who,
        next: focus?.next ?? 'The right team does the work.',
        when: byTomorrow(17),
      };
    default:
      return { happened: `It is fixed. ${c.owner} closed your case.`, who, next: 'Nothing. Reply if anything is still wrong.', when: 'Done' };
  }
}
