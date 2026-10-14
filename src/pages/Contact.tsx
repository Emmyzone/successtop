import { useRef, useState } from 'react';
import { Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import Seo from '../components/Seo';
import { useSettings } from '../context/SettingsContext';
import { supabase, supabaseConfigured } from '../lib/supabase';
import { friendlyError } from '../lib/errors';
import { GENERAL_ORDER_MESSAGE, waLink } from '../lib/whatsapp';

const TYPES = [
  { value: 'general', label: 'General enquiry' },
  { value: 'bulk_bread', label: 'Bulk bread supply' },
  { value: 'reseller', label: 'Reseller enquiry' },
  { value: 'catering', label: 'Catering or special occasion order' },
];

export default function Contact() {
  const { settings, branches, whatsappNumber } = useSettings();
  const [form, setForm] = useState({ name: '', contact: '', type: 'general', branchId: '', message: '', website: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');
  const lastSent = useRef('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === 'sending') return;
    if (form.website) return; // honeypot: real people never fill this hidden field

    const name = form.name.trim();
    const contact = form.contact.trim();
    const message = form.message.trim();
    if (!name) return fail('Please enter your name.');
    if (contact.length < 3) return fail('Please enter a phone number or email so we can reach you.');
    if (message.length < 5) return fail('Please write a short message (at least 5 characters).');

    const fingerprint = `${name}|${contact}|${form.type}|${message}`;
    if (fingerprint === lastSent.current) return fail('You already sent this message. We will get back to you soon.');
    if (!supabaseConfigured) return fail('The enquiry form is not connected yet. Please use WhatsApp instead.');

    setStatus('sending');
    setFeedback('');
    const branch = branches.find((b) => b.id === form.branchId);
    const { error } = await supabase.from('bst_enquiries').insert({
      name,
      contact,
      enquiry_type: form.type,
      message,
      preferred_branch_id: branch && !branch.id.startsWith('fallback') ? branch.id : null,
    });
    if (error) {
      setStatus('error');
      setFeedback(friendlyError(error) + ' You can also message us on WhatsApp.');
      return;
    }
    lastSent.current = fingerprint;
    setStatus('sent');
    setFeedback('Thank you. Your enquiry has been received and our team will reply using the contact details you gave.');
    setForm({ name: '', contact: '', type: 'general', branchId: '', message: '', website: '' });
  }

  function fail(msg: string) {
    setStatus('error');
    setFeedback(msg);
  }

  return (
    <div className="container-page py-10">
      <Seo title="Contact us" description="Call, WhatsApp or send an enquiry to SuccessTop in Ibadan." />
      <h1 className="text-4xl font-extrabold">Contact us</h1>
      <p className="mt-2 max-w-2xl text-muted">{settings.contact_callout}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <a href={waLink(whatsappNumber, GENERAL_ORDER_MESSAGE)} target="_blank" rel="noopener noreferrer" className="btn-primary w-full"><MessageCircle className="h-4 w-4" aria-hidden /> Chat on WhatsApp</a>
          <ul className="space-y-4 rounded-2xl border border-line p-6">
            <li className="flex gap-3"><Phone className="mt-0.5 h-5 w-5 text-crust" aria-hidden /><a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="font-semibold hover:text-crust">{settings.phone}</a></li>
            <li className="flex gap-3"><Mail className="mt-0.5 h-5 w-5 text-crust" aria-hidden /><a href={`mailto:${settings.email}`} className="font-semibold hover:text-crust">{settings.email}</a></li>
            {branches.map((b) => (
              <li key={b.id} className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-crust" aria-hidden /><span><span className="font-semibold">{b.name}</span><br /><span className="text-muted">{b.address}</span></span></li>
            ))}
          </ul>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line p-6" noValidate>
          <h2 className="text-2xl font-extrabold">Send an enquiry</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="f-name" className="label">Your name</label>
              <input id="f-name" className="field" value={form.name} onChange={set('name')} maxLength={120} autoComplete="name" required />
            </div>
            <div>
              <label htmlFor="f-contact" className="label">Phone or email</label>
              <input id="f-contact" className="field" value={form.contact} onChange={set('contact')} maxLength={160} autoComplete="tel" required />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="f-type" className="label">What is this about?</label>
              <select id="f-type" className="field" value={form.type} onChange={set('type')}>
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="f-branch" className="label">Preferred branch (optional)</label>
              <select id="f-branch" className="field" value={form.branchId} onChange={set('branchId')}>
                <option value="">No preference</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="f-msg" className="label">Message</label>
            <textarea id="f-msg" className="field" rows={5} value={form.message} onChange={set('message')} maxLength={2000} required />
          </div>
          {/* Honeypot field, hidden from people */}
          <div className="absolute -left-[9999px]" aria-hidden>
            <label htmlFor="f-web">Website</label>
            <input id="f-web" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
          </div>

          {feedback && (
            <p role={status === 'error' ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm ${status === 'sent' ? 'bg-crumb text-ink' : 'bg-red-50 text-red-900'}`}>{feedback}</p>
          )}
          <button type="submit" className="btn-primary" disabled={status === 'sending'}>{status === 'sending' ? 'Sending' : 'Send enquiry'}</button>
          <p className="text-xs text-muted">Your details are only visible to our staff.</p>
        </form>
      </div>
    </div>
  );
}
