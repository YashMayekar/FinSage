// app/api/transactions/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'alice@gmail.com' },
      select: {
        id: true,
        name: true,
        email: true,
        // Add more fields as needed
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 🔥 Wrap the user inside an object so frontend can access `data.user`
    return NextResponse.json({ user });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}
