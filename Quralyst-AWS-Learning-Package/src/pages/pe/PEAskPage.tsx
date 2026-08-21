// PE Ask the Market page (F39.2) — chat Q&A over the PE dataset with cited answers.
// Visual parity with QURALYST-20 MarketQa.tsx. Per-session turn state only (no persistence).
// Gated by RoleRoute role="pe_dataset".
import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Spinner } from '@/components/ui';
import { QaCitationCard } from '@/components/pe/qa/QaCitationCard';
import { isApiError } from '@/lib/authErrors';
import { peQaService } from '@/services/api';
import type { QaResponse } from '@/types';
import '@/styles/pages/pe-ask.css';

interface Turn {
  id: number;
  question: string;
  response?: QaResponse;
  error?: string;
  loading: boolean;
}

const SUGGESTIONS = [
  {
    text: 'Which firms exited industrial businesses in the last two years and are likely to redeploy capital?',
    icon: 'bi-building-up',
  },
  {
    text: 'Show me current healthcare holdings that look ready to come to market.',
    icon: 'bi-graph-up-arrow',
  },
  {
    text: 'Which firms are most actively acquiring in business services right now?',
    icon: 'bi-lightning-charge',
  },
  {
    text: 'Find partners focused on software at firms investing in Texas.',
    icon: 'bi-people-fill',
  },
];

function AnswerBlock({ turn, onRefine }: { turn: Turn; onRefine: (q: string) => void }) {
  const r = turn.response;
  return (
    <div className="qa-turn" data-testid="qa-turn">
      <div className="qa-user-row">
        <div className="qa-user-bubble" data-testid="qa-user-bubble">
          {turn.question}
        </div>
      </div>

      <div className="qa-assistant-row">
        <div className="qa-assistant-avatar" aria-hidden>
          <i className="bi bi-stars" />
        </div>
        <div className="qa-answer-col">
          {turn.loading ? (
            <div className="qa-loading" data-testid="qa-loading">
              <Spinner size="sm" />
              Planning and searching our dataset…
            </div>
          ) : null}

          {turn.error ? (
            <div className="qa-notice qa-notice--error" role="alert" data-testid="qa-error">
              <i className="bi bi-exclamation-circle qa-notice__icon" aria-hidden />
              <span>{turn.error}</span>
            </div>
          ) : null}

          {r && !r.answered ? (
            <div className="qa-notice qa-notice--warn" role="status" data-testid="qa-unsupported">
              <i className="bi bi-exclamation-circle qa-notice__icon" aria-hidden />
              <div>
                <p>{r.reason ?? "That question can't be answered from our dataset."}</p>
                {typeof r.recordCount === 'number' && r.recordCount === 0 && r.intent ? (
                  <p className="qa-notice__intent">Interpreted as: {r.intent}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {r && r.answered ? (
            <>
              <div className="qa-answer-card" data-testid="qa-answer">
                <div className="qa-answer-card__body">{r.answer}</div>
              </div>

              {r.citations && r.citations.length > 0 ? (
                <div data-testid="qa-citations">
                  <div className="qa-citations-label">
                    <i className="bi bi-stars" aria-hidden />
                    Cited records
                    {typeof r.recordCount === 'number' ? (
                      <span className="qa-match-badge" data-testid="qa-match-count">
                        {r.recordCount} match{r.recordCount === 1 ? '' : 'es'}
                      </span>
                    ) : null}
                  </div>
                  <div className="qa-citations-list">
                    {r.citations.map((c, i) => (
                      <QaCitationCard key={`${c.type}-${c.id}`} citation={c} index={i + 1} />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {r && !turn.loading ? (
            <button
              type="button"
              className="qa-refine"
              onClick={() => onRefine(turn.question)}
              data-testid="qa-refine"
            >
              Refine this question
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function PEAskPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const nextId = useRef(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const mutation = useMutation({
    mutationFn: (question: string) => peQaService.ask(question),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [turns]);

  function ask(question: string) {
    const q = question.trim();
    if (!q || mutation.isPending) return;
    const id = nextId.current++;
    setTurns((t) => [...t, { id, question: q, loading: true }]);
    setInput('');
    mutation.mutate(q, {
      onSuccess: (response) => {
        setTurns((t) =>
          t.map((turn) => (turn.id === id ? { ...turn, response, loading: false } : turn)),
        );
      },
      onError: (err) => {
        const msg = isApiError(err) ? err.message : 'Something went wrong.';
        setTurns((t) =>
          t.map((turn) => (turn.id === id ? { ...turn, error: msg, loading: false } : turn)),
        );
      },
    });
  }

  function refine(question: string) {
    setInput(question);
    inputRef.current?.focus();
  }

  return (
    <div className="qa-page">
      <div className="qa-header">
        <div className="qa-header__icon" aria-hidden>
          <i className="bi bi-chat-square-text" />
        </div>
        <div>
          <h1 className="qa-header__title">Ask the Market</h1>
          <p className="qa-header__subtitle">
            Ask anything about our firms, holdings, people, and recent activity. Answers cite the
            exact records.
          </p>
        </div>
      </div>

      <div className="qa-thread">
        {turns.length === 0 ? (
          <div className="qa-empty" data-testid="qa-empty">
            <div className="qa-empty__icon">
              <i className="bi bi-stars" aria-hidden />
            </div>
            <h2 className="qa-empty__title">Ask a market question</h2>
            <p className="qa-empty__blurb">
              Grounded entirely in our own portfolio dataset — no web research, no guesses.
            </p>
            <div className="qa-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  type="button"
                  className="qa-suggestion"
                  key={s.text}
                  onClick={() => ask(s.text)}
                  data-testid="qa-suggestion"
                >
                  <span className="qa-suggestion__icon" aria-hidden>
                    <i className={`bi ${s.icon}`} />
                  </span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="qa-turns">
            {turns.map((turn) => (
              <AnswerBlock key={turn.id} turn={turn} onRefine={refine} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="qa-composer">
        <form
          className="qa-composer__form"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <textarea
            id="qa-input"
            ref={inputRef}
            className="qa-composer__input"
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                ask(input);
              }
            }}
            placeholder="Ask about firms, holdings, people, or recent activity…"
            data-testid="qa-input"
          />
          <button
            type="submit"
            className="qa-composer__send"
            disabled={!input.trim() || mutation.isPending}
            aria-label="Send question"
            data-testid="qa-send"
          >
            {mutation.isPending ? <Spinner size="sm" /> : <i className="bi bi-send" aria-hidden />}
          </button>
        </form>
        <p className="qa-composer__footnote">
          Answers are generated from our dataset and cite the records used. Always verify against
          the linked records.
        </p>
      </div>
    </div>
  );
}
