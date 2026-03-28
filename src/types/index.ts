export interface Advertisement {
  id: string;
  public_id: string;
  title?: string;
  content?: string;
  image_url?: string;
  link_url?: string;
  target_store_id?: string;
  target_province_id?: string;
  target_municipality_id?: string;
  placement: 'store_cover' | 'news_feed';
  active: boolean;
  created_at: string;
}

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  public_id: string;
  full_name: string;
  name: string;
  email: string;
  whatsapp_number: string;
  id_number: string;
  photo_url?: string;
  cover_image?: string;
  is_admin: boolean;
  bio?: string;
  province_id?: string;
  municipality_id?: string;
  created_at: string;
}

export interface Store {
  id: string;
  public_id: string;
  owner_id: string;
  name: string;
  type: 'selling' | 'service' | 'online';
  status: 'pending' | 'approved' | 'rejected';
  is_active: boolean;
  description?: string;
  profile_image?: string;
  cover_image?: string;
  id_document_url: string;
  business_document_url?: string;
  province_id: string;
  municipality_id: string;
  created_at: string;
  followers_count?: number;
  owner?: UserProfile;
  province?: Province;
  municipality?: Municipality;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id?: string;
  service_id?: string;
  quantity: number;
  created_at: string;
  product?: Product;
  service?: Service;
}

export interface ChatParticipant {
  id: string;
  chat_id: string;
  user_id: string;
  is_admin: boolean;
  product_id?: string;
  service_id?: string;
  created_at: string;
}

export interface BusinessChat {
  id: string;
  tipo: 'produto' | 'servico';
  product_id?: string;
  service_id?: string;
  criado_por: string;
  status: 'ativo' | 'concluido';
  nota_admin?: string;
  data_marcada?: string;
  marcado_como_feito: boolean;
  last_message?: string;
  last_message_at?: string;
  last_sender_id?: string;
  created_at: string;
  product?: Product;
  service?: Service;
  participants?: UserProfile[];
}

export interface Follower {
  id: string;
  user_id: string;
  store_id?: string;
  followed_user_id?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  created_at: string;
}

export interface Province {
  id: string;
  name: string;
}

export interface Municipality {
  id: string;
  province_id: string;
  name: string;
}

export interface Chat {
  id: string;
  name?: string;
  type: 'private' | 'group';
  product_id?: string;
  service_id?: string;
  created_at: string;
  participants?: string[]; // Array of user IDs
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  tipo: 'texto' | 'sistema';
  product_ref_id?: string; // public_id of product
  created_at: string;
  sender?: UserProfile;
}

export interface Post {
  id: string;
  public_id: string;
  is_imported?: boolean;
  is_preorder?: boolean;
  country?: string;
  delivery_time?: string;
  preorder_info?: string;
  payment_type?: string;
  delivery_method?: string;
  store_id: string;
  type: 'product' | 'service';
  title: string;
  content: string;
  images: string[];
  price?: number;
  currency?: string;
  stock?: number;
  likes_count: number;
  comments_count: number;
  cart_count?: number;
  created_at: string;
  province_id?: string;
  municipality_id?: string;
  province?: Province;
  municipality?: Municipality;
  store?: Store;
}

export interface Product {
  id: string;
  public_id: string;
  store_id: string;
  type?: 'product' | 'service';
  title: string;
  category_id: string;
  subcategory_id: string;
  condition: 'new' | 'used' | 'refurbished';
  price: number;
  currency: 'AOA' | 'USD' | 'EUR';
  stock: number;
  description: string;
  images: string[];
  province_id: string;
  municipality_id: string;
  province?: Province;
  municipality?: Municipality;
  importer_enabled: boolean;
  importer_region?: 'Europe' | 'America' | 'Asia' | 'Africa';
  is_imported: boolean;
  is_preorder: boolean;
  country?: string;
  delivery_time?: string;
  preorder_info?: string;
  payment_type?: string;
  delivery_method?: string;
  cart_count?: number;
  created_at: string;
  store?: Store;
}

export interface Service {
  id: string;
  public_id: string;
  store_id: string;
  type?: 'product' | 'service';
  title: string;
  category_id: string;
  subcategory_id: string;
  description: string;
  images: string[];
  price_type: 'fixed' | 'range' | 'on_request';
  price?: number;
  currency: 'AOA' | 'USD' | 'EUR';
  modality: 'presencial' | 'online' | 'home';
  availability: string;
  province_id: string;
  municipality_id: string;
  province?: Province;
  municipality?: Municipality;
  created_at: string;
  store?: Store;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  created_at: string;
  user?: UserProfile;
  replies?: Comment[];
}

export interface Review {
  id: string;
  store_id: string;
  user_id: string;
  rating: number;
  comment: string;
  created_at: string;
  user?: UserProfile;
}
