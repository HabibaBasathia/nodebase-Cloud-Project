import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/db";

export const auth = betterAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  advanced: {
    trustHost: true,
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  session: {
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  plugins: [],
});