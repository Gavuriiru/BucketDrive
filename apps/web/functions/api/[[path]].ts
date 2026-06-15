interface PagesFunctionContext {
  request: Request
}

type PagesFunctionHandler = (context: PagesFunctionContext) => Promise<Response>

export const onRequest: PagesFunctionHandler = async (context) => {
  const url = new URL(context.request.url)
  const workerUrl = `https://bucketdrive-api-production.gavuriiru-fda.workers.dev${url.pathname}${url.search}`

  const request = new Request(workerUrl, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body,
    redirect: "manual",
  })

  return fetch(request)
}
