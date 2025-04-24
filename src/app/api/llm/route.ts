import { NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    console.log('Received request body:', requestBody);

    const { transactions } = requestBody;

    if (!transactions || !Array.isArray(transactions)) {
      console.error('Invalid request - missing transactions array');
      return NextResponse.json(
        { message: 'Invalid request - expected transactions array' },
        { status: 400 }
      );
    }

    // Validate each transaction has at least an id
    if (transactions.some(tx => !tx.id && tx.id !== 0)) {
      console.error('Invalid transactions - missing ids', transactions);
      return NextResponse.json(
        { message: 'All transactions must have an id' },
        { status: 400 }
      );
    }

    const prompt = `
You are a financial classification assistant. 

Your job is to analyze a list of transactions and classify each one as either:
- "income"  → money coming in
- "expense" → money going out

Each transaction includes:
- an "id" field (unique identifier)
- a "type" field (which may be "cr", "dr", "credit", "debit", "income", "expense", etc.)
- a "description" field (like "Salary", "Amazon Purchase", "Grocery", "Refund", etc.)

Use both fields to determine if the transaction is income or expense. 
Here are some guidelines:

- "credit", "cr", and similar usually mean **income**
- "debit", "dr", and similar usually mean **expense**
- Use the description for additional context

Return the results as a valid JSON array of objects in this exact format:
[
  { "id": "original_id_1", "classification": "income" },
  { "id": "original_id_2", "classification": "expense" },
  // ... more classifications
  { "id": "original_id_n", "classification": "income" }
]

IMPORTANT:
1. Maintain the exact same order as the input transactions
2. Always return valid JSON
3. Don't include any additional commentary or text outside the JSON array
4. response should be a JSON array of objects with "id" and "classification" fields only, that is the results array
Here are the transactions to classify:
${JSON.stringify(transactions, null, 2)}
`;

    console.log('Sending prompt to Gemini:', prompt);

    const response = await fetch(GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error response:', errorData);
      return NextResponse.json(
        { message: `REsponse not okay Gemini API returned ${response.status}: ${errorData}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('Gemini API full response:', data);

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Gemini.';
    console.log('\n\n\nenerated text:', generatedText);

    // Extract JSON from markdown code blocks if present
    let jsonString = generatedText;
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.slice(7, -3).trim(); // Remove ```json and trailing ```
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.slice(3, -3).trim(); // Remove generic ``` markers
    }

    // Parse the cleaned JSON
    const resultArray = JSON.parse(jsonString);

    // Validate the parsed data
    if (!Array.isArray(resultArray)) {
      throw new Error('Gemini did not return an array');
    }

    return NextResponse.json({ 
      result: jsonString, // Directly use the parsed array
    });

   } catch (err) {
     console.error('Error:', err);
  }

}

// Optionally add other HTTP methods if needed
export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { message: 'Method not allowed' },
    { status: 405 }
  );
}