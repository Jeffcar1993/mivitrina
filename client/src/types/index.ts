// Archivo: client/src/types/index.ts

export interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  quantity?: number;
  image_url: string;
  category_name?: string;
  status: string;
  user_id?: number;
  seller_id?: number;
  seller_username?: string;
  seller_profile_image?: string;
  images?: string[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  profile_image?: string;
  bio?: string;
  phone?: string;
  mercado_pago_account_id?: string;
  payout_automation_enabled?: boolean;
  created_at: string;
}