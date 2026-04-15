/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { getUserByUsername, verifyPassword } from '@/lib/db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        portal: { label: 'Portal', type: 'text' }, // 'admin' or 'user'
      },
      async authorize(credentials) {
        const username = credentials?.username as string;
        const password = credentials?.password as string;
        const portal = credentials?.portal as string;
        
        if (!username || !password || !portal) return null;

        const user = getUserByUsername(username);
        if (!user) return null;
        if (!user.active) return null;
        
        // Enforce strict portal logic - admins use the admin portal, users use the user portal
        if (user.role !== portal) {
          throw new Error(`Access denied. Please use the ${user.role} login portal.`);
        }

        const deployedPortal = process.env.PORTAL_TYPE;
        if (deployedPortal && deployedPortal !== user.role) {
          throw new Error(`This link is securely restricted to ${deployedPortal}s only. Please use the correct link.`);
        }

        const valid = verifyPassword(password, user.password_hash, user.password_salt);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.display_name,
          email: user.username,
          image: user.role, // store role in image field for simplicity
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.role = user.image; // role was stored in image
        token.userId = user.id;
        token.username = user.email;
      }
      return token;
    },
    async session({ session, token }: any) {
      session.user.role = token.role;
      session.user.userId = token.userId;
      session.user.id = token.userId;
      session.user.username = token.username;
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
});
