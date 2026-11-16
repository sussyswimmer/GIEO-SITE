'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextArea, TextField } from '@/components/ui/Field';
import { EMAIL } from '@/lib/site';

export type ContactFormLabels = { name: string; email: string; message: string; submit: string; note: string };

type Control = HTMLInputElement | HTMLTextAreaElement;

/**
 * No backend: submit opens the visitor's mail app with a mailto. There is deliberately no
 * action="mailto:" fallback: Chrome reports it as mixed content on HTTPS (Best Practices 77). Without JS
 * the form is hidden and the email and social links beside it remain. Strings come from the server parent.
 */
export function ContactForm({ labels, siteName }: { labels: ContactFormLabels; siteName: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const email = String(data.get('email') ?? '').trim();
    const message = String(data.get('message') ?? '').trim();
    const subject = `${siteName} · ${name}`;
    const body = `${message}\n\n${name} <${email}>`;
    location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  // Invalid state (DESIGN.md §5): the browser's validationMessage under the field until
  // contact.form.errors.* exist (PLAN.md §6). Cancelling 'invalid' drops the native bubble and the
  // browser's focus, so the first invalid field takes focus itself.
  function invalid(e: FormEvent<HTMLFormElement>) {
    const el = e.target as Control;
    e.preventDefault();
    setErrors((prev) => ({ ...prev, [el.name]: el.validationMessage }));
    if (el.form?.querySelector(':invalid') === el) el.focus();
  }

  // After a failed submit, the message follows the field as it is corrected.
  function change(e: FormEvent<HTMLFormElement>) {
    const el = e.target as Control;
    if (errors[el.name]) setErrors((prev) => ({ ...prev, [el.name]: el.validationMessage }));
  }

  return (
    <form id="contact-form" onSubmit={send} onInvalid={invalid} onChange={change}>
      <noscript>
        <style>{'#contact-form{display:none}'}</style>
      </noscript>
      <div className="flex flex-col gap-6">
        <TextField name="name" label={labels.name} autoComplete="name" required error={errors.name} />
        <TextField
          name="email"
          type="email"
          label={labels.email}
          autoComplete="email"
          required
          error={errors.email}
        />
        <TextArea name="message" label={labels.message} required error={errors.message} />
      </div>
      <Button type="submit" variant="primary" className="mt-8">
        {labels.submit}
      </Button>
      <p className="mt-4 text-caption text-ink-soft">{labels.note}</p>
    </form>
  );
}
