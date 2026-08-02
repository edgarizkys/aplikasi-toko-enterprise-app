import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Sale {
  id: number;
  product_name: string;
  quantity: number;
  total: number;
  date: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  points: number;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
  tokens: AuthTokens;
}

export interface CreateProductRequest {
  name: string;
  category: string;
  price: number;
  stock: number;
}

export interface UpdateProductRequest {
  name?: string;
  category?: string;
  price?: number;
  stock?: number;
}

export interface CreateSaleRequest {
  product_name: string;
  quantity: number;
  total: number;
  date: string;
}

export interface UpdateSaleRequest {
  product_name?: string;
  quantity?: number;
  total?: number;
  date?: string;
}

export interface CreateCustomerRequest {
  name: string;
  phone: string;
  points?: number;
}

export interface UpdateCustomerRequest {
  name?: string;
  phone?: string;
  points?: number;
}

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tenantId: string | null = null;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api') {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadTokensFromStorage();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        if (this.tenantId) {
          config.headers['X-Tenant-ID'] = this.tenantId;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (this.refreshToken) {
            try {
              const response = await this.refreshAccessToken();
              this.setTokens(response.tokens);
              return this.client(originalRequest);
            } catch (refreshError) {
              this.clearTokens();
              window.location.href = '/login';
              return Promise.reject(refreshError);
            }
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private loadTokensFromStorage(): void {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
      this.tenantId = localStorage.getItem('tenantId');
    }
  }

  private saveTokensToStorage(): void {
    if (typeof window !== 'undefined') {
      if (this.accessToken) {
        localStorage.setItem('accessToken', this.accessToken);
      }
      if (this.refreshToken) {
        localStorage.setItem('refreshToken', this.refreshToken);
      }
      if (this.tenantId) {
        localStorage.setItem('tenantId', this.tenantId);
      }
    }
  }

  setTokens(tokens: AuthTokens, tenantId?: string): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    if (tenantId) {
      this.tenantId = tenantId;
    }
    this.saveTokensToStorage();
  }

  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tenantId = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tenantId');
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getTenantId(): string | null {
    return this.tenantId;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.client.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
    if (response.data.success && response.data.data) {
      this.setTokens(response.data.data.tokens, response.data.data.user.tenantId);
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Login gagal');
  }

  async refreshAccessToken(): Promise<{ tokens: AuthTokens }> {
    const response = await this.client.post<ApiResponse<{ tokens: AuthTokens }>>('/auth/refresh', {
      refreshToken: this.refreshToken,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error?.message || 'Token refresh gagal');
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  // Products endpoints
  async getProducts(params?: PaginationParams): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get<ApiResponse<Product[]>>('/products', { params });
    return response.data;
  }

  async getProductById(id: number): Promise<ApiResponse<Product>> {
    const response = await this.client.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data;
  }

  async createProduct(data: CreateProductRequest): Promise<ApiResponse<Product>> {
    const response = await this.client.post<ApiResponse<Product>>('/products', data);
    return response.data;
  }

  async updateProduct(id: number, data: UpdateProductRequest): Promise<ApiResponse<Product>> {
    const response = await this.client.patch<ApiResponse<Product>>(`/products/${id}`, data);
    return response.data;
  }

  async deleteProduct(id: number): Promise<ApiResponse<void>> {
    const response = await this.client.delete<ApiResponse<void>>(`/products/${id}`);
    return response.data;
  }

  async getProductsByCategory(category: string, params?: PaginationParams): Promise<ApiResponse<Product[]>> {
    const response = await this.client.get<ApiResponse<Product[]>>(`/products/category/${category}`, { params });
    return response.data;
  }

  // Sales endpoints
  async getSales(params?: PaginationParams): Promise<ApiResponse<Sale[]>> {
    const response = await this.client.get<ApiResponse<Sale[]>>('/sales', { params });
    return response.data;
  }

  async getSaleById(id: number): Promise<ApiResponse<Sale>> {
    const response = await this.client.get<ApiResponse<Sale>>(`/sales/${id}`);
    return response.data;
  }

  async createSale(data: CreateSaleRequest): Promise<ApiResponse<Sale>> {
    const response = await this.client.post<ApiResponse<Sale>>('/sales', data);
    return response.data;
  }

  async updateSale(id: number, data: UpdateSaleRequest): Promise<ApiResponse<Sale>> {
    const response = await this.client.patch<ApiResponse<Sale>>(`/sales/${id}`, data);
    return response.data;
  }

  async deleteSale(id: number): Promise<ApiResponse<void>> {
    const response = await this.client.delete<ApiResponse<void>>(`/sales/${id}`);
    return response.data;
  }

  async getSalesByDateRange(startDate: string, endDate: string, params?: PaginationParams): Promise<ApiResponse<Sale[]>> {
    const response = await this.client.get<ApiResponse<Sale[]>>('/sales/date-range', {
      params: { startDate, endDate, ...params },
    });
    return response.data;
  }

  async getSaleStats(): Promise<ApiResponse<{ totalRevenue: number; totalSales: number; averageTransaction: number }>> {
    const response = await this.client.get<ApiResponse<{ totalRevenue: number; totalSales: number; averageTransaction: number }>>('/sales/stats');
    return response.data;
  }

  // Customers endpoints
  async getCustomers(params?: PaginationParams): Promise<ApiResponse<Customer[]>> {
    const response = await this.client.get<ApiResponse<Customer[]>>('/customers', { params });
    return response.data;
  }

  async getCustomerById(id: number): Promise<ApiResponse<Customer>> {
    const response = await this.client.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data;
  }

  async createCustomer(data: CreateCustomerRequest): Promise<ApiResponse<Customer>> {
    const response = await this.client.post<ApiResponse<Customer>>('/customers', data);
    return response.data;
  }

  async updateCustomer(id: number, data: UpdateCustomerRequest): Promise<ApiResponse<Customer>> {
    const response = await this.client.patch<ApiResponse<Customer>>(`/customers/${id}`, data);
    return response.data;
  }

  async deleteCustomer(id: number): Promise<ApiResponse<void>> {
    const response = await this.client.delete<ApiResponse<void>>(`/customers/${id}`);
    return response.data;
  }

  async addCustomerPoints(id: number, points: number): Promise<ApiResponse<Customer>> {
    const response = await this.client.post<ApiResponse<Customer>>(`/customers/${id}/points`, { points });
    return response.data;
  }

  async getCustomerByPhone(phone: string): Promise<ApiResponse<Customer>> {
    const response = await this.client.get<ApiResponse<Customer>>('/customers/phone', { params: { phone } });
    return response.data;
  }
}

const apiClient = new ApiClient();

export default apiClient;