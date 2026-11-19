import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'development-only-change-this-secret-please-123456');
const COOKIE = 'competency360_session';
export async function createSession(user: { id: string; role: string; name: string }) {
  const token = await new SignJWT({ role: user.role, name: user.name }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuedAt().setExpirationTime('8h').sign(secret);
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 8 * 60 * 60 });
}
export async function clearSession() { const jar = await cookies(); jar.delete(COOKIE); }
export async function getSession() {
  const jar = await cookies(); const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (!payload.sub) return null;
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { staffProfile: true } });
    if (!user) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role, staffProfile: user.staffProfile };
  } catch { return null; }
}
export async function requireRole(roles: string[]) {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) throw new Error('UNAUTHORIZED');
  return session;
}
