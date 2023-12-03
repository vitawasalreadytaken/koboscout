/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { getGlucoseData, getSettings } from "./api"
import { RECORDS_TO_FETCH } from "./config"
import * as templates from "./templates"

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
}

function getNightscoutCredentials(request: Request, env: Env): [string, string] {
  // Read Nightscout URL and access token from the query string, or fall back to environment variables.
  const requestUrl = new URL(request.url)
  const url = decodeURIComponent(requestUrl.searchParams.get("url") || "") || env.NIGHTSCOUT_URL
  if (!url) {
    throw new Error(
      "Error: Missing Nightscout URL. Add it to the address (?url=https%3A%2F%2Fexample.com) or set it in the NIGHTSCOUT_URL environment variable.",
    )
  }
  const token = decodeURIComponent(requestUrl.searchParams.get("token") || "") || env.NIGHTSCOUT_TOKEN
  if (!token) {
    throw new Error(
      "Error: Missing Nightscout token. Add it to the address (?token=secret-12345) or set it in the NIGHTSCOUT_TOKEN environment variable.",
    )
  }
  return [url, token]
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Obtain credentials
    let nightscoutUrl, nightscoutToken
    try {
      ;[nightscoutUrl, nightscoutToken] = getNightscoutCredentials(request, env)
    } catch (e) {
      return new Response((e as Error).message, { status: 400 })
    }
    // Load data from Nightscout
    const settings = await getSettings(nightscoutUrl, nightscoutToken)
    const glucoseData = await getGlucoseData(nightscoutUrl, nightscoutToken, RECORDS_TO_FETCH)
    // Render the page
    return new Response(templates.page(settings, glucoseData), {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
    })
  },
}
