// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import axios from 'axios';

interface RawTransaction {
  id?: string;
  date?: string;
  description?: string;
  type?: string;
  amount?: number;
  additionalData?: string;
}

interface AnalyzedTransaction {
  id: string;
  type: string;  // "Income/Credit" | "Expense/Debit"
  category: string;
  confidence: number;
}

const OLLAMA_ENDPOINT = 'http://localhost:11434/api/chat';
const ANALYSIS_MODEL = 'FinSage-LLama3.1:8b';

// Named export for POST method
export async function POST(request: Request) {
  try {
    const transactions: RawTransaction[] = await request.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'Expected a non-empty array of transactions' },
        { status: 400 }
      );
    }

    const prompt = `
      Transactions:
      ${JSON.stringify(transactions, null, 2)}
      Analyze these transactions with high accuracy and return raw JSON format as the following format:
      [{{"id": "The original id", "type": "Income/Credit or Expense/Debit", "category": "The specific category from the provided list", "confidence": "Your confidence in the categorization (0.7-1.0)"}}]       Only return the JSON response without any additional text.
    `;

    const ollamaResponse = await axios.post(OLLAMA_ENDPOINT, {
      model: ANALYSIS_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    });

    const analyzedTransactions: AnalyzedTransaction[] = JSON.parse(
      ollamaResponse.data.message?.content || '[]'
    );

    return NextResponse.json(analyzedTransactions);
  } catch (error) {
    console.error('Analysis failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}