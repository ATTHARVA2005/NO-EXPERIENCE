// Centralized API client for all agent interactions

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = "/api"
  }

  async post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      return {
        success: response.ok,
        data: data.data || data,
        error: data.error,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`)
      const data = await response.json()
      return {
        success: response.ok,
        data: data.data || data,
        error: data.error,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}

export const apiClient = new ApiClient()
