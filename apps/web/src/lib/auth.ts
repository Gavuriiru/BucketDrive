import { useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query"

interface SessionUser {
  id: string
  email: string
  name: string
  image?: string | null
}

interface SessionData {
  id: string
  userId: string
  expiresAt: string
}

interface SessionResponse {
  user: SessionUser
  session: SessionData
}

async function fetchSession(): Promise<SessionResponse | null> {
  const res = await fetch("/api/auth/get-session", { credentials: "include" })
  if (!res.ok) return null
  const data = (await res.json()) as SessionResponse | null
  if (!data?.user) return null
  return data
}

export function useSession(): UseQueryResult<SessionResponse | null> {
  return useQuery<SessionResponse | null>({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: true,
  })
}

export async function signOut() {
  const res = await fetch("/api/auth/sign-out", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
  if (!res.ok) {
    throw new Error("Sign out failed")
  }
}

export function useSignOut(): () => Promise<void> {
  const queryClient = useQueryClient()

  return async () => {
    await signOut()
    await queryClient.invalidateQueries({ queryKey: ["session"] })
    window.location.href = "/login"
  }
}

export { type SessionUser, type SessionResponse }
