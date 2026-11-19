import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/auth';
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    await createSession(user);
    return NextResponse.json({ id: user.id, name: user.name, role: user.role });
  } catch { return NextResponse.json({ error: 'Unable to sign in.' }, { status: 500 }); }
}
