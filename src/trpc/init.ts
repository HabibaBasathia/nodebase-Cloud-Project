import { auth } from '@/lib/auth';
import { initTRPC, TRPCError } from '@trpc/server';
import { headers } from 'next/headers';
import { cache } from 'react';
import superjson from "superjson"

export const createTRPCContext = cache(async () => {
  return { userId: 'user_123' };
});

const t = initTRPC.create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const baseProcedure = t.procedure;

export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unathorized",
    });
  }

  return next({ ctx: { ...ctx, auth: session } });
});

// We are bypassing the Polar subscription check so you can use the app.
export const premiumProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    // We create a "fake" customer object so the rest of your app doesn't break
    const customer = { activeSubscriptions: [{ id: 'temp_fix' }] };

    return next({ ctx: { ...ctx, customer } });
  },
);