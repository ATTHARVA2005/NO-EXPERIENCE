// Redis/Mem0 memory service for storing learning context

interface MemoryData {
  key: string
  value: unknown
  ttl?: number
  tags?: string[]
}

export class MemoryService {
  private baseUrl: string

  constructor() {
    this.baseUrl = "/api/memory"
  }

  async get(key: string): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}?key=${encodeURIComponent(key)}`)
      if (!response.ok) return null
      const data = await response.json()
      return data.value
    } catch (error) {
      console.error("Memory get error:", error)
      return null
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<boolean> {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, ttl }),
      })
      return response.ok
    } catch (error) {
      console.error("Memory set error:", error)
      return false
    }
  }

  async append(key: string, value: unknown): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/append`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      })
      return response.ok
    } catch (error) {
      console.error("Memory append error:", error)
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      })
      return response.ok
    } catch (error) {
      console.error("Memory delete error:", error)
      return false
    }
  }
}

export const memoryService = new MemoryService()
