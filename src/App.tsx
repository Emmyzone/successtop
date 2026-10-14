import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Products from './pages/Products';
import Promotions from './pages/Promotions';
import Branches from './pages/Branches';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';
import { Spinner } from './components/States';

// The admin area is loaded only when someone visits /admin, so it never slows down the public site.
const AdminRoutes = lazy(() => import('./admin/AdminRoutes'));

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Suspense fallback={<Spinner />}><AdminRoutes /></Suspense>} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="products" element={<Products />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="branches" element={<Branches />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
