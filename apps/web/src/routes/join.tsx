/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { useState, useEffect } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { useAcceptInvitation, useInvitationByToken } from "@/lib/api"

export function JoinPage() {
  const search = useSearch({ strict: false })
  const token = (search as { token?: string }).token ?? null
  const navigate = useNavigate()

  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const invitationQuery = useInvitationByToken(token)
  const acceptInvitation = useAcceptInvitation()

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/get-session", { credentials: "include" })
        if (res.ok) {
          const data = (await res.json()) as { user?: { email?: string } } | null
          setIsAuthenticated(true)
          setUserEmail(data?.user?.email ?? null)
        } else {
          setIsAuthenticated(false)
        }
      } catch {
        setIsAuthenticated(false)
      }
    }
    void checkAuth()
  }, [])

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-default p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-text-primary">Invalid Invitation</h1>
          <p className="mt-2 text-sm text-text-secondary">No invitation token was provided.</p>
        </div>
      </div>
    )
  }

  if (invitationQuery.isLoading || isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (invitationQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-default p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-text-primary">Invitation Unavailable</h1>
          <p className="mt-2 text-sm text-text-secondary">
            {invitationQuery.error?.message ?? "This invitation is no longer valid."}
          </p>
        </div>
      </div>
    )
  }

  const invite = invitationQuery.data
  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary p-6">
        <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-default p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-text-primary">Invitation Unavailable</h1>
          <p className="mt-2 text-sm text-text-secondary">Unable to load invitation details.</p>
        </div>
      </div>
    )
  }

  const emailMatches = userEmail?.toLowerCase() === invite.email.toLowerCase()

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-primary p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border-default bg-surface-default p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
          <svg
            className="h-6 w-6 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h1 className="mt-4 text-center text-xl font-semibold text-text-primary">
          Workspace Invitation
        </h1>

        <p className="mt-2 text-center text-sm text-text-secondary">
          You have been invited to join{" "}
          <span className="font-medium text-text-primary">{invite.workspaceName}</span> as a{" "}
          <span className="font-medium capitalize text-text-primary">{invite.role}</span>.
        </p>

        <div className="mt-6 rounded-xl border border-border-default bg-bg-tertiary p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Invited by</span>
            <span className="font-medium text-text-primary">{invite.invitedByName}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Email</span>
            <span className="font-medium text-text-primary">{invite.email}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Expires</span>
            <span className="font-medium text-text-primary">
              {new Date(invite.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {!isAuthenticated && (
          <div className="mt-6">
            <a
              href={`/login?redirect=/join?token=${token}`}
              className="block w-full rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Sign in to accept
            </a>
            <p className="mt-2 text-center text-xs text-text-tertiary">
              You must sign in with the invited email address.
            </p>
          </div>
        )}

        {isAuthenticated && !emailMatches && (
          <div className="mt-6 rounded-xl border border-error/30 bg-error/10 p-4 text-center">
            <p className="text-sm text-error">
              You are signed in as <strong>{userEmail}</strong>, but this invitation is for{" "}
              <strong>{invite.email}</strong>.
            </p>
            <a
              href={`/login?redirect=/join?token=${token}`}
              className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
            >
              Switch account
            </a>
          </div>
        )}

        {isAuthenticated && emailMatches && (
          <div className="mt-6">
            <button
              onClick={() => {
                acceptInvitation.mutate(
                  { token },
                  {
                    onSuccess: () => {
                      void navigate({ to: "/dashboard" })
                    },
                  },
                )
              }}
              disabled={acceptInvitation.isPending}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {acceptInvitation.isPending ? "Accepting..." : "Accept invitation"}
            </button>
            {acceptInvitation.isError && (
              <p className="mt-2 text-center text-sm text-error">{acceptInvitation.error.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
