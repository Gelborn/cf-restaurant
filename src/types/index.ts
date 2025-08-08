export interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  lat: number;
  lng: number;
}

export interface Item {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  unit: string;
  validity_days: number;
  unit_to_kg?: number;
}

export interface Package {
  id: string;
  item_id: string;
  quantity: number;
  total_kg: number;
  status: 'in_stock' | 'awaiting_donation' | 'donated';
  created_at: string;
  expires_at: string;
  label_code: string;
  item?: Item;
}

export interface Donation {
  id: string;
  restaurant_id: string;
  osc_id: string;
  security_code: string;
  status: 'pending' | 'accepted' | 'released' | 'picked_up';
  created_at: string;
  accepted_at?: string;
  released_at?: string;
  picked_up_at?: string;
}