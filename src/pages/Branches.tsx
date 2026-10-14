import { Clock, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import Seo from '../components/Seo';
import { useSettings } from '../context/SettingsContext';
import { GENERAL_ORDER_MESSAGE, toWhatsAppNumber, waLink } from '../lib/whatsapp';

export default function Branches() {
  const { branches, settings, whatsappNumber } = useSettings();

  return (
    <div className="container-page py-10">
      <Seo title="Our branches" description="Visit SuccessTop at Arapaja or Idioya, Odo Ona Elewe, Ibadan." />
      <h1 className="text-4xl font-extrabold">Our branches</h1>
      <p className="mt-2 max-w-2xl text-muted">Two branches at Odo Ona Elewe, Ibadan. Pick whichever is closer to you when you place an order.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {branches.map((b) => {
          const wa = toWhatsAppNumber(b.whatsapp_number || '') || whatsappNumber;
          const phone = b.phone || settings.phone;
          return (
            <article key={b.id} className="rounded-2xl border border-line p-6">
              <h2 className="text-2xl font-extrabold">{b.name}</h2>
              <ul className="mt-4 space-y-3 text-muted">
                <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-crust" aria-hidden />{b.address}</li>
                <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-crust" aria-hidden /><a href={`tel:${phone.replace(/\s/g, '')}`} className="hover:text-crust">{phone}</a></li>
                {b.opening_hours && <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-crust" aria-hidden />{b.opening_hours}</li>}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <a href={waLink(wa, `${GENERAL_ORDER_MESSAGE}\nPreferred branch: ${b.name}`)} target="_blank" rel="noopener noreferrer" className="btn-primary"><MessageCircle className="h-4 w-4" aria-hidden /> Order now</a>
                {b.directions_url && <a href={b.directions_url} target="_blank" rel="noopener noreferrer" className="btn-outline"><Navigation className="h-4 w-4" aria-hidden /> Get directions</a>}
              </div>
            </article>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-muted">All orders are handled through one WhatsApp line, whichever branch you choose.</p>
    </div>
  );
}
