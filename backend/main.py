# python -m uvicorn main:app --reload
# http://localhost:8000/transactions?user_id=your_clerk_user_id

print("Starting FastAPI app...")
import os
from fastapi import FastAPI, HTTPException, Query
from sqlalchemy import create_engine, Column, String, Float, DateTime, MetaData, Table, select
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from typing import Dict, List
import ollama
import json
from typing import Optional

load_dotenv()

# Load raw DB config from .env
raw_database_url = os.getenv("DATABASE_URL")

# 🔧 Patch the driver inline to use 'psycopg' (not psycopg2)
if raw_database_url.startswith("postgresql://"):
    DATABASE_URL = raw_database_url.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    DATABASE_URL = raw_database_url

# Setup SQLAlchemy engine
engine = create_engine(DATABASE_URL)
metadata = MetaData()
SessionLocal = sessionmaker(bind=engine)

# Define Transaction table (match your Prisma schema)
transaction_table = Table(
    "Transaction", metadata,
    Column("id", String, primary_key=True),
    Column("userId", String, nullable=False),
    Column("amount", Float, nullable=False),
    Column("description", String),
    Column("date", DateTime, nullable=False),
    Column("additionalData", String),
    Column("type", String),  # Assuming this exists in your table
)

# Create FastAPI app
app = FastAPI()

def LLM(transactions: List[Dict]) -> List[Dict]:
    try:
        prompt = f'''
            {json.dumps(transactions, indent=2, default=str)}

            Analyze these transactions with high accuracy and return raw JSON format as the following format:
            [{{"id": "The original id", "type": "Income/Credit or Expense/Debit", "category": "The specific category from the provided list", "confidence": "Your confidence in the categorization (0.7-1.0)"}}]

            Only return the JSON response without any additional text.
        '''
        response = ollama.chat(
            model='FinSage-LLama3.1:8b',  # Fixed model name (removed space after colon)
            messages=[{ 'role': 'user', 'content': prompt }]      
        )
        return response['message']['content']
    except Exception as e:
        return f"Error processing batch: {str(e)}"
    


@app.get("/transactions")
def get_transactions(user_id: str = Query(...),) -> Dict:
    print("Fetching transactions for user:", user_id)
    analyzed_transactions = []
    
    with SessionLocal() as session:
        # Select only the required columns
        query = select(
            transaction_table.c.id,
            transaction_table.c.date,
            transaction_table.c.description,
            transaction_table.c.type,
            transaction_table.c.amount,
            transaction_table.c.additionalData
        ).where(transaction_table.c.userId == user_id)
        
        results = session.execute(query).fetchall()

        if not results:
            raise HTTPException(status_code=404, detail="No transactions found for this user.")

        # Convert to list of dictionaries with only the required fields
        transactions = [
            {
                "id": row.id,
                "date": row.date,
                "description": row.description,
                "type": row.type,
                "amount": row.amount,
                "additionalData": row.additionalData
            }
            for row in results
        ]

        for tx in transactions[:10]:  # Process only the first 10 transactions
            print(f"\nAnalyzing transaction: {tx['id']}")
            analyzed_data = LLM([tx])
            print(f"Analyzed data for {tx['id']}: {analyzed_data}") 
            try:
                analyzed_json = json.loads(analyzed_data)
                analyzed_transactions.extend(analyzed_json)
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                continue

        return {
            "userId": user_id,  
            "analyzed transactions": analyzed_transactions
        }
    

    