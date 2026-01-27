export type Profile = {
  id: string;
  email: string;
  name: string | null;
  whatsapp: string | null;
  is_admin: boolean;
};

export type ItemStatus = 'pending' | 'approved' | 'rejected';

export type Item = {
  id: string;
  slug: string | null;
  user_id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  wanted_item: string | null;
  barter_price: string | null;
  image_url: string | null;
  status: ItemStatus;
  created_at: string;
  updated_at: string;
};
