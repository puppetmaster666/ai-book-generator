import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from './db';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Request email verification status from Google
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: (user as { image?: string | null }).image ?? null,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
    // Auto-verify email for OAuth users (Google verifies emails)
    async signIn({ user, account }) {
      // If signing in via OAuth provider, ensure email is marked as verified
      if (account?.provider === 'google' && user.email) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, emailVerified: true },
          });

          // If user exists but email not verified, verify it now
          if (existingUser && !existingUser.emailVerified) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { emailVerified: new Date() },
            });
            console.log(`[Auth] Auto-verified email for Google OAuth user: ${user.email}`);
          }

          // Auto-apply pending credits for new or existing OAuth users
          try {
            const pendingCredits = await prisma.pendingCredit.findMany({
              where: { email: user.email!.toLowerCase().trim(), claimed: false },
            });

            if (pendingCredits.length > 0 && existingUser) {
              const totalCredits = pendingCredits.reduce((sum, pc) => sum + pc.credits, 0);
              await prisma.$transaction([
                prisma.user.update({
                  where: { id: existingUser.id },
                  data: { freeCredits: { increment: totalCredits } },
                }),
                ...pendingCredits.map(pc =>
                  prisma.pendingCredit.update({
                    where: { id: pc.id },
                    data: { claimed: true, claimedAt: new Date() },
                  })
                ),
                prisma.notification.create({
                  data: {
                    userId: existingUser.id,
                    type: 'free_credit',
                    title: `You have ${totalCredits} free book credit${totalCredits > 1 ? 's' : ''}!`,
                    message: `Someone gifted you ${totalCredits} book${totalCredits > 1 ? 's' : ''}. Start creating now!`,
                  },
                }),
              ]);
              console.log(`[Auth] Applied ${totalCredits} pending credit(s) to OAuth user ${user.email}`);
            }
          } catch (creditError) {
            console.error('[Auth] Error applying pending credits:', creditError);
          }
        } catch (error) {
          console.error('[Auth] Error auto-verifying OAuth user email:', error);
          // Don't block sign-in if this fails
        }
      }
      return true;
    },
  },
});
