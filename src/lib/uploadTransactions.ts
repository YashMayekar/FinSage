// lib/uploadTransactions.ts

export async function uploadTransactionsToDatabase(
    csvData: any[],
    columnMapping: Record<string, string>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const transformedData = csvData.map((row) => ({
        date: new Date(row[columnMapping.date]),
        description: row[columnMapping.description],
        amount: parseFloat(row[columnMapping.amount]),
        type: columnMapping.type ? row[columnMapping.type] : 'None',
      }));
  
      console.log('\n\nTransformed Data:', transformedData);
      const response = await fetch('/api/transactions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transformedData),
      });
  
      if (!response.ok) throw new Error('Failed to import transactions');
  
      return {
        success: true,
        message: `Successfully imported ${transformedData.length} transactions`,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'An unknown error occurred';
      return { success: false, message };
    }
  }
  