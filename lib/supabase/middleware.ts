import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PATH_PREFIXES = ["/login", "/auth", "/api", "/_next", "/favicon.ico"]

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("[auth] Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
    return NextResponse.next({ request })
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options })
      },
      remove(name, options) {
        response.cookies.set({ name, value: "", ...options, maxAge: 0 })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublicPath = PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || pathname === "/"

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    if (pathname && pathname !== "/dashboard") {
      url.searchParams.set("redirect", pathname)
    }
    return NextResponse.redirect(url)
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return response
}
