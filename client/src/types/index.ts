// Archivo: client/src/types/index.ts

export interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
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
  created_at: string;
}