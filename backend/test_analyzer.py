import pandas as pd
from backend.analyzer import safe_execute_pandas

# Define a sample DataFrame
data = {
    'Product': ['A', 'B', 'A', 'B'],
    'Sales': [100, 150, 200, 250],
    'Region': ['North', 'East', 'North', 'East']
}
df = pd.DataFrame(data)

print("Starting backend AST sandbox security tests...\n")

# Test 1: Safe Pandas Code Execution
safe_code = """
result_df = df.groupby('Product')['Sales'].sum().reset_index()
"""
try:
    res = safe_execute_pandas(safe_code, df)
    print("Test 1 (Safe Code) PASSED!")
    print("Result DataFrame:")
    print(res)
    print("-" * 50)
except Exception as e:
    print(f"Test 1 FAILED unexpectedly: {e}")

# Test 2: Blocking imports
blocked_import_code = """
import os
result_df = df.copy()
"""
try:
    safe_execute_pandas(blocked_import_code, df)
    print("Test 2 (Imports Block) FAILED! (Code executed when it should be blocked)")
except ValueError as ve:
    print(f"Test 2 (Imports Block) PASSED: Successfully blocked code with message: '{ve}'")
    print("-" * 50)

# Test 3: Blocking private/protected attribute access
blocked_underscore_code = """
result_df = df.copy()
result_df.__class__
"""
try:
    safe_execute_pandas(blocked_underscore_code, df)
    print("Test 3 (Private Attribute Block) FAILED! (Code executed when it should be blocked)")
except ValueError as ve:
    print(f"Test 3 (Private Attribute Block) PASSED: Successfully blocked code with message: '{ve}'")
    print("-" * 50)

# Test 4: Blocking dangerous builtins (like open)
blocked_open_code = """
f = open('malicious.txt', 'w')
result_df = df.copy()
"""
try:
    safe_execute_pandas(blocked_open_code, df)
    print("Test 4 (Dangerous Builtins Block) FAILED! (Code executed when it should be blocked)")
except ValueError as ve:
    print(f"Test 4 (Dangerous Builtins Block) PASSED: Successfully blocked code with message: '{ve}'")
    print("-" * 50)

# Test 5: Missing result_df variable
missing_result_code = """
temp = df.copy()
"""
try:
    safe_execute_pandas(missing_result_code, df)
    print("Test 5 (Missing result_df Block) FAILED! (Code executed when it should fail)")
except ValueError as ve:
    print(f"Test 5 (Missing result_df Block) PASSED: Caught error correctly: '{ve}'")
    print("-" * 50)

print("\nAll sandbox safety tests completed.")
