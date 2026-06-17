/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
import { useSearch } from "@tanstack/react-router"
import { useI18n } from "@/lib/i18n"

export function SignupDeniedPage() {
  const { t } = useI18n()
  const search = useSearch({ strict: false })
  const error = (search as { error?: string }).error

  return (
    <div className="bg-bg-primary flex min-h-screen items-center justify-center p-6">
      <div className="border-border-default bg-surface-default w-full max-w-sm rounded-2xl border p-8 text-center shadow-sm">
        <h1 className="text-text-primary text-xl font-semibold">{t("signupDenied.title")}</h1>
        <p className="text-text-secondary mt-2 text-sm">
          {error === "Sign up is disabled"
            ? t("signupDenied.message.disabled")
            : t("signupDenied.message.default")}
        </p>
        <a
          href="/login"
          className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 inline-block rounded-lg px-4 py-2 text-sm font-medium"
        >
          {t("signupDenied.goToLogin")}
        </a>
      </div>
    </div>
  )
}
