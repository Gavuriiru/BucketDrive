/* eslint-disable no-console */
const CF_API_BASE = "https://api.cloudflare.com/client/v4"

interface SetupOptions {
  accountId: string
  apiToken: string
  domain: string
  pagesProjectName: string
}

async function cfApi(
  path: string,
  token: string,
  method: string = "GET",
  body?: object,
): Promise<{ success: boolean; result?: unknown; errors?: Array<{ message: string }> }> {
  const url = `${CF_API_BASE}${path}`
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = (await res.json()) as {
    success: boolean
    result?: unknown
    errors?: Array<{ message: string }>
  }
  return data
}

async function setupPagesDomain(options: SetupOptions): Promise<void> {
  const { accountId, apiToken, domain, pagesProjectName } = options

  console.log(`\n🔍 Checking Pages custom domain "${domain}"...`)

  // Check if domain already exists
  const listRes = await cfApi(
    `/accounts/${accountId}/pages/projects/${pagesProjectName}/domains`,
    apiToken,
  )

  const domains = (listRes.result as Array<{ name: string }>) || []
  const exists = domains.some((d) => d.name === domain)

  if (exists) {
    console.log(`✅ Pages custom domain "${domain}" already exists`)
    return
  }

  console.log(`🆕 Adding Pages custom domain "${domain}"...`)
  const addRes = await cfApi(
    `/accounts/${accountId}/pages/projects/${pagesProjectName}/domains`,
    apiToken,
    "POST",
    { name: domain },
  )

  if (!addRes.success) {
    console.error(`❌ Failed to add Pages custom domain:`, addRes.errors)
    throw new Error("Failed to add Pages custom domain")
  }

  console.log(`✅ Pages custom domain "${domain}" added successfully`)
}

function getEnvVar(key: string): string {
  const value = process.env[key]
  if (!value) {
    console.error(`❌ Missing environment variable: ${key}`)
    process.exit(1)
  }
  return value
}

function main() {
  const accountId = getEnvVar("CLOUDFLARE_ACCOUNT_ID")
  const apiToken = getEnvVar("CLOUDFLARE_API_TOKEN")
  const domain = getEnvVar("CUSTOM_DOMAIN")
  const pagesProjectName = getEnvVar("PAGES_PROJECT_NAME")

  const options: SetupOptions = {
    accountId,
    apiToken,
    domain,
    pagesProjectName,
  }

  console.log(`\n🌐 Setting up custom domain for Pages...`)
  console.log(`   Domain: ${domain}`)
  console.log(`   Project: ${pagesProjectName}`)

  setupPagesDomain(options)
    .then(() => {
      console.log(`\n✅ Custom domain setup complete!`)
      console.log(`\n📌 Next steps:`)
      console.log(`   1. Ensure DNS record for ${domain} points to Cloudflare`)
      console.log(`   2. Verify SSL certificate is provisioned (automatic)`)
      console.log(`   3. Wait for Cloudflare to validate the domain (may take a few minutes)`)
    })
    .catch((err: unknown) => {
      console.error(err instanceof Error ? err.message : "Custom domain setup failed")
      process.exit(1)
    })
}

main()
