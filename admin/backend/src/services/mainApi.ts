import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config.js';

class MainApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.mainApiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('Main API error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
        });
        throw error;
      }
    );
  }

  /**
   * Health check for main API
   */
  async healthCheck(): Promise<{ status: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Get metrics from main API (if available)
   */
  async getMetrics(): Promise<string | null> {
    try {
      const response = await this.client.get('/metrics');
      return response.data;
    } catch {
      return null;
    }
  }

  /**
   * Proxy a request to main API with admin context
   */
  async proxyRequest<T>(
    method: 'get' | 'post' | 'put' | 'patch' | 'delete',
    path: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const response = await this.client.request<T>({
      method,
      url: path,
      data,
      headers: {
        ...headers,
        'X-Admin-Request': 'true',
      },
    });
    return response.data;
  }

  /**
   * Get API info
   */
  async getApiInfo(): Promise<{
    version: string;
    uptime: number;
    environment: string;
  } | null> {
    try {
      const response = await this.client.get('/api/info');
      return response.data;
    } catch {
      return null;
    }
  }
}

export const mainApiService = new MainApiService();
