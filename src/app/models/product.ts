import { Category } from './category';

export interface Brand {
  id: number | string;
  name: string;
}

export interface Product {
  id: number | string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  quantity?: number;
  image?: string;
  categoryId?: number | string;
  active?: boolean | number;
  category?: Category;
  brand?: Brand;
  created_at?: string;
  updated_at?: string;
}
