import { Link } from 'react-router-dom';
import { MapPin, Package, PartyPopper, Wheat } from 'lucide-react';
import Seo from '../components/Seo';
import { useSettings } from '../context/SettingsContext';

export default function About() {
  const { settings, branches } = useSettings();
  const paragraphs = settings.about_text.split(/\n\s*\n/).filter(Boolean);

  return (
    <div className="container-page py-10">
      <Seo title="About us" description={settings.description} />
      <h1 className="text-4xl font-extrabold">About {settings.business_name}</h1>
      <div className="mt-6 max-w-3xl space-y-4 text-lg leading-relaxed text-ink/90">
        {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        <div className="rounded-xl border border-line p-6">
          <Wheat className="h-6 w-6 text-crust" aria-hidden />
          <h2 className="mt-3 text-xl font-bold">What we offer</h2>
          <p className="mt-2 text-muted">Bread, doughnuts, shawarma, puff-puff and other pastries, made and sold from our branches in Ibadan.</p>
        </div>
        <div className="rounded-xl border border-line p-6">
          <Package className="h-6 w-6 text-crust" aria-hidden />
          <h2 className="mt-3 text-xl font-bold">{settings.bulk_title}</h2>
          <p className="mt-2 text-muted">{settings.bulk_text}</p>
        </div>
        <div className="rounded-xl border border-line p-6">
          <PartyPopper className="h-6 w-6 text-crust" aria-hidden />
          <h2 className="mt-3 text-xl font-bold">{settings.catering_title}</h2>
          <p className="mt-2 text-muted">{settings.catering_text}</p>
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-extrabold">Where to find us</h2>
        <ul className="mt-4 space-y-2 text-muted">
          {branches.map((b) => <li key={b.id} className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-crust" aria-hidden /><span><span className="font-semibold text-ink">{b.name}:</span> {b.address}</span></li>)}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/products" className="btn-primary">See the menu</Link>
          <Link to="/contact" className="btn-outline">Contact us</Link>
        </div>
      </section>
    </div>
  );
}
