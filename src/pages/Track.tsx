import { Check } from 'lucide-react';
import { STAGES, resetCase, setCase, updateFor, useCase } from '../store';

export function Track() {
  const c = useCase();
  const u = updateFor(c);
  const rows: [string, string][] = [
    ['What happened', u.happened],
    ['Who owns it', u.who],
    ['What happens next', u.next],
    ['When', u.when],
  ];

  return (
    <div className="track">
      <section className="tag tag-hero" aria-label="Your case owner">
        <span className="tag-hole" />
        <span className="avatar avatar-lg" aria-hidden="true">
          {c.owner[0]}
        </span>
        <h1 className="owner-line">{c.owner} owns your case.</h1>
        <p className="owner-sub">{c.stage >= 3 ? 'Same person, start to finish.' : 'Same person until it is fixed.'}</p>
      </section>

      <ol className="steps" aria-label="Progress">
        {STAGES.map((s, i) => {
          const state = i < c.stage || c.stage === 3 ? 'done' : i === c.stage ? 'current' : 'todo';
          return (
            <li key={s} className={`step step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              <span className="step-mark" aria-hidden="true">
                {state === 'done' && <Check size={14} strokeWidth={3} />}
              </span>
              <span className="step-label">{s}</span>
            </li>
          );
        })}
      </ol>

      <dl className="update">
        {rows.map(([k, v]) => (
          <div key={k} className="update-row">
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>

      <p className="calm">{c.stage >= 3 ? 'Your case is closed.' : 'You do not need to do anything.'}</p>

      <div className="demo-controls">
        <span className="mono">Demo</span>
        <button className="link-btn" onClick={() => setCase({ stage: Math.min(3, c.stage + 1) })} disabled={c.stage >= 3}>
          Next update
        </button>
        <button className="link-btn" onClick={resetCase}>
          Reset
        </button>
      </div>
    </div>
  );
}
