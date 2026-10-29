'use client';

import { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

export function AskBox() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;
    setPending(true);
    setError('');
    setAnswer('');
    try {
      const response = await fetch('/api/smart/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '暂时无法回答');
      setAnswer(data.answer);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '暂时无法回答');
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="ask-card">
      <div className="summary-title"><Sparkles size={15} />问一问</div>
      <p>比如：这个月餐饮花了多少？</p>
      <form onSubmit={ask}><input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={200} placeholder="问问你的家庭账本" /><button className="button primary small" disabled={pending} aria-label="发送问题">{pending ? '思考中…' : <ArrowRight size={16} />}</button></form>
      {answer && <div className="ask-answer">{answer}</div>}
      {error && <p className="form-error">{error}</p>}
    </section>
  );
}
