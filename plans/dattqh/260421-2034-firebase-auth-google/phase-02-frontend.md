# Phase 2 — Frontend (Firebase SDK + Auth Context + UI)

**Priority:** P1 | **Status:** pending | **Effort:** 2-3h | **Depends on:** phase-01

## Context Links

- Plan: [plan.md](plan.md)
- Current: `app/src/contexts/auth-context.tsx`, `app/src/components/auth/login-button.tsx`, `app/src/lib/api.ts`

## Requirements

- Firebase Web SDK init từ `VITE_FIREBASE_*` env
- `login()` = Google popup → getIdToken → POST backend
- `logout()` = Firebase `signOut` + BE `/auth/logout`
- UI: icon Github → Google, text giữ "Login"
- Type `User` đổi field names

## Related Code Files

| File | Action |
|------|--------|
| `app/src/lib/firebase.ts` | Create |
| `app/src/contexts/auth-context.tsx` | Modify |
| `app/src/components/auth/login-button.tsx` | Modify |
| `app/src/lib/api.ts` | Modify types |
| `app/src/components/dashboard/leaderboard-section.tsx` | Modify (field rename) |
| `app/src/components/dashboard/login-cta-card.tsx` | Modify (icon) |
| `app/.env.example` | Create/update |
| `app/package.json` | Add `firebase` dep |

## Implementation Steps

### 1. Install firebase
```bash
npm i firebase --prefix app
```

### 2. Create `app/src/lib/firebase.ts`
```ts
import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let _app: FirebaseApp | null = null
let _auth: Auth | null = null

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth
  _app = initializeApp(config)
  _auth = getAuth(_app)
  return _auth
}

export const googleProvider = new GoogleAuthProvider()
```

### 3. Update `app/src/contexts/auth-context.tsx`
```ts
import { signInWithPopup, signInWithRedirect, signOut, type AuthError } from 'firebase/auth'
import { getFirebaseAuth, googleProvider } from '@/lib/firebase'

const login = async () => {
  const auth = getFirebaseAuth()
  try {
    const result = await signInWithPopup(auth, googleProvider)
    const idToken = await result.user.getIdToken()
    const res = await fetch('/auth/firebase/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
    if (!res.ok) throw new Error('session_exchange_failed')
    queryClient.invalidateQueries({ queryKey: ['me'] })
    queryClient.invalidateQueries({ queryKey: ['progress'] })
  } catch (err) {
    const code = (err as AuthError)?.code
    if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
      await signInWithRedirect(auth, googleProvider)
      return
    }
    console.error('[auth] login failed:', err)
  }
}

const logout = async () => {
  try { await signOut(getFirebaseAuth()) } catch {}
  await apiLogout()
  queryClient.setQueryData(['me'], { user: null })
  queryClient.invalidateQueries({ queryKey: ['progress'] })
}
```

**Note:** `login()` giờ là async — update `AuthContextValue` type `login: () => Promise<void>`.

### 4. Handle redirect result (if popup fallback)
Trong `AuthProvider`, thêm `useEffect` chạy `getRedirectResult(auth)` khi mount. Nếu có result → gửi ID token lên BE (cùng logic login). Có thể skip nếu popup đủ dùng — YAGNI.

### 5. Update `app/src/lib/api.ts`
```ts
export interface User {
  firebaseUid: string
  email: string | null
  displayName: string | null
  photoUrl: string | null
}

export interface LeaderboardEntry {
  rank: number
  firebaseUid: string
  displayName: string | null
  photoUrl: string | null
  completedCount: number
  avgScore: number | null
  lastActive: number
}
```

### 6. Update `login-button.tsx`
- Import `Github` → remove
- Add Google icon: dùng inline SVG Google logo (không có trong `lucide-react`). Simple 4-color SVG ~20 lines, hoặc dùng `<svg>` text "G".
- `user.username` → `user.displayName ?? user.email ?? 'User'`
- `user.avatarUrl` → `user.photoUrl ?? undefined`

```tsx
const GoogleIcon = () => (
  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="..."/>
    {/* 4 path Google colors */}
  </svg>
)
```

### 7. Update `leaderboard-section.tsx`, `login-cta-card.tsx`
Rename field access: `githubId` → `firebaseUid`, `username` → `displayName`, `avatarUrl` → `photoUrl`. Fallback `?? 'Anonymous'`.

### 8. Create `app/.env.example`
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_APP_ID=1:...:web:...
```

### 9. CSP update
Check `server/lib/csp-middleware.js` — nếu có `connect-src` strict, thêm:
- `https://*.googleapis.com`
- `https://*.firebaseapp.com`
- `https://securetoken.googleapis.com`
- `https://identitytoolkit.googleapis.com`

Và `frame-src` / `script-src`:
- `https://apis.google.com`
- `https://accounts.google.com`

## Todo

- [ ] `npm i firebase --prefix app`
- [ ] Tạo `firebase.ts`
- [ ] Update `auth-context.tsx` (async login + popup fallback)
- [ ] Update `api.ts` types
- [ ] Update `login-button.tsx` (Google icon + field names)
- [ ] Update `leaderboard-section.tsx`, `login-cta-card.tsx`
- [ ] Tạo `app/.env.example`
- [ ] Update CSP
- [ ] `npm run typecheck --prefix app` pass
- [ ] `npm run build --prefix app` pass

## Success Criteria

- [ ] Typecheck pass
- [ ] Build pass
- [ ] Dev server chạy, click Login → popup Google hiện ra
- [ ] Sau khi chọn account → redirect về `/`, header hiện avatar + displayName
- [ ] Logout: avatar biến mất, Firebase state cleared
- [ ] Reload: session vẫn giữ (cookie sid còn)

## Status

Pending phase-01 hoàn thành.
