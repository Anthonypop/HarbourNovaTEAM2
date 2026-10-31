import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Mic, Square } from 'lucide-react';
import { detectTopics, setCase, topicOf, type Topic, type TopicKey } from '../store';

type Step = 'tell' | 'ask' | 'readback' | 'done';

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getRecognizer(): SR | null {
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const SAMPLE = "I can't log in. And my bill looks wrong.";

export function Speak() {
  const [step, setStep] = useState<Step>('tell');
  const [text, setText] = useState('');
  const [topics, setTopics] = useState<Topic[]>([]);
  const [focus, setFocus] = useState<TopicKey | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');
  const [caseId, setCaseId] = useState('');
  const recRef = useRef<SR | null>(null);
  const voiceSupported = typeof window !== 'undefined' && getRecognizer() !== null;

  useEffect(() => () => recRef.current?.stop(), []);

  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = getRecognizer();
    if (!rec) return;
    const base = text ? `${text.trim()} ` : '';
    rec.lang = navigator.language || 'en-GB';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let said = '';
      for (let i = 0; i < e.results.length; i++) said += e.results[i][0].transcript;
      setText(base + said);
    };
    rec.onend = () => setListening(false);
    rec.onerror = (e) => {
      setListening(false);
      setVoiceNote(e.error === 'not-allowed' ? 'Microphone blocked. You can type instead.' : 'Voice stopped. You can type instead.');
    };
    recRef.current = rec;
    setVoiceNote('');
    setListening(true);
    rec.start();
  };

  const submitStory = () => {
    recRef.current?.stop();
    const found = detectTopics(text);
    setTopics(found);
    setFocus(found[0]?.key ?? null);
    setStep(found.length === 1 ? 'readback' : 'ask');
  };

  const heard = topics.length ? topics.map((t) => t.heard) : [`You told us: “${text.trim().slice(0, 90)}”`];

  const confirm = () => {
    const id = `HN-26-0${481 + Math.floor(Math.random() * 90)}`;
    setCaseId(id);
    setCase({ id, story: text.trim(), topics: topics.map((t) => t.key), focus, owner: 'Mei', stage: 0, customer: 'You' });
    setStep('done');
  };

  const restart = () => {
    setStep('tell');
    setTopics([]);
    setFocus(null);
  };

  return (
    <div className="speak">
      <ol className="speak-progress" aria-label="Progress">
        {(['tell', 'ask', 'readback', 'done'] as Step[]).map((s, i) => (
          <li key={s} className={s === step ? 'is-current' : ['tell', 'ask', 'readback', 'done'].indexOf(step) > i ? 'is-done' : ''} />
        ))}
      </ol>

      {step === 'tell' && (
        <section className="speak-card" aria-labelledby="q-tell">
          <p className="speaker">NovaClear</p>
          <h1 id="q-tell" className="question">
            Tell me what is wrong, in your own words.
          </h1>

          <div className="composer">
            <label className="sr-only" htmlFor="story">
              Your story
            </label>
            <textarea
              id="story"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={listening ? 'Listening…' : 'Type or tap the microphone'}
            />
            <div className="composer-row">
              <button
                className={`mic${listening ? ' is-live' : ''}`}
                onClick={toggleVoice}
                disabled={!voiceSupported}
                aria-pressed={listening}
                aria-label={listening ? 'Stop listening' : 'Speak your story'}
                title={voiceSupported ? undefined : 'Voice is not supported in this browser. Type instead.'}
              >
                {listening ? <Square size={18} strokeWidth={2} /> : <Mic size={20} strokeWidth={1.75} />}
              </button>
              <button className="btn btn-primary" onClick={submitStory} disabled={text.trim().length < 6}>
                Send <ArrowRight size={18} strokeWidth={2} />
              </button>
            </div>
          </div>

          <p className="hint" aria-live="polite">
            {voiceNote || (voiceSupported ? 'Say it once. You will not be asked again.' : 'Voice needs Chrome, Edge or Safari. Typing works everywhere.')}
          </p>
          {!text && (
            <button className="link-btn" onClick={() => setText(SAMPLE)}>
              Use the demo story
            </button>
          )}
        </section>
      )}

      {step === 'ask' && (
        <section className="speak-card" aria-labelledby="q-ask">
          <p className="said">“{text.trim()}”</p>
          <p className="speaker">NovaClear · one question</p>
          <h1 id="q-ask" className="question">
            {topics.length > 1 ? 'What matters most right now?' : 'Does this need fixing today?'}
          </h1>
          <div className="choices">
            {topics.length > 1 ? (
              topics.map((t) => (
                <button
                  key={t.key}
                  className="choice"
                  onClick={() => {
                    setFocus(t.key);
                    setStep('readback');
                  }}
                >
                  {t.focus}
                </button>
              ))
            ) : (
              <>
                <button className="choice" onClick={() => setStep('readback')}>
                  Yes, today
                </button>
                <button className="choice" onClick={() => setStep('readback')}>
                  This week is fine
                </button>
              </>
            )}
          </div>
        </section>
      )}

      {step === 'readback' && (
        <section className="speak-card" aria-labelledby="q-read">
          <p className="speaker">NovaClear</p>
          <h1 id="q-read" className="question">
            Here is what I heard.
          </h1>
          <ul className="heard">
            {heard.map((h) => (
              <li key={h}>{h}</li>
            ))}
            {focus && topics.length > 1 && <li className="heard-focus">{topicOf(focus)?.focus} comes first.</li>}
          </ul>
          <p className="question question-sm">Is that right?</p>
          <div className="choices">
            <button className="btn btn-primary" onClick={confirm}>
              Yes, that is right
            </button>
            <button className="btn btn-ghost" onClick={restart}>
              Change it
            </button>
          </div>
        </section>
      )}

      {step === 'done' && (
        <section className="speak-card speak-done" aria-labelledby="q-done">
          <div className="tag tag-static">
            <span className="tag-hole" />
            <span className="tag-id mono">{caseId}</span>
            <span className="tag-rule" />
            <span className="tag-owner">
              <span className="avatar">M</span>
              <span>Case Captain: Mei</span>
            </span>
          </div>
          <h1 id="q-done" className="question">
            Mei now owns your case.
          </h1>
          <p className="lede">Mei has your full story. You will not need to tell it again.</p>
          <a className="btn btn-primary" href="#/track">
            Track my case <ArrowRight size={18} strokeWidth={2} />
          </a>
        </section>
      )}

      <p className="footnote">Demo. Your words stay in this browser; voice uses your browser’s speech service.</p>
    </div>
  );
}
