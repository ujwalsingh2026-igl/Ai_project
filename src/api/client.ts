/**
 * Base HTTP/Cloud client layer abstraction for LITERIA
 */

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      if (!response.ok) {
        return { error: response.statusText, status: response.status };
      }
      const data = await response.json();
      return { data, status: response.status };
    } catch (err: any) {
      return { error: err.message || 'Network error', status: 0 };
    }
  }
}

export const apiClient = new ApiClient();
