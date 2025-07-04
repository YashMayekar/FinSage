import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
/**
 * API route to process transactions.
 * Expects a POST request with a JSON body containing an array of transactions.
 * Each transaction should have a date, amount, type, and optional description and additionalData.
 * The date should be in the format "DD-MM-YYYY".
 * The amount can be a number or a string that can be parsed to a number.
 * The type should be a string.
 */
export async function POST(req: Request) {
  await prisma.$connect();
  console.log('\n\n\n\nStarting transaction processing');
  try {
    // Authenticate the user and create or retrieve the user in the database
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const clerkUser = await clerkClient.users.getUser(userId);
    const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    }
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: clerkUser.firstName
            ? `${clerkUser.firstName} ${clerkUser.lastName || ''}`.trim()
            : clerkUser.username || 'Unnamed User',
        },
      });
    }


    const { transactions: rawTransactions } = await req.json();
    console.log("The Length of rawTransactions is: ", rawTransactions.length);
    if (!Array.isArray(rawTransactions)) {
      return NextResponse.json({ error: 'Expected transactions array in request body' }, { status: 400 });
    }

    const results = {
      successful: 0,
      failed: [] as Array<{ transaction: any; error: string }>,
    };

    for (let i = 0; i < rawTransactions.length; i++) {
      const rawTx = rawTransactions[i];
      try {
        const [day, month, year] = (rawTx.date || '').split('-');
        const transactionDate = new Date(`${year}-${month}-${day}`);

        if (isNaN(transactionDate.getTime())) {
          throw new Error(`Invalid date: "${rawTx.date}"`);
        }

        const amount =
          typeof rawTx.amount === 'number'
            ? rawTx.amount
            : parseFloat(String(rawTx.amount).replace(/,/g, ''));

        if (isNaN(amount)) {
          throw new Error('Invalid amount');
        }

        if (!rawTx.type || typeof rawTx.type !== 'string') {
          throw new Error('Invalid transaction type');
        }

        await prisma.transaction.create({
          data: {
            userId: user.id,
            date: transactionDate.toString(),
            description: rawTx.description?.toString().substring(0, 255) || null,
            type: rawTx.type.toString().substring(0, 50),
            amount,
            additionalData: rawTx.additionalData
              ? JSON.stringify(rawTx.additionalData)
              : null,
          },
        });

        results.successful++;
        console.log(`Inserted ${results.successful}/${rawTransactions.length}`);
      } catch (error) {
        results.failed.push({
          transaction: rawTx,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        console.warn(
          `❌ Failed to insert ${i + 1}/${rawTransactions.length}: ${error instanceof Error ? error.message : 'Unknown'}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount: results.successful,
      failedCount: results.failed.length,
      totalProcessed: rawTransactions.length,
      sampleFailures: results.failed.slice(0, 5),
      warnings:
        results.failed.length > 0
          ? `${results.failed.length} transactions failed processing`
          : undefined,
    });
  } catch (error) {
    console.error('Transaction processing error:', error);
    return NextResponse.json(
      {
        error: 'Transaction processing failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
    console.log('Transaction processing completed');
  }
}
