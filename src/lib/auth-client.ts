import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  // Polar plugin removed from here to prevent client-side 401s
  plugins: [], 
});