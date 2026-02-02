// Archivo: client/src/types/index.ts

export interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  image_url: string;
  category_name?: string;
  status: string;
}