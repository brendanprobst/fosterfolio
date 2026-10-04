# Google SSO (Supabase OAuth)

The "Continue with google" button on `/auth/sign-in` is fully wired in the repo. Everything that can break is **operator configuration** split across two dashboards — Google Cloud Console and the Supabase project — plus the redirect allowlist. This playbook covers that setup end to end and the symptoms each missing piece produces.

The provider name is not hard-coded: `getOauthProvider()` reads `NEXT_PUBLIC_SUPABASE_OAUTH_PROVIDER` and falls back to `google`, so the same wiring works for any Supabase OAuth provider.

## How the flow works (repo side)

| File | Role |
|---|---|
| **`apps/web/client/pages/auth/oauth.ts`** | Provider name (`google` by default). |
| **`apps/web/client/pages/auth/SignInPage.tsx`** | The button; also surfaces `error_description` / `error` query params on return. |
| **`apps/web/client/auth/AuthProvider.tsx`** | `signInWithOAuth` builds `redirectTo` as `${origin}/auth/sign-in?next=…`. |
| **`apps/web/client/lib/supabaseClient.ts`** | `flowType: "pkce"` + `detectSessionInUrl: true` — exchanges the returned `?code=` automatically. |
| **`apps/web/client/auth/allowlistError.ts`** | Turns a trigger error into the friendly "not yet approved" message. |

The round trip:

1. Button → `https://<project-ref>.supabase.co/auth/v1/authorize?provider=google&redirect_to=…`
2. Supabase → Google consent screen
3. Google → `https://<project-ref>.supabase.co/auth/v1/callback` (**Supabase's** callback, never your app)
4. Supabase → `http://localhost:3001/auth/sign-in?next=…&code=…`
5. `detectSessionInUrl` exchanges the code; `onAuthStateChange` fires `SIGNED_IN`; `verifyAuthUsableForApi` confirms the API accepts the token.

Nothing in steps 1–5 needs a code change to enable a provider.

## 1. Google Cloud Console

Create an **OAuth 2.0 Client ID** of type *Web application*. The only field that must be exact is the authorized redirect URI, which is the callback URL shown in the Supabase Google provider panel:

```
https://<project-ref>.supabase.co/auth/v1/callback
```

`<project-ref>` is the host in `NEXT_PUBLIC_SUPABASE_URL` (`apps/web/.env.local`). Your own `localhost:3001` does **not** belong here — Google redirects to Supabase, not to the app.

Configure the OAuth consent screen as well. While it is in **Testing**, only accounts listed as test users can complete sign-in; everyone else is refused at the consent step.

## 2. Supabase → Authentication → Providers → Google

Paste the **Client ID** and **Client Secret**, enable, and save. Supabase will not treat the provider as enabled until both fields are saved, so the toggle can appear on while the API still reports the provider as off. Always confirm with the [verification step](#verify) rather than the UI.

## 3. Supabase → Authentication → URL Configuration

| Setting | Local dev | Deployed |
|---|---|---|
| **Site URL** | `http://localhost:3001` | CloudFront / custom domain origin |
| **Redirect URLs** | `http://localhost:3001/**` | `https://your-domain/**` |

The wildcard matters: `redirectTo` includes the `/auth/sign-in?next=…` path and query, and Supabase matches the whole URL against this list.

Pick one hostname and stay on it. The API's `CORS_ORIGINS` accepts both `http://localhost:3001` and `http://127.0.0.1:3001`, but Supabase only accepts origins you registered — browsing via `127.0.0.1` requires adding that variant too.

## 4. Allowlist interaction

If the private-beta gate is on, OAuth users are subject to it exactly like email/password users: the `enforce_allowed_email` trigger fires on `auth.users` insert, so a first-time Google sign-in from an unlisted address is rejected and bounces back to `/auth/sign-in` with the approved-access message.

The database flag is independent of the API's `EMAIL_ALLOWLIST_ENABLED`, so check it directly:

```sql
select enabled from public.allowlist_settings where singleton = true;

-- if true, add the Google address before testing:
insert into public.allowed_emails (email, note)
values ('you@gmail.com', 'operator')
on conflict (email) do nothing;
```

Details and rollback: [`email-allowlist.md`](email-allowlist.md). Beta rollout context: [`private-beta.md`](private-beta.md).

## Verify

Ask the project which providers are actually live — this reflects real GoTrue state, not the dashboard:

```bash
cd apps/web \
  && URL=$(rg -N '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-) \
  && KEY=$(rg -N '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2-) \
  && curl -s -H "apikey: $KEY" "$URL/auth/v1/settings" | python3 -m json.tool
```

Expect `"google": true` under `external`. Then click **Continue with google** on `/auth/sign-in` and confirm you land back signed in.

## Deployed environments

The `NEXT_PUBLIC_SUPABASE_*` values are baked into the static export at build time, so a deployed build points at whichever project was configured during `npm run deploy:aws`. Add the deployed origin to **Redirect URLs** before testing SSO there — the sign-in page is served by CloudFront, but the redirect allowlist lives in Supabase.

## Troubleshooting

| Symptom | Cause |
|---|---|
| Blank / dead tab right after clicking the button | Provider not actually enabled — `settings` reports `"google": false`. Re-save Client ID + Secret. |
| `TypeError: Failed to fetch` from `@supabase/auth-js` | Project paused, or `NEXT_PUBLIC_SUPABASE_URL` unreachable. Resume the project; re-check the URL. |
| Google shows **redirect_uri_mismatch** | The Google client's redirect URI is not exactly `https://<project-ref>.supabase.co/auth/v1/callback`. |
| Supabase returns "requested path is invalid" | `redirectTo` is not covered by **Redirect URLs** — add `http://localhost:3001/**`. |
| Google shows "Access blocked" / app not verified | Consent screen still in Testing and the account is not a test user. |
| Returns to `/auth/sign-in` with the approved-access message | Allowlist trigger rejected the signup — see §4. |
| Signed in on the client but API calls 401/403 | Token is fine but the API rejected it; check `SUPABASE_JWT_ISSUER` / `SUPABASE_JWT_AUDIENCE` in `apps/api/.env` and the allowlist middleware. |
