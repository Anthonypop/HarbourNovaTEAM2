import { useEffect, useReducer, useState } from 'react';
import { AlertTriangle, Check, Shuffle } from 'lucide-react';
import { byTomorrow, setCase, useCase } from '../store';

type Team = 'Technical' | 'Finance' | 'Operations';
type Staff = { id: string; name: string; team: Team; onShift: boolean; open: number; cap: number };
type Status = 'unassigned' | 'assigned' | 'confirmed' | 'escalated' | 'done';
type Task = {
  id: string;
  title: string;
  caseId: string;
  team: Team;
  createdAt: number;
  status: Status;
  assignee?: string;
  assignedAt?: number;
  tried: string[];
  flag?: string;
};
type Draft = {
  id: string;
  caseId: string;
  from: Team;
  note: string;
  happened: string;
  next: string;
  when: string;
  needsPerson?: string;
  sent: boolean;
};
type Log = { at: number; text: string };
type State = { staff: Staff[]; tasks: Task[]; drafts: Draft[]; log: Log[] };

/** Demo confirm window. The pilot sets the real limit with team leads. */
const CONFIRM_MS = 20_000;
/** Tasks and updates tagged LIVE belong to the customer case open in this browser. */
const LIVE = 'LIVE';
const LEADS: Record<Team, string> = { Technical: 'Priya', Finance: 'Omar', Operations: 'Hana' };

function initial(): State {
  const now = Date.now();
  const min = 60_000;
  return {
    staff: [
      { id: 'ravi', name: 'Ravi', team: 'Technical', onShift: true, open: 2, cap: 5 },
      { id: 'ana', name: 'Ana', team: 'Technical', onShift: true, open: 1, cap: 5 },
      { id: 'tom', name: 'Tom', team: 'Technical', onShift: true, open: 1, cap: 5 },
      { id: 'kofi', name: 'Kofi', team: 'Finance', onShift: true, open: 3, cap: 5 },
      { id: 'lena', name: 'Lena', team: 'Finance', onShift: true, open: 5, cap: 5 },
      { id: 'sam', name: 'Sam', team: 'Operations', onShift: true, open: 2, cap: 5 },
      { id: 'joy', name: 'Joy', team: 'Operations', onShift: false, open: 0, cap: 5 },
    ],
    tasks: [
      { id: 't1', title: 'Reset login access', caseId: LIVE, team: 'Technical', createdAt: now - 42 * min, status: 'unassigned', tried: [] },
      { id: 't2', title: 'Check bill adjustment', caseId: LIVE, team: 'Finance', createdAt: now - 95 * min, status: 'unassigned', tried: [], flag: 'Billing' },
      { id: 't3', title: 'Book site visit', caseId: 'HN-26-0141', team: 'Operations', createdAt: now - 192 * min, status: 'unassigned', tried: [] },
      { id: 't4', title: 'Confirm device details', caseId: 'HN-26-0150', team: 'Technical', createdAt: now - 18 * min, status: 'unassigned', tried: [] },
      { id: 't5', title: 'Review refund request', caseId: 'HN-26-0162', team: 'Finance', createdAt: now - 126 * min, status: 'unassigned', tried: [], flag: 'Refund' },
    ],
    drafts: [
      {
        id: 'd1',
        caseId: LIVE,
        from: 'Technical',
        note: 'Access token reset req. via OpsHub.',
        happened: 'Our technical team is resetting your login.',
        next: 'You get a link to set a new password.',
        when: byTomorrow(12),
        sent: false,
      },
      {
        id: 'd2',
        caseId: LIVE,
        from: 'Finance',
        note: 'Billing adj. pending review.',
        happened: 'We are checking your bill.',
        next: 'If it is wrong, we correct it and tell you the amount.',
        when: byTomorrow(17),
        needsPerson: 'Billing line. A person approves before it is sent.',
        sent: false,
      },
    ],
    log: [{ at: now - 2 * min, text: 'Mei is Case Captain for the live case. She stays the owner until it closes.' }],
  };
}

type Action =
  | { type: 'assign'; id: string }
  | { type: 'assignAll' }
  | { type: 'confirm'; id: string }
  | { type: 'complete'; id: string }
  | { type: 'tick'; now: number }
  | { type: 'sendDraft'; id: string; caseId: string }
  | { type: 'reset' };

function assignOne(s: State, taskId: string, now: number): State {
  const task = s.tasks.find((t) => t.id === taskId);
  if (!task || (task.status !== 'unassigned' && task.status !== 'escalated')) return s;
  const team = s.staff.filter((p) => p.team === task.team);
  const skipped = team
    .filter((p) => !p.onShift || p.open >= p.cap || task.tried.includes(p.id))
    .map((p) => `${p.name} (${!p.onShift ? 'off shift' : p.open >= p.cap ? 'full' : 'did not confirm'})`);
  const eligible = team.filter((p) => p.onShift && p.open < p.cap && !task.tried.includes(p.id));
  if (!eligible.length) {
    return {
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: 'escalated', assignee: undefined } : t)),
      log: [{ at: now, text: `No one free in ${task.team} for “${task.title}”. Team lead ${LEADS[task.team]} alerted.` }, ...s.log],
    };
  }
  const fewest = Math.min(...eligible.map((p) => p.open));
  const tied = eligible.filter((p) => p.open === fewest);
  const pick = tied[Math.floor(Math.random() * tied.length)];
  const why = `${task.team} skill, on shift, fewest open tasks (${pick.open})${tied.length > 1 ? `, tie with ${tied.filter((p) => p !== pick).map((p) => p.name).join(', ')} broken at random` : ''}`;
  return {
    ...s,
    staff: s.staff.map((p) => (p.id === pick.id ? { ...p, open: p.open + 1 } : p)),
    tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: 'assigned', assignee: pick.id, assignedAt: now } : t)),
    log: [{ at: now, text: `“${task.title}” → ${pick.name}. ${why}.${skipped.length ? ` Skipped: ${skipped.join(', ')}.` : ''} Waiting for ${pick.name} to confirm.` }, ...s.log],
  };
}

function reducer(s: State, a: Action): State {
  const now = Date.now();
  const name = (id?: string) => s.staff.find((p) => p.id === id)?.name ?? '';
  switch (a.type) {
    case 'assign':
      return assignOne(s, a.id, now);
    case 'assignAll':
      return s.tasks.filter((t) => t.status === 'unassigned').reduce((acc, t) => assignOne(acc, t.id, now), s);
    case 'confirm': {
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t || t.status !== 'assigned') return s;
      const secs = Math.round((now - (t.assignedAt ?? now)) / 1000);
      return {
        ...s,
        tasks: s.tasks.map((x) => (x.id === a.id ? { ...x, status: 'confirmed' } : x)),
        log: [{ at: now, text: `${name(t.assignee)} confirmed “${t.title}” after ${secs} s.` }, ...s.log],
      };
    }
    case 'complete': {
      const t = s.tasks.find((x) => x.id === a.id);
      if (!t || t.status !== 'confirmed') return s;
      return {
        ...s,
        staff: s.staff.map((p) => (p.id === t.assignee ? { ...p, open: Math.max(0, p.open - 1) } : p)),
        tasks: s.tasks.map((x) => (x.id === a.id ? { ...x, status: 'done' } : x)),
        log: [{ at: now, text: `${name(t.assignee)} finished “${t.title}”. Back to the Case Captain.` }, ...s.log],
      };
    }
    case 'tick': {
      const late = s.tasks.filter((t) => t.status === 'assigned' && a.now - (t.assignedAt ?? a.now) > CONFIRM_MS);
      if (!late.length) return s;
      return {
        ...s,
        staff: s.staff.map((p) => (late.some((t) => t.assignee === p.id) ? { ...p, open: Math.max(0, p.open - 1) } : p)),
        tasks: s.tasks.map((t) =>
          late.some((l) => l.id === t.id) ? { ...t, status: 'escalated', tried: [...t.tried, t.assignee!], assignee: undefined } : t,
        ),
        log: [
          ...late.map((t) => ({
            at: a.now,
            text: `${name(t.assignee)} did not confirm “${t.title}” in time. Team lead ${LEADS[t.team]} alerted. The Case Captain stays responsible.`,
          })),
          ...s.log,
        ],
      };
    }
    case 'sendDraft': {
      const d = s.drafts.find((x) => x.id === a.id);
      if (!d || d.sent) return s;
      return {
        ...s,
        drafts: s.drafts.map((x) => (x.id === a.id ? { ...x, sent: true } : x)),
        log: [{ at: now, text: `Mei approved the ${d.from.toLowerCase()} update for ${a.caseId}. Sent to the customer’s tracker.` }, ...s.log],
      };
    }
    case 'reset':
      return initial();
  }
}

function clock(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const time = (at: number) => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

type Panel = 'queue' | 'people' | 'drafts' | 'log';

export function Console() {
  const [s, dispatch] = useReducer(reducer, undefined, initial);
  const [now, setNow] = useState(Date.now());
  const [panel, setPanel] = useState<Panel>('queue');
  const c = useCase();

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      dispatch({ type: 'tick', now: t });
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const open = s.tasks.filter((t) => t.status !== 'done');
  const unclaimed = open.filter((t) => t.status === 'unassigned' || t.status === 'escalated').length;
  const waiting = open.filter((t) => t.status === 'assigned').length;
  const pending = s.drafts.filter((d) => !d.sent).length;
  const nameOf = (id?: string) => s.staff.find((p) => p.id === id)?.name ?? '';
  const cid = (id: string) => (id === LIVE ? c.id : id);

  const sendDraft = (d: Draft) => {
    dispatch({ type: 'sendDraft', id: d.id, caseId: cid(d.caseId) });
    setCase({ stage: Math.min(3, c.stage + 1) });
  };

  return (
    <div className="console">
      <header className="console-head">
        <div>
          <h1 className="h1">Captain console</h1>
          <p className="muted">The captain keeps the case. The tasks move.</p>
        </div>
        <div className="kpis" role="status">
          <span className={`kpi${unclaimed ? ' kpi-hot' : ''}`}>
            <b className="num">{unclaimed}</b> unclaimed
          </span>
          <span className="kpi">
            <b className="num">{waiting}</b> awaiting confirm
          </span>
          <span className="kpi">
            <b className="num">{pending}</b> updates to approve
          </span>
        </div>
      </header>

      <div className="segmented panel-switch" role="tablist" aria-label="Console sections">
        {(['queue', 'people', 'drafts', 'log'] as Panel[]).map((p) => (
          <button key={p} role="tab" aria-selected={panel === p} className="segment" onClick={() => setPanel(p)}>
            {{ queue: 'Tasks', people: 'People', drafts: 'Updates', log: 'Audit' }[p]}
          </button>
        ))}
      </div>

      <div className="console-grid">
        <section className={`panel panel-queue${panel === 'queue' ? ' is-shown' : ''}`} aria-labelledby="h-queue">
          <div className="panel-head">
            <h2 id="h-queue">Tasks waiting between teams</h2>
            <button className="btn btn-primary btn-sm" onClick={() => dispatch({ type: 'assignAll' })} disabled={!open.some((t) => t.status === 'unassigned')}>
              <Shuffle size={16} strokeWidth={2} /> Auto-assign all
            </button>
          </div>
          <p className="rule mono">Right skill · on shift · has room → fewest open tasks → tie: random → must confirm in 20 s (demo)</p>

          {open.length === 0 ? (
            <p className="empty">Nothing is waiting. Every task has a person.</p>
          ) : (
            <ul className="tasks">
              {open.map((t) => {
                const left = t.assignedAt ? CONFIRM_MS - (now - t.assignedAt) : 0;
                return (
                  <li key={t.id} className={`task task-${t.status}`}>
                    <div className="task-main">
                      <span className="task-title">
                        {t.title}
                        {t.flag && <span className="chip chip-flag">{t.flag}: person approves</span>}
                      </span>
                      <span className="task-meta mono">
                        {cid(t.caseId)} · {t.team}
                      </span>
                    </div>
                    <div className="task-clock mono" title="Time since the task was created">
                      {clock(now - t.createdAt)}
                    </div>
                    <div className="task-state">
                      {t.status === 'unassigned' && <span className="state state-idle">Unclaimed</span>}
                      {t.status === 'assigned' && (
                        <span className="state state-wait">
                          {nameOf(t.assignee)} · confirm in <span className="mono">{Math.max(0, Math.min(CONFIRM_MS / 1000, Math.ceil(left / 1000)))}s</span>
                        </span>
                      )}
                      {t.status === 'confirmed' && (
                        <span className="state state-ok">
                          <Check size={14} strokeWidth={3} /> {nameOf(t.assignee)} has it
                        </span>
                      )}
                      {t.status === 'escalated' && (
                        <span className="state state-alert">
                          <AlertTriangle size={14} strokeWidth={2.25} /> Lead {LEADS[t.team]} alerted
                        </span>
                      )}
                    </div>
                    <div className="task-action">
                      {t.status === 'unassigned' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'assign', id: t.id })}>
                          Assign
                        </button>
                      )}
                      {t.status === 'assigned' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'confirm', id: t.id })}>
                          Confirm as {nameOf(t.assignee)}
                        </button>
                      )}
                      {t.status === 'confirmed' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'complete', id: t.id })}>
                          Mark done
                        </button>
                      )}
                      {t.status === 'escalated' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => dispatch({ type: 'assign', id: t.id })}>
                          Reassign
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={`panel panel-people${panel === 'people' ? ' is-shown' : ''}`} aria-labelledby="h-people">
          <div className="panel-head">
            <h2 id="h-people">Who has room</h2>
          </div>
          <ul className="people">
            {s.staff.map((p) => (
              <li key={p.id} className={`person${!p.onShift ? ' is-off' : ''}`}>
                <span className="avatar avatar-sm">{p.name[0]}</span>
                <span className="person-name">
                  {p.name}
                  <span className="muted">{p.team}</span>
                </span>
                <span className="load" aria-label={`${p.open} of ${p.cap} open tasks`}>
                  {Array.from({ length: p.cap }, (_, i) => (
                    <i key={i} className={i < p.open ? 'on' : ''} />
                  ))}
                </span>
                <span className="person-state mono">{!p.onShift ? 'off' : p.open >= p.cap ? 'full' : `${p.open}/${p.cap}`}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`panel panel-drafts${panel === 'drafts' ? ' is-shown' : ''}`} aria-labelledby="h-drafts">
          <div className="panel-head">
            <h2 id="h-drafts">Plain updates to approve</h2>
          </div>
          <ul className="drafts">
            {s.drafts.map((d) => (
              <li key={d.id} className={`draft${d.sent ? ' is-sent' : ''}`}>
                <p className="draft-in mono">
                  {d.from}: “{d.note}”
                </p>
                <dl className="draft-out">
                  <div>
                    <dt>What happened</dt>
                    <dd>{d.happened}</dd>
                  </div>
                  <div>
                    <dt>Who owns it</dt>
                    <dd>Mei</dd>
                  </div>
                  <div>
                    <dt>Next</dt>
                    <dd>{d.next}</dd>
                  </div>
                  <div>
                    <dt>When</dt>
                    <dd>{d.when}</dd>
                  </div>
                </dl>
                {d.needsPerson && !d.sent && (
                  <p className="chip chip-flag">
                    <AlertTriangle size={13} strokeWidth={2.25} /> {d.needsPerson}
                  </p>
                )}
                <div className="draft-actions">
                  {d.sent ? (
                    <span className="state state-ok">
                      <Check size={14} strokeWidth={3} /> Sent · <a href="#/track">view tracker</a>
                    </span>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => sendDraft(d)}>
                      Approve and send as Mei
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={`panel panel-log${panel === 'log' ? ' is-shown' : ''}`} aria-labelledby="h-log">
          <div className="panel-head">
            <h2 id="h-log">Audit trail</h2>
            <button className="link-btn" onClick={() => dispatch({ type: 'reset' })}>
              Reset demo
            </button>
          </div>
          <ol className="log">
            {s.log.map((l, i) => (
              <li key={`${l.at}-${i}`}>
                <span className="mono">{time(l.at)}</span>
                <span>{l.text}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <p className="footnote">Illustrative demo data. People, tasks and the 20-second confirm window are examples for the pilot.</p>
    </div>
  );
}
