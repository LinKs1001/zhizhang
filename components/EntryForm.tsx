'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Check, ChevronDown, LockKeyhole, Mic, Sparkles, UserRound, Wallet, X } from 'lucide-react';
import { CURRENCIES, PAYMENT_METHODS, type AppCurrency, type PaymentMethod } from '@/lib/constants';
import { formatDateZh, formatMonthZh, todayInAppTZ } from '@/lib/date';
import { formatMoney } from '@/lib/money';

type Member = { id: string; displayName: string };
type Category = { id: string; name: string; type: 'expense' | 'income'; emoji: string; color: string };
type Initial = {
  id: string;
  type: 'expense' | 'income';
  amount: string;
  currency: string;
  categoryId: string;
  memberId: string;
  occurredOn: string;
  note: string;
  paymentMethod: PaymentMethod;
  scope: 'joint' | 'personal';
  visibility: 'shared' | 'private';
};

type Props = {
  members: Member[];
  categories: Category[];
  currentUserId: string;
  today?: string;
  initial?: Initial;
};

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type AudioCapture = {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  stream: MediaStream;
  chunks: Float32Array[];
};

export function EntryForm({ members, categories: allCategories, currentUserId, today = todayInAppTZ(), initial }: Props) {
  const router = useRouter();
  const editing = Boolean(initial);
  const [text, setText] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(initial?.type || 'expense');
  const [amount, setAmount] = useState(initial?.amount || '');
  const [currency, setCurrency] = useState<AppCurrency>((initial?.currency as AppCurrency) || 'CNY');
  const [categoryId, setCategoryId] = useState(initial?.categoryId || allCategories.find((item) => item.type === 'expense')?.id || '');
  const [memberId, setMemberId] = useState(initial?.memberId || currentUserId);
  const [occurredOn, setOccurredOn] = useState(initial?.occurredOn || today);
  const [note, setNote] = useState(initial?.note || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initial?.paymentMethod || 'wechat');
  const [scope, setScope] = useState<'joint' | 'personal'>(initial?.scope || 'joint');
  const [privateSpend, setPrivateSpend] = useState(initial?.visibility === 'private');
  const [source, setSource] = useState<'manual' | 'text' | 'voice'>('manual');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [recognized, setRecognized] = useState(editing ? false : false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [asrRecording, setAsrRecording] = useState(false);
  const [asrProcessing, setAsrProcessing] = useState(false);
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const voiceBaseRef = useRef('');
  const [exchangeRate, setExchangeRate] = useState<number | null>(currency === 'CNY' ? 1 : null);
  const [rateDate, setRateDate] = useState('');

  const categories = useMemo(() => allCategories.filter((item) => item.type === type), [allCategories, type]);
  const selectedCategory = allCategories.find((item) => item.id === categoryId) || categories[0];
  const selectedMember = members.find((item) => item.id === memberId);
  const amountNumber = Number(String(amount).replace(/,/g, ''));
  const convertedCents = Number.isFinite(amountNumber) && amountNumber > 0
    ? Math.round(amountNumber * (currency === 'CNY' ? 1 : (exchangeRate ?? 0)) * 100)
    : 0;

  useEffect(() => {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => RecognitionLike }).webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognition));
  }, []);

  useEffect(() => {
    if (!categories.some((item) => item.id === categoryId)) setCategoryId(categories[0]?.id || '');
  }, [categories, categoryId]);

  useEffect(() => {
    if (currency === 'CNY') {
      setExchangeRate(1);
      setRateDate(today);
      return;
    }
    let cancelled = false;
    setExchangeRate(null);
    fetch(`/api/fx?currency=${currency}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '汇率获取失败');
      if (!cancelled) { setExchangeRate(data.cnyPerUnit); setRateDate(data.rateDate); }
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : '汇率获取失败'); });
    return () => { cancelled = true; };
  }, [currency, today]);

  function startBrowserRecognition() {
    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => RecognitionLike }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('当前浏览器不支持语音转文字，请使用 Chrome、Edge 或手动输入');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = true;
    voiceBaseRef.current = text;
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) transcript += event.results[index][0].transcript;
      setText(`${voiceBaseRef.current}${voiceBaseRef.current ? ' ' : ''}${transcript}`.trim());
      setSource('voice');
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setError('没有听清，再试一次吧'); };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setError('');
  }

  function encodePcm16(chunks: Float32Array[]): Blob {
    const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
    const output = new ArrayBuffer(length * 2);
    const view = new DataView(output);
    let offset = 0;
    for (const chunk of chunks) {
      for (let index = 0; index < chunk.length; index += 1) {
        const sample = Math.max(-1, Math.min(1, chunk[index]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
        offset += 2;
      }
    }
    return new Blob([output], { type: 'audio/pcm' });
  }

  async function finishAsrCapture() {
    const capture = audioCaptureRef.current;
    if (!capture) return;
    audioCaptureRef.current = null;
    capture.processor.disconnect();
    capture.source.disconnect();
    capture.stream.getTracks().forEach((track) => track.stop());
    await capture.context.close();
    setAsrRecording(false);
    setAsrProcessing(true);
    try {
      const response = await fetch('/api/speech/transcribe', { method: 'POST', headers: { 'content-type': 'audio/pcm' }, body: encodePcm16(capture.chunks) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '语音识别失败');
      setText(data.text);
      setSource('voice');
      setRecognized(false);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '语音识别失败');
      if (voiceSupported) startBrowserRecognition();
    } finally {
      setAsrProcessing(false);
    }
  }

  async function toggleVoice() {
    if (asrProcessing) return;
    if (asrRecording) {
      await finishAsrCapture();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext({ sampleRate: 16_000 });
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const capture: AudioCapture = { context, source, processor, stream, chunks: [] };
      processor.onaudioprocess = (event) => capture.chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      source.connect(processor);
      processor.connect(context.destination);
      audioCaptureRef.current = capture;
      setAsrRecording(true);
      setError('');
    } catch {
      if (voiceSupported) startBrowserRecognition();
      else setError('无法访问麦克风，请允许权限后重试');
    }
  }

  async function parseText() {
    if (!text.trim()) { setError('先描述一下这笔收支吧'); return; }
    setParsing(true);
    setError('');
    try {
      const response = await fetch('/api/smart/parse', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }) });
      const draft = await response.json();
      if (!response.ok) throw new Error(draft.error || '没有识别成功');
      setType(draft.type);
      setAmount(String(draft.amountText));
      setCurrency(draft.currency);
      setOccurredOn(draft.occurredOn);
      setPaymentMethod(draft.paymentMethod);
      setScope(draft.scope);
      setNote(draft.note || text);
      if (draft.categoryId) setCategoryId(draft.categoryId);
      else {
        const fallback = allCategories.find((item) => item.type === draft.type);
        if (fallback) setCategoryId(fallback.id);
      }
      setRecognized(true);
      setSource(source === 'voice' ? 'voice' : 'text');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '没有识别成功，请手动填写');
    } finally {
      setParsing(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (!selectedCategory) throw new Error('请选择分类');
      if (!amount || convertedCents <= 0) throw new Error('请输入有效金额');
      const response = await fetch(editing ? `/api/transactions/${initial!.id}` : '/api/transactions', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type,
          amount,
          currency,
          categoryId: selectedCategory.id,
          memberId,
          occurredOn,
          note,
          paymentMethod,
          scope,
          visibility: privateSpend ? 'private' : 'shared',
          source,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '保存失败');
      router.push('/');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="entry-layout" onSubmit={save}>
      <header className="page-head entry-head">
        <div><p className="eyebrow"><Sparkles size={14} />语音 / 文字记账</p><h1>{editing ? '修改账目' : '说一句，就记好了'}</h1><p>金额、分类和时间，我来帮你整理。</p></div>
      </header>

      {!editing && (
        <section className="prompt-card">
          <div className="prompt-top"><span>语音或文字输入</span>{recognized && <em><Check size={12} />已识别</em>}</div>
          <textarea value={text} onChange={(event) => { setText(event.target.value); setSource('text'); }} rows={2} maxLength={300} placeholder="例如：昨天盒马买菜 128.5，微信付的" />
          <div className="voice-line">
            <button type="button" className={asrRecording || listening ? 'voice-button listening' : 'voice-button'} onClick={toggleVoice} aria-label={asrRecording || listening ? '停止语音输入' : '开始语音输入'}>{asrProcessing || asrRecording || listening ? <span className="pulse" /> : <Mic size={18} />}</button>
            <div className="voice-wave" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
            <span>{asrProcessing ? '正在识别…' : asrRecording || listening ? '正在聆听…' : 'Paraformer 语音转文字'}</span>
            <button type="button" className="button small ghost" onClick={parseText} disabled={parsing || !text.trim()}>{parsing ? '识别中…' : '识别'}</button>
          </div>
        </section>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="entry-grid">
        <section className="entry-main-card">
          <div className="segmented type-switch"><button type="button" className={type === 'expense' ? 'active' : ''} onClick={() => setType('expense')}>支出</button><button type="button" className={type === 'income' ? 'active' : ''} onClick={() => setType('income')}>收入</button></div>
          <div className="amount-currency">
            <label className="field amount-field"><span>金额</span><div className="amount-input"><b>{CURRENCIES[currency].symbol}</b><input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" required /></div></label>
            <label className="field currency-field"><span>币种</span><div className="select-wrap"><select value={currency} onChange={(event) => setCurrency(event.target.value as AppCurrency)}>{Object.entries(CURRENCIES).map(([code, item]) => <option key={code} value={code}>{item.label}</option>)}</select><ChevronDown size={14} /></div></label>
          </div>
          {currency !== 'CNY' && <p className="rate-note">{exchangeRate ? `${CURRENCIES[currency].label}按 ${rateDate || '今日'}汇率折算：约 ${formatMoney(convertedCents)}` : '正在获取今日汇率…'}</p>}
          <div className="form-grid">
            <label className="field"><span>分类</span><div className="select-wrap"><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.map((item) => <option key={item.id} value={item.id}>{item.emoji} {item.name}</option>)}</select><ChevronDown size={14} /></div></label>
            <label className="field"><span>日期</span><div className="input-with-icon"><CalendarDays size={15} /><input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} max={today} required /></div></label>
            <label className="field"><span>支付方式</span><div className="select-wrap"><select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>{Object.entries(PAYMENT_METHODS).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select><ChevronDown size={14} /></div></label>
            <label className="field"><span>记账成员</span><div className="select-wrap"><select value={memberId} onChange={(event) => setMemberId(event.target.value)}>{members.map((member) => <option key={member.id} value={member.id}>{member.displayName}</option>)}</select><ChevronDown size={14} /></div></label>
          </div>
          <label className="field"><span>备注</span><div className="input-with-icon"><Wallet size={15} /><input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="可选，记录一点细节" /></div></label>
          <div className="scope-block"><span className="field-label">这笔账属于</span><div className="segmented"><button type="button" className={scope === 'joint' ? 'active' : ''} onClick={() => setScope('joint')}>共同</button><button type="button" className={scope === 'personal' ? 'active' : ''} onClick={() => setScope('personal')}>个人</button></div></div>
        </section>

        <aside className="entry-side">
          <section className="preview-card">
            <p className="eyebrow">录入预览</p>
            <div className="preview-main"><span className="category-orb large" style={{ backgroundColor: selectedCategory ? `${selectedCategory.color}25` : undefined }}>{selectedCategory?.emoji || '✨'}</span><div><strong>{selectedCategory?.name || '选择一个分类'}</strong><small>{formatMonthZh(occurredOn.slice(0, 7))} · {formatDateZh(occurredOn)}</small></div></div>
            <strong className="preview-amount">{formatMoney(convertedCents)}</strong>
            <div className="preview-meta"><span>{type === 'expense' ? '支出' : '收入'}</span><span>{PAYMENT_METHODS[paymentMethod]}</span><span>{selectedMember?.displayName}</span></div>
          </section>
          <label className={privateSpend ? 'privacy-card on' : 'privacy-card'}>
            <span className="privacy-orb">🔒</span>
            <span><strong>隐私消费</strong><small>{privateSpend ? '仅自己可见，不进入共同账本' : '开启后仅自己可见'}</small></span>
            <input type="checkbox" checked={privateSpend} onChange={(event) => setPrivateSpend(event.target.checked)} /><span className="switch" />
          </label>
          <button className="button primary wide save-button" disabled={saving}>{saving ? '保存中…' : editing ? '保存修改' : '确认入账'}<Check size={17} /></button>
          <p className="form-tip center">{privateSpend ? '这笔账只有你能看到，不进入共同账本。' : '确认后，另一位成员会同步看到这笔账。'}</p>
        </aside>
      </div>
    </form>
  );
}


