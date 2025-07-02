export interface User {
  id: number;
  email: string;
  username: string;
  created_at: string;
}

export interface UserProfile {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  category_id: number;
  in_stock: boolean;
  created_at: string;
}

export interface Order {
  id: number;
  user_id: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
  created_at: string;
}

export interface ProductTag {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface ProductTagRelation {
  id: number;
  product_id: number;
  tag_id: number;
  created_at: string;
}