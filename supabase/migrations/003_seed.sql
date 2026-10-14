-- SuccessTop: initial data. Safe to run more than once. No products, prices or promotions are seeded.

insert into public.bst_categories (name, slug, sort_order) values
  ('Bread', 'bread', 1),
  ('Doughnuts', 'doughnuts', 2),
  ('Shawarma', 'shawarma', 3),
  ('Puff-puff', 'puff-puff', 4),
  ('Other Pastries', 'other-pastries', 5)
on conflict (slug) do nothing;

insert into public.bst_branches (name, address, sort_order) values
  ('Arapaja Branch', 'Arapaja, Odo Ona Elewe, Ibadan', 1),
  ('Idioya Branch', 'Idioya, Odo Ona Elewe, Ibadan', 2)
on conflict (name) do nothing;

insert into public.bst_site_settings (key, value) values
  ('business_name', to_jsonb('SuccessTop'::text)),
  ('tagline', to_jsonb('Freshly baked'::text)),
  ('phone', to_jsonb('07067877868'::text)),
  ('email', to_jsonb('successtop@gmail.com'::text)),
  ('whatsapp_number', to_jsonb('2347067877868'::text)),
  ('description', to_jsonb('SuccessTop is a bakery and food business in Ibadan. We make and sell bread, doughnuts, shawarma, puff-puff and other pastries.'::text)),
  ('about_text', to_jsonb('SuccessTop is a bakery and food business based in Ibadan, Oyo State. We produce and sell bread, doughnuts, shawarma, puff-puff and other pastries from two branches at Odo Ona Elewe.

We take orders for business meetings and special occasions, and we supply bread to resellers at competitive prices.'::text)),
  ('hero_headline', to_jsonb('Freshly Baked. Made for Every Occasion.'::text)),
  ('hero_text', to_jsonb('Bread, doughnuts, shawarma, puff-puff and pastries from our two branches in Ibadan. Order for yourself, for a meeting, or for an event.'::text)),
  ('hero_image_path', to_jsonb(''::text)),
  ('hero_image_alt', to_jsonb('Fresh bakery products from SuccessTop'::text)),
  ('logo_path', to_jsonb(''::text)),
  ('bulk_title', to_jsonb('Bread for resellers'::text)),
  ('bulk_text', to_jsonb('Buying bread to resell? We supply bread in bulk at competitive prices. Message us on WhatsApp to talk about the quantities you need.'::text)),
  ('catering_title', to_jsonb('Meetings, events and special occasions'::text)),
  ('catering_text', to_jsonb('Planning a meeting, a business event or a celebration? Tell us what you need and our team will arrange it with you on WhatsApp.'::text)),
  ('contact_callout', to_jsonb('Questions about an order? Message us on WhatsApp.'::text)),
  ('footer_text', to_jsonb('Freshly baked in Ibadan.'::text)),
  ('seo_title', to_jsonb('SuccessTop | Freshly baked in Ibadan'::text)),
  ('seo_description', to_jsonb('SuccessTop is a bakery and food business in Ibadan selling bread, doughnuts, shawarma, puff-puff and pastries, with bulk bread supply for resellers.'::text))
on conflict (key) do nothing;
