'use client';
import { useEffect, useRef } from 'react';
import { C, alpha } from './ui';

/**
 * The four-digit code, as four boxes.
 *
 * It replaces a single text field with wide letter-spacing, which looked the
 * part but behaved badly: there was no sense of progress, a wrong digit meant
 * re-reading the whole string, and — the real cost — phones would not offer to
 * fill it. `autocomplete="one-time-code"` is what makes iOS put the code above
 * the keyboard and Android offer it from the SMS, and it only works on an
 * input the browser recognises as the code field.
 *
 * Paste is handled on every box, because people paste the whole code into
 * whichever one happens to be focused.
 */
export default function OtpInput({
  value, onChange, length = 4, autoFocus = false, invalid = false, onComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  autoFocus?: boolean;
  invalid?: boolean;
  onComplete?: (v: string) => void;
}) {
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  useEffect(() => {
    if (autoFocus) boxes.current[0]?.focus();
  }, [autoFocus]);

  function set(next: string) {
    const clean = next.replace(/\D/g, '').slice(0, length);
    onChange(clean);
    if (clean.length === length) {
      boxes.current[length - 1]?.blur();
      onComplete?.(clean);
    }
  }

  function onKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i].trim() && i > 0) {
      boxes.current[i - 1]?.focus();
      set(value.slice(0, i - 1));
      e.preventDefault();
    }
    // The boxes read right-to-left on screen but the code is still typed and
    // stored left-to-right, so the arrows have to be swapped to feel right.
    if (e.key === 'ArrowLeft') boxes.current[Math.min(i + 1, length - 1)]?.focus();
    if (e.key === 'ArrowRight') boxes.current[Math.max(i - 1, 0)]?.focus();
  }

  function onInput(i: number, raw: string) {
    const typed = raw.replace(/\D/g, '');
    if (!typed) return;
    if (typed.length > 1) { set(typed); boxes.current[Math.min(typed.length, length - 1)]?.focus(); return; }
    const next = (value.slice(0, i) + typed + value.slice(i + 1)).slice(0, length);
    set(next);
    if (i < length - 1) boxes.current[i + 1]?.focus();
  }

  return (
    <div className="otp" dir="ltr" role="group" aria-label="کد تایید پیامک‌شده">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { boxes.current[i] = el; }}
          value={d.trim()}
          onChange={(e) => onInput(i, e.target.value)}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={(e) => { e.preventDefault(); set(e.clipboardData.getData('text')); }}
          onFocus={(e) => e.target.select()}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`رقم ${i + 1} از ${length}`}
          style={{
            background: C.surfaceSolid,
            color: C.textStrong,
            boxShadow: `inset 0 0 0 ${d.trim() || invalid ? 2 : 1.5}px ${
              invalid ? alpha(C.statusExpired, 60) : d.trim() ? alpha(C.green, 55) : C.border}`,
          }}
        />
      ))}
      <style jsx>{`
        .otp{display:grid;grid-template-columns:repeat(${length},1fr);gap:10px}
        .otp input{
          width:100%;height:58px;border:0;outline:0;border-radius:15px;
          text-align:center;font:900 22px var(--font-sans);
          font-variant-numeric:tabular-nums;
          transition:box-shadow var(--dur-move,220ms) var(--ease-soft,ease),
                     transform var(--dur-press,120ms) var(--ease-soft,ease);
        }
        .otp input:focus{box-shadow:inset 0 0 0 2px var(--green), 0 0 0 4px color-mix(in srgb, var(--green) 18%, transparent)}
        .otp input:not(:placeholder-shown){transform:none}
        @media (max-width:360px){ .otp input{height:52px;font-size:19px} }
      `}</style>
    </div>
  );
}
