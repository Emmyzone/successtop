import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../lib/auth';
import AdminLayout, { AdminOnly } from './AdminLayout';
import Login from './Login';
import Overview from './Overview';
import Inbox from './Inbox';
import Products from './Products';
import Categories from './Categories';
import Promotions from './Promotions';
import Branches from './Branches';
import SiteSettings from './SiteSettings';
import Staff from './Staff';

export default function AdminRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<AdminOnly><Categories /></AdminOnly>} />
          <Route path="promotions" element={<AdminOnly><Promotions /></AdminOnly>} />
          <Route path="branches" element={<AdminOnly><Branches /></AdminOnly>} />
          <Route path="settings" element={<AdminOnly><SiteSettings /></AdminOnly>} />
          <Route path="staff" element={<AdminOnly><Staff /></AdminOnly>} />
          <Route path="*" element={<p className="py-10 text-center text-muted">That admin page does not exist.</p>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
