# 06 — Authentication

Authentication is handled entirely by Supabase Auth. We do not manage passwords,
tokens, or sessions ourselves.

---

## How it works end to end

### Sign up
1. User fills in the Register form (email + password)
2. Frontend calls `supabase.auth.signUp({ email, password })`
3. Supabase creates a row in `auth.users` and sends a confirmation email
4. A database trigger on `auth.users` automatically creates a row in `public.profiles`
5. User confirms email and is logged in

### Login
1. User fills in the Login form
2. Frontend calls `supabase.auth.signInWithPassword({ email, password })`
3. Supabase returns a session object containing:
   - `access_token` — a JWT valid for 1 hour
   - `refresh_token` — used to get a new access token when it expires
4. The Supabase client stores the session in localStorage automatically
5. `auth.store.ts` is updated with the current user object

### Token refresh
The Supabase client handles this automatically. When the access token expires,
it uses the refresh token to get a new one transparently without the user noticing.

### Sign out
1. User clicks sign out
2. Frontend calls `supabase.auth.signOut()`
3. Supabase invalidates the session server-side
4. Tokens are cleared from localStorage
5. `auth.store.ts` is reset, user is redirected to `/login`

### OAuth (Google, GitHub)
1. User clicks "Sign in with Google"
2. Frontend calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
3. User is redirected to Google's consent screen
4. After approval, Google redirects back to our app with an auth code
5. Supabase exchanges the code for tokens and creates/updates the user session
6. Same flow continues as a normal login from step 4 above

---

## Session restoration on page load

When the app loads, we need to check if the user is already logged in:

```typescript
// In a top-level component or auth hook
const { data: { session } } = await supabase.auth.getSession()
useAuthStore.getState().setUser(session?.user ?? null)
useAuthStore.getState().setLoading(false)

// Keep the store in sync as auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setUser(session?.user ?? null)
})
```

---

## Protected routes

Routes that require authentication check `auth.store.ts` and redirect to `/login`
if there is no user. The check happens in a wrapper component around protected routes.

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()

  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

---

## How auth works in the database (RLS)

Every Supabase query from the frontend automatically includes the user's JWT in the
`Authorization` header. Postgres RLS policies use the `auth.uid()` function which
reads the user ID from that JWT. This means:

- If a user tries to read another user's workflows, the RLS policy blocks it at the
  database level — not just in application code
- This protection applies even if someone calls the Supabase API directly with
  the anon key

---

## How auth works in Edge Functions

Edge Functions use the service role key (not the anon key) to bypass RLS when needed
(e.g. during workflow execution, the function needs to read credentials it didn't create).
The service role key is stored as an environment variable and never exposed to the frontend.

When an Edge Function needs to act on behalf of a user (e.g. to enforce ownership checks),
it can extract the user's JWT from the incoming request header and create a client
with that token instead.

```typescript
// Service role client (bypasses RLS — use carefully)
const adminClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// User-scoped client (respects RLS)
const userClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
)
```

---

## Auth store (`src/store/auth.store.ts`)

```typescript
interface AuthStore {
  user: User | null      // Supabase User object or null if not logged in
  isLoading: boolean     // true while getSession() is running on app load
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}
```
