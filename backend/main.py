import os
import uuid
from typing import Dict, Any

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename

from analyzer import analyze_csv_metadata, query_analyst


# ──────────────────────────────────────────────────────────────────────────────
# Environment configuration
# ──────────────────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(ENV_PATH)

UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {"csv"}
MAX_UPLOAD_SIZE_MB = 20


# ──────────────────────────────────────────────────────────────────────────────
# Flask application
# ──────────────────────────────────────────────────────────────────────────────

app = Flask(__name__)

app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_SIZE_MB * 1024 * 1024
app.config["UPLOAD_FOLDER"] = UPLOAD_DIR
app.config["JSON_SORT_KEYS"] = False


# Allow local React frontend and deployed frontend
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
]

frontend_url = os.getenv("FRONTEND_URL")

if frontend_url:
    allowed_origins.append(frontend_url.rstrip("/"))


CORS(
    app,
    resources={
        r"/api/*": {
            "origins": allowed_origins,
            "methods": ["GET", "POST", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    },
)


# In-memory registry:
# file_id -> file information
db_files: Dict[str, Dict[str, Any]] = {}


# ──────────────────────────────────────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────────────────────────────────────

def allowed_file(filename: str) -> bool:
    """
    Check whether an uploaded file has an allowed extension.
    """
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS
    )


def delete_saved_file(file_path: str) -> None:
    """
    Safely delete a file from disk.
    """
    try:
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
    except OSError:
        app.logger.exception("Unable to delete file: %s", file_path)


def get_json_error(response, default_message: str) -> str:
    """
    Safely extract an error message from an internal response object.
    """
    try:
        payload = response.get_json(silent=True) or {}
        return payload.get("detail", default_message)
    except Exception:
        return default_message


# ──────────────────────────────────────────────────────────────────────────────
# Error handlers
# ──────────────────────────────────────────────────────────────────────────────

@app.errorhandler(RequestEntityTooLarge)
def handle_large_file(_error):
    return jsonify({
        "success": False,
        "detail": (
            f"File is too large. Maximum allowed size is "
            f"{MAX_UPLOAD_SIZE_MB} MB."
        ),
    }), 413


@app.errorhandler(404)
def handle_not_found(_error):
    return jsonify({
        "success": False,
        "detail": "API endpoint not found.",
    }), 404


@app.errorhandler(405)
def handle_method_not_allowed(_error):
    return jsonify({
        "success": False,
        "detail": "HTTP method not allowed for this endpoint.",
    }), 405


@app.errorhandler(Exception)
def handle_unexpected_error(error):
    app.logger.exception("Unexpected server error")

    return jsonify({
        "success": False,
        "detail": f"Unexpected server error: {str(error)}",
    }), 500


# ──────────────────────────────────────────────────────────────────────────────
# Health check
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/")
def read_root():
    return jsonify({
        "status": "running",
        "message": "AI Data Analyst Backend is online.",
        "upload_limit_mb": MAX_UPLOAD_SIZE_MB,
    }), 200


@app.get("/api/health")
def health_check():
    return jsonify({
        "success": True,
        "status": "healthy",
        "service": "AI Data Analyst Backend",
        "uploaded_files": len(db_files),
    }), 200


# ──────────────────────────────────────────────────────────────────────────────
# Upload CSV
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/api/upload")
def upload_file():
    """
    Accept a CSV file, save it, analyze it and return metadata.
    """

    if "file" not in request.files:
        return jsonify({
            "success": False,
            "detail": "No file field was found in the request.",
        }), 400

    uploaded_file = request.files["file"]

    if uploaded_file is None or not uploaded_file.filename:
        return jsonify({
            "success": False,
            "detail": "No file was selected.",
        }), 400

    original_filename = secure_filename(uploaded_file.filename)

    if not original_filename:
        return jsonify({
            "success": False,
            "detail": "Invalid file name.",
        }), 400

    if not allowed_file(original_filename):
        return jsonify({
            "success": False,
            "detail": "Invalid file format. Only CSV files are supported.",
        }), 400

    file_id = str(uuid.uuid4())
    saved_filename = f"{file_id}.csv"
    saved_path = os.path.join(app.config["UPLOAD_FOLDER"], saved_filename)

    try:
        uploaded_file.save(saved_path)

        if not os.path.exists(saved_path):
            raise RuntimeError("The uploaded file could not be saved.")

        if os.path.getsize(saved_path) == 0:
            raise ValueError("The uploaded CSV file is empty.")

        metadata = analyze_csv_metadata(saved_path)

        if not isinstance(metadata, dict):
            raise ValueError("CSV analyzer returned invalid metadata.")

        required_fields = {"rows", "columns_count", "columns"}

        missing_fields = required_fields.difference(metadata.keys())

        if missing_fields:
            raise ValueError(
                "CSV metadata is missing required fields: "
                + ", ".join(sorted(missing_fields))
            )

        columns_metadata = metadata.get("columns", [])

        if not isinstance(columns_metadata, list):
            raise ValueError("Invalid columns metadata returned by analyzer.")

        column_names = []

        for column in columns_metadata:
            if isinstance(column, dict) and "name" in column:
                column_names.append(str(column["name"]))

        file_info = {
            "file_id": file_id,
            "filename": original_filename,
            "saved_filename": saved_filename,
            "path": saved_path,
            "rows": int(metadata.get("rows", 0)),
            "columns_count": int(metadata.get("columns_count", 0)),
            "columns": column_names,
        }

        db_files[file_id] = file_info

        return jsonify({
            "success": True,
            "message": "CSV file uploaded successfully.",
            "file_id": file_id,
            "filename": original_filename,
            "metadata": metadata,
        }), 201

    except UnicodeDecodeError:
        delete_saved_file(saved_path)

        return jsonify({
            "success": False,
            "detail": (
                "Unable to read the CSV encoding. Save the file as UTF-8 "
                "and upload it again."
            ),
        }), 400

    except ValueError as error:
        delete_saved_file(saved_path)

        return jsonify({
            "success": False,
            "detail": str(error),
        }), 400

    except Exception as error:
        delete_saved_file(saved_path)
        app.logger.exception("CSV upload failed")

        return jsonify({
            "success": False,
            "detail": f"Failed to process CSV file: {str(error)}",
        }), 500


# ──────────────────────────────────────────────────────────────────────────────
# List uploaded files
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/api/files")
def list_files():
    """
    Return information about all CSV files currently stored in memory.
    """

    files = [
        {
            "file_id": file_info["file_id"],
            "filename": file_info["filename"],
            "rows": file_info["rows"],
            "columns_count": file_info["columns_count"],
            "columns": file_info["columns"],
        }
        for file_info in db_files.values()
    ]

    return jsonify(files), 200


# ──────────────────────────────────────────────────────────────────────────────
# File preview
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/api/files/<string:file_id>/preview")
def get_file_preview(file_id: str):
    """
    Return preview and metadata for one uploaded CSV file.
    """

    file_info = db_files.get(file_id)

    if not file_info:
        return jsonify({
            "success": False,
            "detail": "File ID not found.",
        }), 404

    file_path = file_info.get("path")

    if not file_path or not os.path.exists(file_path):
        db_files.pop(file_id, None)

        return jsonify({
            "success": False,
            "detail": "The CSV file no longer exists on the server.",
        }), 404

    try:
        metadata = analyze_csv_metadata(file_path)

        return jsonify({
            "success": True,
            "file_id": file_id,
            "filename": file_info["filename"],
            "metadata": metadata,
        }), 200

    except Exception as error:
        app.logger.exception("Failed to retrieve CSV preview")

        return jsonify({
            "success": False,
            "detail": f"Failed to retrieve preview: {str(error)}",
        }), 500


# ──────────────────────────────────────────────────────────────────────────────
# AI query
# ──────────────────────────────────────────────────────────────────────────────

@app.post("/api/query")
def run_query():
    """
    Execute an AI-based data analysis query for an uploaded CSV file.
    """

    body = request.get_json(silent=True)

    if not isinstance(body, dict):
        return jsonify({
            "success": False,
            "detail": "A valid JSON request body is required.",
        }), 400

    file_id = str(body.get("file_id", "")).strip()
    query_string = str(body.get("query", "")).strip()
    custom_api_key = body.get("openai_api_key") or None
    model = str(body.get("model", "gpt-4o-mini")).strip()

    if not file_id:
        return jsonify({
            "success": False,
            "detail": "File ID is required.",
        }), 400

    file_info = db_files.get(file_id)

    if not file_info:
        return jsonify({
            "success": False,
            "detail": "File ID not found.",
        }), 404

    if not query_string:
        return jsonify({
            "success": False,
            "detail": "Query string is required.",
        }), 400

    if len(query_string) > 2000:
        return jsonify({
            "success": False,
            "detail": "Query is too long. Maximum length is 2000 characters.",
        }), 400

    file_path = file_info.get("path")

    if not file_path or not os.path.exists(file_path):
        db_files.pop(file_id, None)

        return jsonify({
            "success": False,
            "detail": "The selected CSV file no longer exists.",
        }), 404

    try:
        # Keep this call compatible with your current analyzer.py.
        # The model value can be added to query_analyst later if supported.
        result = query_analyst(
            query_str=query_string,
            file_path=file_path,
            custom_api_key=custom_api_key,
        )

        if not isinstance(result, dict):
            raise ValueError("Analyzer returned an invalid response.")

        return jsonify({
            "success": True,
            "file_id": file_id,
            "query": query_string,
            "model": model,
            **result,
        }), 200

    except ValueError as error:
        return jsonify({
            "success": False,
            "detail": str(error),
        }), 400

    except Exception as error:
        app.logger.exception("AI analysis failed")

        return jsonify({
            "success": False,
            "detail": f"Analysis failed: {str(error)}",
        }), 500


# ──────────────────────────────────────────────────────────────────────────────
# Delete file
# ──────────────────────────────────────────────────────────────────────────────

@app.delete("/api/files/<string:file_id>")
def delete_file(file_id: str):
    """
    Delete an uploaded file from disk and the in-memory registry.
    """

    file_info = db_files.get(file_id)

    if not file_info:
        return jsonify({
            "success": False,
            "detail": "File ID not found.",
        }), 404

    try:
        delete_saved_file(file_info.get("path", ""))
        db_files.pop(file_id, None)

        return jsonify({
            "success": True,
            "message": "File deleted successfully.",
            "file_id": file_id,
        }), 200

    except Exception as error:
        app.logger.exception("Failed to delete file")

        return jsonify({
            "success": False,
            "detail": f"Failed to delete file: {str(error)}",
        }), 500


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    debug_mode = os.getenv("FLASK_DEBUG", "true").lower() == "true"

    app.run(
        host="0.0.0.0",
        port=port,
        debug=debug_mode,
    )