# Phase 5: Frontend Auth

**Priority:** P1 | **Status:** completed | **Effort:** 4h

## Context Links
- [Phase 4: API Updates](phase-04-api-updates.md)
- [Current site-header.tsx](../../../app/src/components/layout/site-header.tsx)

## Overview

Create React auth context to manage user state. Add login/logout button to header. Update progress queries to handle auth state.

## Key Insights

- Auth context fetches `/api/me` on mount
- Login button redirects to `/auth/github`
- Logout calls POST `/auth/logout` then refreshes state
- React Query invalidates progress when auth changes

## Requirements

**Functional:**
- Auth context provides user state globally
- Login button in header (shows avatar when logged)
- Logout dropdown menu
- Progress queries refetch on auth change

**Non-functional:**
- No flash of wrong state on page load
- Handle network errors gracefully

## Related Code Files

**Create:**
- `app/src/contexts/auth-context.tsx`
- `app/src/components/auth/login-button.tsx`
- `app/src/lib/api.ts` — add auth endpoints

**Modify:**
- `app/src/components/layout/site-header.tsx` — add login button
- `app/src/main.tsx` — wrap with AuthProvider
- `app/src/components/dashboard/dashboard-layout.tsx` — handle auth state

## Implementation Steps

1. Add API functions in `app/src/lib/api.ts`:
   ```ts
   // [RED TEAM FIX] Internal id removed from API response
   export interface User {
     githubId: number;
     username: string;
     avatarUrl: string;
   }

   export async function getMe(): Promise<{ user: User | null }> {
     const res = await fetch('/api/me');
     if (!res.ok) return { user: null };
     return res.json();
   }

   export async function logout(): Promise<void> {
     await fetch('/auth/logout', { method: 'POST' });
   }
   ```

2. Create `app/src/contexts/auth-context.tsx`:
   ```tsx
   import { createContext, useContext, ReactNode } from 'react';
   import { useQuery, useQueryClient } from '@tanstack/react-query';
   import { getMe, logout as apiLogout, type User } from '@/lib/api';

   interface AuthContextValue {
     user: User | null;
     isLoading: boolean;
     login: () => void;
     logout: () => Promise<void>;
   }

   const AuthContext = createContext<AuthContextValue | null>(null);

   export function AuthProvider({ children }: { children: ReactNode }) {
     const queryClient = useQueryClient();

     const { data, isLoading } = useQuery({
       queryKey: ['me'],
       queryFn: getMe,
       staleTime: 5 * 60 * 1000, // 5 min
       retry: false,
     });

     const login = () => {
       window.location.href = '/auth/github';
     };

     const logout = async () => {
       await apiLogout();
       queryClient.setQueryData(['me'], { user: null });
       queryClient.invalidateQueries({ queryKey: ['progress'] });
     };

     return (
       <AuthContext.Provider
         value={{
           user: data?.user ?? null,
           isLoading,
           login,
           logout,
         }}
       >
         {children}
       </AuthContext.Provider>
     );
   }

   export function useAuth() {
     const ctx = useContext(AuthContext);
     if (!ctx) throw new Error('useAuth must be used within AuthProvider');
     return ctx;
   }
   ```

3. Create `app/src/components/auth/login-button.tsx`:
   ```tsx
   import { Github, LogOut, User } from 'lucide-react';
   import { Button } from '@/components/ui/button';
   import {
     DropdownMenu,
     DropdownMenuContent,
     DropdownMenuItem,
     DropdownMenuTrigger,
   } from '@/components/ui/dropdown-menu';
   import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
   import { useAuth } from '@/contexts/auth-context';

   export function LoginButton() {
     const { user, isLoading, login, logout } = useAuth();

     if (isLoading) {
       return (
         <Button variant="ghost" size="icon" disabled>
           <User className="h-4 w-4 animate-pulse" />
         </Button>
       );
     }

     if (!user) {
       return (
         <Button variant="outline" size="sm" onClick={login}>
           <Github className="h-4 w-4 mr-2" />
           Login
         </Button>
       );
     }

     return (
       <DropdownMenu>
         <DropdownMenuTrigger asChild>
           <Button variant="ghost" size="icon" className="rounded-full">
             <Avatar className="h-8 w-8">
               <AvatarImage src={user.avatarUrl} alt={user.username} />
               <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
             </Avatar>
           </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
           <DropdownMenuItem disabled className="font-medium">
             {user.username}
           </DropdownMenuItem>
           <DropdownMenuItem onClick={logout}>
             <LogOut className="h-4 w-4 mr-2" />
             Logout
           </DropdownMenuItem>
         </DropdownMenuContent>
       </DropdownMenu>
     );
   }
   ```

4. Update `app/src/components/layout/site-header.tsx`:
   ```tsx
   import { LoginButton } from '@/components/auth/login-button';
   // ...
   // Add after theme toggle:
   <LoginButton />
   ```

5. Wrap app with AuthProvider in `app/src/main.tsx`:
   ```tsx
   import { AuthProvider } from '@/contexts/auth-context';
   // ...
   <QueryClientProvider client={queryClient}>
     <AuthProvider>
       <App />
     </AuthProvider>
   </QueryClientProvider>
   ```

## Todo List

- [x] Add auth types and API functions to `api.ts`
- [x] Create `auth-context.tsx`
- [x] Create `login-button.tsx`
- [x] Update `site-header.tsx` — add LoginButton
- [x] Update `main.tsx` — wrap with AuthProvider
- [x] Install shadcn Avatar + DropdownMenu if needed
- [x] Test: login flow redirects to GitHub
- [x] Test: logged user sees avatar in header
- [x] Test: logout clears state

## Success Criteria

- Guest sees "Login" button
- After login, avatar shows in header
- Dropdown shows username + logout option
- Logout clears session and returns to guest state
- Progress queries refetch after auth change

## Security Considerations

- Never store tokens in localStorage
- Rely on HttpOnly cookie for session
- Logout clears server session, not just client state
