// API Service for Ersin Spot
import { projectId, publicAnonKey } from '../utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-0f4d2485`;

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const storedSession = localStorage.getItem('auth_session');
  
  // Eğer kullanıcı giriş yapmışsa access_token kullan
  if (storedSession) {
    try {
      const session = JSON.parse(storedSession);
      if (session.access_token) {
        return {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        };
      }
    } catch (e) {
      console.error('[API] Session parse error:', e);
    }
  }
  
  // Giriş yapılmamışsa publicAnonKey kullan
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${publicAnonKey}`,
  };
}

// ==========================================
// PRODUCTS API
// ==========================================

export interface Product {
  id: string | number;  // Hem UUID hem integer ID destekle
  title: string;
  description: string;
  price: number;
  category: { id: number; name: string; slug: string };
  subcategory: { id: number; name: string; slug: string };
  brand: { id: number; name: string };
  condition: string;
  warranty: string;
  location: string;
  status: string;
  view_count: number;
  favorite_count: number;
  images: { id: number; image_url: string; order_num: number }[];
  specifications: { id: number; spec_key: string; spec_value: string }[];
  created_at: string;
  updated_at: string;
}

export interface ProductFilters {
  category?: number;
  subcategory?: number;
  brand?: number;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  limit?: number;
  offset?: number;
  status?: string;
  showAll?: boolean;
}

export async function getProducts(filters?: ProductFilters): Promise<{ products: Product[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    
    const url = `${API_BASE_URL}/products${params.toString() ? `?${params.toString()}` : ''}`;
    console.log('[API] 📡 GET request:', url);
    const response = await fetch(url, { headers: getAuthHeaders() });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[API] ❌ Error fetching products:', errorData);
      console.error('[API] ❌ Response status:', response.status);
      console.error('[API] ❌ URL:', url);
      throw new Error(errorData.error || errorData.details || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

export async function getProduct(id: string | number): Promise<{ product: Product }> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, { headers: getAuthHeaders() });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

export async function getSimilarProducts(productId: string | number, limit: number = 8): Promise<{ products: Product[] }> {
  try {
    const params = new URLSearchParams();
    params.append('limit', String(limit));
    
    const response = await fetch(`${API_BASE_URL}/products/${productId}/similar?${params.toString()}`, { 
      headers: getAuthHeaders() 
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching similar products:', error);
    throw error;
  }
}

export async function createProduct(productData: any): Promise<{ success: boolean; product: Product }> {
  try {
    const response = await fetch(`${API_BASE_URL}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
}

export async function updateProduct(id: string | number, productData: any): Promise<{ success: boolean; product: Product }> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(productData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function deleteProduct(id: string | number): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

// ==========================================
// CATEGORIES API
// ==========================================

export interface Category {
  id: number;
  name: string;
  slug: string;
  subcategories: { id: number; name: string; slug: string }[];
}

export async function getCategories(): Promise<{ categories: Category[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/categories`, { headers: getAuthHeaders() });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

// ==========================================
// BRANDS API
// ==========================================

export interface Brand {
  id: number;
  name: string;
  logo_url?: string;
}

export async function getBrands(): Promise<{ brands: Brand[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/brands`, { headers: getAuthHeaders() });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching brands:', error);
    throw error;
  }
}

// ==========================================
// ORDERS API
// ==========================================

export interface CreateOrderRequest {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    district: string;
  };
  items: {
    id: number;
    name: string;
    price: number;
    image: string;
    condition: string;
    category: string;
    brand: string;
  }[];
  delivery: {
    method: string;
    date: string;
    time: string;
    fee: number;
  };
  payment: {
    method: string;
  };
  notes?: string;
}

export interface Order {
  id: number;
  order_number: string;
  status: string;
  total: number;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    district: string;
  };
  items: {
    id: number;
    quantity: number;
    price: number;
    product_snapshot: any;
  }[];
  delivery_date: string;
  delivery_time: string;
  delivery_method: string;
  payment_method: string;
  created_at: string;
}

export async function createOrder(orderData: CreateOrderRequest): Promise<{ success: boolean; order: { id: number; orderNumber: string; total: number } }> {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(orderData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

export async function getCustomerOrders(email: string): Promise<{ orders: Order[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/customer/${encodeURIComponent(email)}`, { headers: getAuthHeaders() });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    throw error;
  }
}

// ==========================================
// TECHNICAL SERVICE API
// ==========================================

export interface CreateTechnicalServiceRequest {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    district: string;
  };
  device: {
    type: string;
    brand: string;
    model: string;
  };
  problem: string;
  appointment: {
    date: string;
    time: string;
  };
}

export async function createTechnicalServiceAppointment(data: CreateTechnicalServiceRequest): Promise<{ success: boolean; appointment: any }> {
  try {
    const response = await fetch(`${API_BASE_URL}/technical-service`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating technical service appointment:', error);
    throw error;
  }
}

// ==========================================
// MOVING API
// ==========================================

export interface CreateMovingRequest {
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  from: string;
  to: string;
  appointment: {
    date: string;
    time: string;
  };
  homeSize: string;
  floor: string;
  targetFloor: string;
  items: {
    name: string;
    quantity: number;
  }[];
}

export async function createMovingAppointment(data: CreateMovingRequest): Promise<{ success: boolean; appointment: any }> {
  try {
    const response = await fetch(`${API_BASE_URL}/moving`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating moving appointment:', error);
    throw error;
  }
}

// ==========================================
// SELL REQUESTS API
// ==========================================

export interface CreateSellRequest {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    district: string;
  };
  product: {
    title: string;
    categoryId: number;
    brand: string;
    model: string;
    condition: string;
    description: string;
    requestedPrice: number;
  };
  images: string[];
}

export async function createSellRequest(data: CreateSellRequest): Promise<{ success: boolean; request: any }> {
  try {
    const response = await fetch(`${API_BASE_URL}/sell-requests`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating sell request:', error);
    throw error;
  }
}

// ==========================================
// CATEGORY ATTRIBUTES API (DİNAMİK ÖZELLİKLER)
// ==========================================

export interface AttributeOption {
  id: number;
  value: string;
  label: string;
  icon?: string;
  order: number;
}

export interface CategoryAttribute {
  attribute_id: number;
  category_id: number;
  category_name: string;
  category_slug: string;
  attribute_key: string;
  attribute_label: string;
  input_type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea' | 'date';
  is_required: boolean;
  is_filterable: boolean;
  placeholder?: string;
  help_text?: string;
  display_order: number;
  is_active: boolean;
  options?: AttributeOption[];
}

export interface ProductAttribute {
  product_id: number;
  product_title: string;
  attribute_key: string;
  attribute_label: string;
  input_type: string;
  display_value: string;
  value_text?: string;
  value_number?: number;
  option_value?: string;
  option_label?: string;
  option_icon?: string;
}

export interface ProductAttributeValue {
  attribute_id: number;
  value_text?: string;
  value_number?: number;
  value_option_id?: number;
}

// Get attributes for a specific category
export async function getCategoryAttributes(categoryId: number): Promise<{ categoryId: number; attributes: CategoryAttribute[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/attributes/category/${categoryId}`, { headers: getAuthHeaders() });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching category attributes:', error);
    throw error;
  }
}

// Get all attributes for all categories
export async function getAllCategoryAttributes(): Promise<{ categories: any[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/attributes/all`, { headers: getAuthHeaders() });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching all category attributes:', error);
    throw error;
  }
}

// Get product attributes
export async function getProductAttributes(productId: number): Promise<{ productId: number; attributes: ProductAttribute[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/attributes`, { headers: getAuthHeaders() });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching product attributes:', error);
    throw error;
  }
}

// Save product attributes (bulk)
export async function saveProductAttributes(
  productId: number,
  attributes: ProductAttributeValue[]
): Promise<{ success: boolean; saved: number; attributes: any[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/attributes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ attributes }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving product attributes:', error);
    throw error;
  }
}

// Update single product attribute
export async function updateProductAttribute(
  productId: number,
  attributeId: number,
  value: ProductAttributeValue
): Promise<{ success: boolean; attribute: any }> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/attributes/${attributeId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(value),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating product attribute:', error);
    throw error;
  }
}

// Delete product attribute
export async function deleteProductAttribute(productId: number, attributeId: number): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/attributes/${attributeId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting product attribute:', error);
    throw error;
  }
}

// ==========================================
// ATTRIBUTE MANAGEMENT API (ADMIN)
// ==========================================

export interface CreateAttributeRequest {
  attribute_key: string;
  attribute_label: string;
  input_type: 'text' | 'number' | 'select' | 'multiselect' | 'textarea' | 'date';
  is_required?: boolean;
  is_filterable?: boolean;
  placeholder?: string;
  help_text?: string;
  display_order?: number;
}

export interface CreateAttributeOptionRequest {
  option_value: string;
  option_label: string;
  option_icon?: string;
  display_order?: number;
}

// Create new attribute for category (Admin)
export async function createCategoryAttribute(
  categoryId: number,
  attributeData: CreateAttributeRequest
): Promise<{ success: boolean; attribute: any }> {
  try {
    const response = await fetch(`${API_BASE_URL}/attributes/category/${categoryId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(attributeData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating category attribute:', error);
    throw error;
  }
}

// Add option to attribute (Admin)
export async function addAttributeOption(
  attributeId: number,
  optionData: CreateAttributeOptionRequest
): Promise<{ success: boolean; option: any }> {
  try {
    const response = await fetch(`${API_BASE_URL}/attributes/${attributeId}/options`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(optionData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error adding attribute option:', error);
    throw error;
  }
}
