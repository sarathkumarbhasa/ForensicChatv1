from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import pandas as pd
import io
import time
import uuid

from query_engine import classify_intent
from analytics import process_intent
from firebase_logger import log_query, log_session_metadata

app = FastAPI(title="ForensicChat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for dataframes (in production, use a proper cache/db)
session_data = {}

@app.get("/")
async def root():
    return {"status": "ok", "app": "ForensicChat API", "docs": "/docs"}

class QueryRequest(BaseModel):
    session_id: str
    query: str
    language: str = "en"

@app.post("/api/upload")
async def upload_file(session_id: str = Form(...), file: UploadFile = File(...)):
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")
            
        # Clean column names
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        
        # Heuristically detect and fix headers if the file has metadata rows at the top
        common_cdr_fields = {'caller', 'caller_id', 'calling_party', 'a_party', 'calling_number', 'from',
                             'receiver', 'receiver_id', 'called_party', 'b_party', 'called_number', 'to',
                             'duration', 'duration_sec', 'call_duration', 'time_in_seconds',
                             'timestamp', 'date', 'time', 'call_time', 'datetime'}
                             
        current_cols_set = set(df.columns.astype(str).str.lower().str.strip())
        if not any(field in current_cols_set for field in common_cdr_fields):
            # Try to find the real header row within the first 15 rows
            for i in range(min(15, len(df))):
                row_values = df.iloc[i].astype(str).str.lower().str.strip()
                row_values_set = set(row_values)
                if any(field in row_values_set for field in common_cdr_fields):
                    # Promote this row to header
                    df.columns = pd.Index(row_values).str.replace(' ', '_')
                    df = df.iloc[i+1:].reset_index(drop=True)
                    break
        
        # Normalize common column names to standard internal names
        column_mapping = {
            'calling_party': 'caller',
            'calling_number': 'caller',
            'from': 'caller',
            'a_party': 'caller',
            'source': 'caller',
            'called_party': 'receiver',
            'called_number': 'receiver',
            'to': 'receiver',
            'b_party': 'receiver',
            'destination': 'receiver',
            'call_duration': 'duration',
            'duration_sec': 'duration',
            'time_in_seconds': 'duration',
            'length': 'duration',
            'call_time': 'timestamp',
            'date_time': 'timestamp',
            'datetime': 'timestamp',
            'date': 'timestamp',
            'time': 'timestamp',
            'cell_id': 'tower_id',
            'site_id': 'tower_id',
            'location': 'tower_id'
        }
        df.rename(columns=column_mapping, inplace=True)
        
        # Cast identifier columns to string to prevent mismatch during filtering
        for col in ['caller', 'receiver', 'tower_id']:
            if col in df.columns:
                df[col] = df[col].astype(str).str.replace(r'\.0$', '', regex=True) # strip .0 if parsed as float
                
        if session_id not in session_data:
            session_data[session_id] = []
            
        session_data[session_id].append(df)
        
        # Combine all dfs for the session
        combined_df = pd.concat(session_data[session_id], ignore_index=True)
        session_data[session_id] = [combined_df] # Store combined
        
        metadata = {
            "columns": list(combined_df.columns),
            "row_count": len(combined_df),
            "files_uploaded": len(session_data[session_id])
        }
        
        log_session_metadata(session_id, metadata)
        
        return {
            "message": "File uploaded successfully",
            "metadata": metadata,
            "preview": combined_df.head(10).fillna("").to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/query")
async def process_query(request: QueryRequest, background_tasks: BackgroundTasks):
    start_time = time.time()
    
    if request.session_id not in session_data or not session_data[request.session_id]:
        raise HTTPException(status_code=400, detail="No data uploaded for this session")
        
    df = session_data[request.session_id][0]
    
    # 1. Classify Intent
    classification = classify_intent(request.query)
    intent = classification.get("intent", "unknown")
    target_number = classification.get("target_number")
    direction = classification.get("direction", "both")
    metric = classification.get("metric", "both")
    
    result = {}
    success = True
    
    try:
        # 2. Map to Analytics Function
        result = process_intent(intent, target_number, direction, metric, df)
        if result.get("error"):
            success = False
            
    except Exception as e:
        result = {
            "intent": intent,
            "answer": "",
            "data": [],
            "chart_type": "table",
            "error": f"Analysis failed: {str(e)}"
        }
        success = False
        
    response_time = (time.time() - start_time) * 1000
    
    # Log asynchronously
    background_tasks.add_task(
        log_query, 
        request.session_id, 
        request.query, 
        intent, 
        response_time, 
        success
    )
    
    result["timestamp"] = int(time.time() * 1000)
    result["intent"] = intent
    
    # --- Compute Accuracy Score ---
    score = 0
    reasons = []
    
    # 1. Intent confidence (40 pts)
    if intent == "unknown":
        intent_score = 0
        reasons.append("Intent could not be classified")
    elif classification.get("_source") == "regex":
        intent_score = 30
        reasons.append("Regex-classified (deterministic fallback)")
    else:
        intent_score = 40
        reasons.append("AI-classified with high confidence")
    score += intent_score
    
    # 2. Data coverage (40 pts) – how many rows matched
    total_rows = len(df)
    matched_rows = len(result.get("data", []))
    if total_rows > 0 and matched_rows > 0:
        coverage = min(matched_rows / total_rows, 1.0) if matched_rows < total_rows else 1.0
        data_score = int(40 * min(1, matched_rows / max(1, total_rows * 0.01)))
        data_score = min(40, data_score)
        score += data_score
        reasons.append(f"{matched_rows} result rows from {total_rows} total")
    else:
        reasons.append("No matching rows found")
    
    # 3. Column completeness (20 pts) – required cols exist
    required = {"caller": 5, "receiver": 5, "duration": 5, "timestamp": 5}
    col_score = sum(v for col, v in required.items() if col in df.columns)
    score += col_score
    if col_score < 20:
        reasons.append("Some expected columns missing")
    
    # 4. Penalise for errors
    if result.get("error"):
        score = max(0, score - 30)
        reasons.append("Error during analysis")
    
    score = min(100, max(0, score))
    
    if score >= 85:
        accuracy_label = "High"
        accuracy_color = "green"
    elif score >= 60:
        accuracy_label = "Medium"
        accuracy_color = "amber"
    else:
        accuracy_label = "Low"
        accuracy_color = "red"
    
    result["accuracy_score"] = score
    result["accuracy_label"] = accuracy_label
    result["accuracy_color"] = accuracy_color
    result["accuracy_reasons"] = reasons
    result["row_count"] = total_rows
    
    return result

@app.get("/api/report")
async def download_report(session_id: str):
    """Download the full session dataset as a CSV report."""
    if session_id not in session_data or not session_data[session_id]:
        raise HTTPException(status_code=400, detail="No data found for this session")
    
    df = session_data[session_id][0]
    
    # Build CSV in memory
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)
    
    filename = f"forensichat_report_{session_id[:8]}.csv"
    
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
