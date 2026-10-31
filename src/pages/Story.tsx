import { useEffect, useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { useReducedMotion } from '../useReducedMotion';

type Mode = 'before' | 'after';

const LANES = [10, 30, 50, 70, 90];
const SLIPS = ['Check account', 'Review bill', 'Reset login', 'Test access', 'Confirm fix'];
const HOPS = [26, 38, 50, 62, 74];
const AFTER_STEPS = 11;
const BEFORE_STEPS = 5;

export function Story() {
  const [mode, setMode] = useState<Mode>('after');
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);
  const reduce = useReducedMotion();
  const total = mode === 'after' ? AFTER_STEPS : BEFORE_STEPS;

  useEffect(() => {
    if (reduce) {
      setStep(total);
      return;
    }
    setStep(0);
    let s = 0;
    const id = window.setInterval(
      () => {
        s += 1;
        setStep(s);
        if (s >= total) window.clearInterval(id);
      },
      mode === 'after' ? 620 : 1150,
    );
    return () => window.clearInterval(id);
  }, [mode, run, reduce, total]);

  const done = step >= total;

  // After: slip i goes out on step 2i+1 and comes back on step 2i+2.
  const slipState = (i: number): 'idle' | 'out' | 'back' => {
    if (mode !== 'after' || step === 0) return 'idle';
    const active = Math.floor((step - 1) / 2);
    const phase = (step - 1) % 2;
    if (i < active || done) return 'back';
    if (i === active) return phase === 0 ? 'out' : 'back';
    return 'idle';
  };
  const backCount = SLIPS.filter((_, i) => slipState(i) === 'back').length;
  const activeSlip = mode === 'after' && !done && step > 0 ? Math.floor((step - 1) / 2) : -1;

  // Before: the case itself hops from team to team.
  const hop = Math.min(step, 4);
  const currentLane = mode === 'before' ? hop : activeSlip;

  return (
    <div className="story">
      <section className="hero">
        <div className="hero-copy">
          <h1 className="display">
            <span className="display-line">Pass the work.</span>
            <span className="display-quiet">Not the customer.</span>
          </h1>
          <p className="lede">Case HN-26-0135, played twice.</p>

          <div className="hero-controls">
            <div className="segmented" role="radiogroup" aria-label="Show the case">
              {(['before', 'after'] as Mode[]).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  className="segment"
                  onClick={() => {
                    setMode(m);
                    setRun((r) => r + 1);
                  }}
                >
                  {m === 'before' ? 'Before' : 'After'}
                </button>
              ))}
            </div>
            <button className="icon-btn" onClick={() => setRun((r) => r + 1)} aria-label="Replay">
              <RotateCcw size={18} strokeWidth={1.75} />
            </button>
          </div>

          <div className="cta-row">
            <a className="btn btn-primary" href="#/speak">
              Try it as a customer
            </a>
            <a className="btn btn-ghost" href="#/console">
              Open Captain console
            </a>
          </div>
        </div>

        <div className="hero-visual">
          <div className={`stage stage-${mode}`} aria-hidden="true">
            {LANES.map((x, i) => (
              <div key={i} className={`lane${currentLane === i ? ' is-current' : ''}`} style={{ left: `${x}%` }}>
                <span className="lane-label">Team {i + 1}</span>
              </div>
            ))}

            {mode === 'after' && (
              <svg className="wires" viewBox="0 0 1000 600" preserveAspectRatio="none">
                {LANES.map((x, i) => {
                  const st = slipState(i);
                  return (
                    <path
                      key={i}
                      d={`M500 350 C 500 260, ${x * 10} 250, ${x * 10} 150`}
                      className={`wire wire-${st}`}
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
            )}

            {mode === 'after' &&
              SLIPS.map((label, i) => {
                const st = slipState(i);
                return (
                  <div key={label} className={`slip slip-${st}`} style={{ left: `${LANES[i]}%` }}>
                    {st === 'back' ? <Check className="slip-check" strokeWidth={3} /> : st === 'out' ? <i className="slip-dot" /> : null}
                    {label}
                  </div>
                );
              })}

            {mode === 'before' && step >= 1 && step <= 4 && (
              <div className="bubble" key={`b${hop}`} style={{ left: `${HOPS[hop]}%` }}>
                “Can you explain again?”
              </div>
            )}

            <div className="tag" style={{ left: `${mode === 'before' ? HOPS[hop] : 50}%` }}>
              <span className="tag-hole" />
              <span className="tag-id mono">HN-26-0135</span>
              <span className="tag-rule" />
              <span className="tag-owner">
                <span className="avatar">{mode === 'before' ? hop + 1 : 'M'}</span>
                <span>{mode === 'before' ? `Owner ${hop + 1}` : 'Case Captain: Mei'}</span>
              </span>
            </div>
          </div>

          <dl className="counters" aria-live="polite">
            {mode === 'after' ? (
              <>
                <div className="counter">
                  <dt>Owner changes</dt>
                  <dd className="num">0</dd>
                </div>
                <div className="counter">
                  <dt>Teams helped</dt>
                  <dd className="num">{backCount}</dd>
                </div>
                <div className="counter">
                  <dt>Story told</dt>
                  <dd className="num">1</dd>
                </div>
              </>
            ) : (
              <>
                <div className="counter">
                  <dt>Owner changes</dt>
                  <dd className="num">{hop}</dd>
                </div>
                <div className="counter">
                  <dt>Hours</dt>
                  <dd className="num">{done ? '51.0' : '·'}</dd>
                </div>
                <div className="counter">
                  <dt>Satisfaction</dt>
                  <dd className="num">{done ? '1/5' : '·'}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </section>

      <section className="proof" aria-label="Evidence">
        <div className="fact">
          <span className="fact-num num">46%</span>
          <span className="fact-text">had to repeat their story</span>
          <span className="fact-src">Customer Feedback · 55 of 120</span>
        </div>
        <div className="fact">
          <span className="fact-num num">29%</span>
          <span className="fact-text">contacted HarbourNova again</span>
          <span className="fact-src">Service Request Data · 139 of 480</span>
        </div>
        <div className="fact">
          <span className="fact-num num">642 h</span>
          <span className="fact-text">waiting, against about 201 h of work</span>
          <span className="fact-src">Process Timeline</span>
        </div>
        <figure className="quote">
          <blockquote>“One person kept us updated throughout.”</blockquote>
          <figcaption className="fact-src">HN-26-0102 · 4 teams · 0 owner changes · 36.7 h · 4/5</figcaption>
        </figure>
      </section>

      <p className="footnote">
        Illustrative demo. Case figures come from the HarbourNova case pack; team and task names are examples.
      </p>
    </div>
  );
}
