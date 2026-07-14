import ast
import builtins
import json
import os
import traceback
import pandas as pd
from typing import Dict, Any, Optional
from openai import OpenAI

class PandasSafeVisitor(ast.NodeVisitor):
    """
    AST visitor to check that code only executes safe Pandas/Python operations.
    It blocks:
    - Imports (import os, etc.)
    - Private/protected attribute access (starting with _)
    - Functions/methods not in the whitelist
    - Writing/modifying files or accessing system globals
    """
    def __init__(self):
        # Allow safe AST node classes for basic expressions, comparisons, and subscripts
        self.allowed_nodes = {
            ast.Module,
            ast.Expr,
            ast.Assign,
            ast.Name,
            ast.Load,
            ast.Store,
            ast.Del,
            ast.Attribute,
            ast.Call,
            ast.Constant,
            ast.Subscript,
            ast.Slice,
            ast.BinOp,
            ast.UnaryOp,
            ast.Compare,
            ast.List,
            ast.Tuple,
            ast.Dict,
            ast.Set,
            ast.BoolOp,
            ast.keyword,
            # Operators
            ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Pow, ast.FloorDiv,
            ast.And, ast.Or, ast.Not,
            ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE,
            ast.Is, ast.IsNot, ast.In, ast.NotIn,
            ast.USub, ast.UAdd,
        }
        
        # Check for AST classes that exist in older Python versions
        if hasattr(ast, 'Index'):
            self.allowed_nodes.add(ast.Index)
        if hasattr(ast, 'ExtSlice'):
            self.allowed_nodes.add(ast.ExtSlice)
        if hasattr(ast, 'NameConstant'):
            self.allowed_nodes.add(ast.NameConstant)
        if hasattr(ast, 'Num'):
            self.allowed_nodes.add(ast.Num)
        if hasattr(ast, 'Str'):
            self.allowed_nodes.add(ast.Str)
        if hasattr(ast, 'Bytes'):
            self.allowed_nodes.add(ast.Bytes)
        if hasattr(ast, 'Ellipsis'):
            self.allowed_nodes.add(ast.Ellipsis)

        # Allowed built-in functions
        self.allowed_builtins = {
            'len', 'int', 'float', 'str', 'list', 'dict', 'set', 'tuple', 'round', 
            'sum', 'min', 'max', 'abs', 'bool', 'sorted', 'enumerate', 'zip', 'range'
        }

    def visit(self, node):
        node_type = type(node)
        if node_type not in self.allowed_nodes:
            raise ValueError(f"Security Block: Expression type '{node_type.__name__}' is prohibited.")
        
        # Prevent accessing attributes starting with '_' (e.g. __globals__, __class__)
        if isinstance(node, ast.Attribute):
            if node.attr.startswith('_'):
                raise ValueError(f"Security Block: Access to private or protected attribute '{node.attr}' is prohibited.")
                
        # Prevent referencing private/protected variable names or dangerous builtins
        if isinstance(node, ast.Name):
            if node.id.startswith('_'):
                raise ValueError(f"Security Block: Private variable name '{node.id}' is prohibited.")
            # Block builtins that are not explicitly allowed
            _builtins_dict = vars(builtins)
            if node.id in _builtins_dict:
                if node.id not in self.allowed_builtins:
                    raise ValueError(f"Security Block: Access to python builtin '{node.id}' is prohibited.")

        # Prevent calling unsafe functions
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                func_name = node.func.id
                if func_name not in self.allowed_builtins and func_name != 'pd':
                    raise ValueError(f"Security Block: Function call '{func_name}' is prohibited.")
            elif isinstance(node.func, ast.Attribute):
                # The attribute check will handle blocking '_' properties.
                pass
            else:
                raise ValueError("Security Block: Dynamic or complex function calls are prohibited.")

        self.generic_visit(node)


def analyze_csv_metadata(file_path: str) -> Dict[str, Any]:
    """
    Reads the CSV and extracts structural information and statistical summary.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    df = pd.read_csv(file_path)
    
    # Calculate shape
    rows, cols = df.shape
    
    # Analyze columns
    columns_info = []
    for col in df.columns:
        null_count = int(df[col].isnull().sum())
        unique_count = int(df[col].nunique())
        dtype = str(df[col].dtype)
        
        # Sample values
        non_null_samples = df[col].dropna().head(3).tolist()
        sample_str = ", ".join([str(x) for x in non_null_samples])
        
        columns_info.append({
            "name": col,
            "type": dtype,
            "nulls": null_count,
            "uniques": unique_count,
            "samples": sample_str
        })
        
    # Get general summary statistics
    # Convert numerical summary to dictionary
    try:
        summary_df = df.describe(include='all').fillna('')
        summary_stats = summary_df.to_dict()
    except Exception:
        summary_stats = {}
        
    # Preview data: convert top 10 rows to dict
    preview_rows = df.head(10).replace({pd.NA: None, float('nan'): None}).to_dict(orient="records")
    
    return {
        "rows": rows,
        "columns_count": cols,
        "columns": columns_info,
        "summary": summary_stats,
        "preview": preview_rows
    }


def safe_execute_pandas(code_str: str, df: pd.DataFrame) -> pd.DataFrame:
    """
    Parses, validates, and runs code on the DataFrame `df`.
    Returns the resulting pandas DataFrame.
    """
    # 1. Parse into AST and run the security visitor
    try:
        tree = ast.parse(code_str)
    except SyntaxError as se:
        raise ValueError(f"Syntax Error in generated code: {se.msg} on line {se.lineno}")
        
    visitor = PandasSafeVisitor()
    visitor.visit(tree)
    
    # 2. Setup a highly restricted local scope
    # Include pandas as 'pd', the input DataFrame as 'df'
    _builtins_dict = vars(builtins)
    safe_builtins_dict = {
        k: _builtins_dict[k] for k in [
            'len', 'int', 'float', 'str', 'list', 'dict', 'set', 'tuple', 'round',
            'sum', 'min', 'max', 'abs', 'bool', 'sorted', 'enumerate', 'zip', 'range'
        ] if k in _builtins_dict
    }
    
    local_scope = {
        'df': df,
        'pd': pd,
        'result_df': None
    }
    
    global_scope = {
        '__builtins__': safe_builtins_dict
    }
    
    # 3. Execute the code
    try:
        exec(code_str, global_scope, local_scope)
    except Exception as e:
        tb = traceback.format_exc()
        raise RuntimeError(f"Runtime error during Pandas execution:\n{e}\nFull traceback:\n{tb}")
        
    # 4. Extract and validate result_df
    result = local_scope.get('result_df')
    if result is None:
        raise ValueError("Execution Error: The code did not define a 'result_df' variable.")
        
    if not isinstance(result, pd.DataFrame):
        # Attempt conversion if it's a Series or dict
        if isinstance(result, pd.Series):
            result = result.reset_index()
        elif isinstance(result, (dict, list)):
            try:
                result = pd.DataFrame(result)
            except Exception:
                raise ValueError(f"Execution Error: 'result_df' must be a pandas DataFrame (got {type(result).__name__}).")
        else:
            raise ValueError(f"Execution Error: 'result_df' must be a pandas DataFrame (got {type(result).__name__}).")
            
    # Clean NaN/Inf values for secure JSON serialization
    result = result.replace({pd.NA: None, float('nan'): None, float('inf'): None, float('-inf'): None})
    return result


def query_analyst(query_str: str, file_path: str, custom_api_key: Optional[str] = None) -> Dict[str, Any]:
    """
    Sends the user query along with DataFrame metadata to OpenAI,
    receives python analysis instructions, executes safely, and returns the combined response.
    """
    # 1. Load DataFrame
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"CSV file not found.")
        
    df = pd.read_csv(file_path)
    
    # 2. Extract metadata details to feed to LLM
    shape = df.shape
    columns_dtypes = df.dtypes.to_string()
    
    # Build describe stats string
    try:
        describe_stats = df.describe(include='all').to_string()
    except Exception:
        describe_stats = "N/A"
        
    preview_data = df.head(3).to_string()
    
    # 3. Select API Key: custom key from front-end or system env
    api_key = custom_api_key or os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OpenAI API Key is missing. Please configure it in Settings or define it on the server.")
        
    # Initialize client
    client = OpenAI(api_key=api_key)
    
    system_prompt = f"""You are a Senior AI Data Analyst. Your job is to analyze a pandas DataFrame named `df` and write safe Python code to answer the user's question, along with a textual explanation and a recommended chart.

We have a DataFrame `df` loaded in memory with the following details:
- Shape: {shape[0]} rows, {shape[1]} columns
- Columns and Data Types:
{columns_dtypes}
- Basic Summary Statistics:
{describe_stats}
- Preview (first 3 rows):
{preview_data}

CRITICAL INSTRUCTIONS:
1. You MUST write python code that manipulates the DataFrame `df` and stores the final result in a variable named `result_df`.
2. `result_df` MUST be a pandas DataFrame. 
   - If your result is a single number (e.g. total revenue), wrap it in a DataFrame:
     `result_df = pd.DataFrame([{"Total Revenue": total_rev}])`
   - If your result is a series, use `.reset_index()`:
     `result_df = df.groupby('category')['sales'].sum().reset_index()`
3. Write clean, direct python code. DO NOT import any modules (e.g. no `import os`, no `import datetime`, no `import pandas`). Only use pandas methods on the existing variables and allowed builtins.
4. Keep the code string raw: DO NOT use markdown code blocks (e.g. ```python) inside the JSON response.
5. In your text explanation, describe the insights clearly in Markdown format. Do not mention variable names like `result_df` or Python syntax. Speak to the user directly as a business analyst.
6. Provide a chart recommendation based on the structure of `result_df`. Supported chart types: "bar", "line", "area", "pie", "scatter", or "none" (if not graphable). Identify the `x_key` (typically category, dimension or dates) and `y_keys` (list of numerical value columns in the result_df).

You MUST respond strictly with a single JSON object matching this schema:
{{
  "explanation": "Markdown text describing the insights from the analysis.",
  "code": "result_df = ...",
  "chart_suggestion": {{
    "type": "bar" | "line" | "area" | "pie" | "scatter" | "none",
    "x_key": "column_name_for_x_axis",
    "y_keys": ["column_name_for_y_axis"],
    "title": "Suggested Chart Title"
  }}
}}
"""

    # 4. Query the OpenAI Chat Completion endpoint
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"User question: {query_str}"}
            ],
            temperature=0.1
        )
    except Exception as api_err:
        raise RuntimeError(f"OpenAI API Completion failed: {api_err}")
        
    response_content = response.choices[0].message.content.strip()
    
    # 5. Parse the JSON response
    try:
        data = json.loads(response_content)
    except json.JSONDecodeError:
        # Fallback in case there is markdown wrapper
        if response_content.startswith("```json"):
            cleaned = response_content.replace("```json", "", 1).rstrip("```").strip()
            data = json.loads(cleaned)
        elif response_content.startswith("```"):
            cleaned = response_content.replace("```", "", 1).rstrip("```").strip()
            data = json.loads(cleaned)
        else:
            raise ValueError(f"Failed to parse AI output as JSON: {response_content}")
            
    code_to_run = data.get("code", "")
    explanation = data.get("explanation", "")
    chart_suggestion = data.get("chart_suggestion", {})
    
    # 6. Execute the code safely
    result_df = safe_execute_pandas(code_to_run, df)
    
    # Convert result_df to json records
    records = result_df.to_dict(orient="records")
    columns_list = result_df.columns.tolist()
    
    return {
        "explanation": explanation,
        "code": code_to_run,
        "chart_suggestion": chart_suggestion,
        "data": records,
        "columns": columns_list
    }
