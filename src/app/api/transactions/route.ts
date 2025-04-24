// app/api/transactions/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Attempt to find the user by email
    let user = await prisma.user.findUnique({
      where: { email: 'alice@gmail.com' },
    });

    // If the user does not exist, create the user
    if (!user) {
      const hashedPassword = await bcrypt.hash('alice@123', 10);  // hash the password
      user = await prisma.user.create({
        data: {
          name: 'Alice',
          email: 'alice@gmail.com',
          password: hashedPassword, // Save hashed password for security
        },
      });
      console.log('✅ User Alice created');
    }

    // Filter and prepare transactions by skipping invalid ones
    const validTransactions = data.filter((tx: any) => {
      return tx.amount && tx.date && tx.type; // Ensure all necessary fields are present
    }).map((tx: any) => ({
      userId: user.id,  // Use the user ID from the found or created user
      date: new Date(tx.date),
      description: tx.description || 'NA', // Use 'NA' if no description is provided
      amount: tx.amount,
      type: tx.type,
    }));

    if (validTransactions.length === 0) {
      return NextResponse.json({ error: 'No valid transactions to upload' }, { status: 400 });
    }

    // Create valid transactions
    const created = await prisma.transaction.createMany({
      data: validTransactions,
    });

    return NextResponse.json({ message: 'Transactions uploaded successfully', count: created.count });
  } catch (err) {
    console.error(err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to upload transactions';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Fetch Alice
    const user = await prisma.user.findUnique({
      where: { email: 'alice@gmail.com' },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get Alice's transactions
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' }, // optional: newest first
    });

    return NextResponse.json(transactions);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}