import os
import uuid
import shutil
from typing import Optional, Dict
from fastapi import FastAPI, UploadFile, File, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Import analyzer methods
from analyzer import analyze_csv_metadata, query_analyst

# Load environment variables from .env
load_dotenv()

app = FastAPI(title="AI Data Analyst API", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory configuration
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# In-memory registry to store uploaded file details
# Mapping file_id (UUID string) -> { "filename": original_name, "path": saved_path, "rows": int, "columns_count": int }
db_files: Dict[str, dict] = {}


class QueryRequest(BaseModel):
    file_id: str
    query: str
    openai_api_key: Optional[str] = None


@app.get("/")
def read_root():
    return {"status": "running", "message": "AI Data Analyst Backend is online."}


@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Accepts a CSV file, saves it, analyzes its schema, and returns metadata.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only CSV files are supported."
        )

    file_id = str(uuid.uuid4())
    saved_filename = f"{file_id}.csv"
    saved_path = os.path.join(UPLOAD_DIR, saved_filename)

    try:
        # Save file to uploads folder
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Parse metadata
        meta = analyze_csv_metadata(saved_path)
        
        # Save to our in-memory db
        file_info = {
            "file_id": file_id,
            "filename": file.filename,
            "path": saved_path,
            "rows": meta["rows"],
            "columns_count": meta["columns_count"],
            "columns": [col["name"] for col in meta["columns"]]
        }
        db_files[file_id] = file_info
        
        return {
            "success": True,
            "file_id": file_id,
            "filename": file.filename,
            "metadata": meta
        }
        
    except Exception as e:
        # Cleanup file if created and error occurred
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process CSV file: {str(e)}"
        )


@app.get("/api/files")
def list_files():
    """
    Returns list of all uploaded CSV files.
    """
    return [
        {
            "file_id": f["file_id"],
            "filename": f["filename"],
            "rows": f["rows"],
            "columns_count": f["columns_count"],
            "columns": f["columns"]
        }
        for f in db_files.values()
    ]


@app.get("/api/files/{file_id}/preview")
def get_file_preview(file_id: str):
    """
    Returns data preview and metadata for a specific file.
    """
    if file_id not in db_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File ID not found."
        )
        
    file_info = db_files[file_id]
    try:
        meta = analyze_csv_metadata(file_info["path"])
        return {
            "file_id": file_id,
            "filename": file_info["filename"],
            "metadata": meta
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve preview: {str(e)}"
        )


@app.post("/api/query")
def run_query(request: QueryRequest):
    """
    Executes an AI analysis on the selected CSV file.
    """
    if request.file_id not in db_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File ID not found."
        )
        
    file_info = db_files[request.file_id]
    
    try:
        analysis_result = query_analyst(
            query_str=request.query,
            file_path=file_info["path"],
            custom_api_key=request.openai_api_key
        )
        return {
            "success": True,
            "file_id": request.file_id,
            "query": request.query,
            **analysis_result
        }
    except ValueError as ve:
        # Caught validation or configuration errors (e.g. security block or missing API Key)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )
    except Exception as e:
        # Caught execution errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@app.delete("/api/files/{file_id}")
def delete_file(file_id: str):
    """
    Deletes an uploaded file from disk and in-memory registry.
    """
    if file_id not in db_files:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File ID not found."
        )
        
    file_info = db_files[file_id]
    try:
        if os.path.exists(file_info["path"]):
            os.remove(file_info["path"])
        del db_files[file_id]
        return {"success": True, "message": "File deleted successfully."}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete file: {str(e)}"
        )
