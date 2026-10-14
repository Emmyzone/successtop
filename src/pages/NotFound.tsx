import { Link } from 'react-router-dom';
import Seo from '../components/Seo';

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <Seo title="Page not found" />
      <p className="font-display text-7xl font-extrabold text-wheat">404</p>
      <h1 className="mt-4 text-3xl font-extrabold">We could not find that page</h1>
      <p className="mt-2 text-muted">The link may be old or mistyped. Try the menu or head back home.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/" className="btn-primary">Back to home</Link>
        <Link to="/products" className="btn-outline">View the menu</Link>
      </div>
    </div>
  );
}
