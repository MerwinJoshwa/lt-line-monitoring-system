from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import asyncio
import subprocess
import tempfile
import os
import re
import sys
from typing import Optional
import openai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Python IDE Backend", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
openai_client = None
try:
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and api_key != "your_openai_api_key_here":
        openai_client = openai.OpenAI(api_key=api_key)
except Exception as e:
    print(f"OpenAI client initialization failed: {e}")
    print("AI explanation feature will be disabled")

class CodeExecutionRequest(BaseModel):
    code: str

class CodeExplanationRequest(BaseModel):
    code: str

class ExecutionResponse(BaseModel):
    output: str
    error: Optional[str] = None
    execution_time: Optional[float] = None

class ExplanationResponse(BaseModel):
    explanation: str
    error: Optional[str] = None

def translate_error_message(error_msg: str) -> str:
    """
    Translate Python error messages into beginner-friendly language
    """
    translations = {
        r"SyntaxError: invalid syntax": "Syntax Error: There's a mistake in your code structure. Check for missing colons (:), parentheses, or quotes.",
        r"IndentationError: expected an indented block": "Indentation Error: Python needs proper spacing. After lines ending with ':', the next line should be indented (4 spaces).",
        r"IndentationError: unindent does not match any outer indentation level": "Indentation Error: Your spacing doesn't match. Make sure all lines at the same level have the same indentation.",
        r"NameError: name '(.+?)' is not defined": r"Variable Error: The variable '\1' hasn't been created yet. Make sure you define it before using it.",
        r"TypeError: unsupported operand type\(s\) for (.+?): '(.+?)' and '(.+?)'": r"Type Error: You can't use '\1' with \2 and \3. Make sure both values are compatible types.",
        r"ZeroDivisionError": "Division Error: You're trying to divide by zero, which isn't allowed in math!",
        r"IndexError: list index out of range": "List Error: You're trying to access an item that doesn't exist in the list. Check the list length.",
        r"KeyError: '(.+?)'": r"Dictionary Error: The key '\1' doesn't exist in the dictionary. Check your spelling or add the key first.",
        r"ValueError: (.+)": r"Value Error: \1. Make sure you're using the right type of value.",
        r"AttributeError: '(.+?)' object has no attribute '(.+?)'": r"Attribute Error: \1 doesn't have a '\2' method or property. Check the documentation for available methods.",
    }
    
    friendly_error = error_msg
    for pattern, replacement in translations.items():
        friendly_error = re.sub(pattern, replacement, friendly_error, flags=re.IGNORECASE)
    
    # Add helpful suggestions
    if "SyntaxError" in error_msg:
        friendly_error += "\n💡 Tip: Check for missing parentheses, quotes, or colons."
    elif "IndentationError" in error_msg:
        friendly_error += "\n💡 Tip: Use 4 spaces for indentation after colons (:)."
    elif "NameError" in error_msg:
        friendly_error += "\n💡 Tip: Make sure you've defined the variable before using it."
    
    return friendly_error

async def execute_python_code_safely(code: str) -> ExecutionResponse:
    """
    Execute Python code safely in a subprocess with timeout
    """
    try:
        # Create a temporary file with the code
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as tmp_file:
            tmp_file.write(code)
            tmp_file_path = tmp_file.name
        
        try:
            # Execute the code with a timeout
            process = await asyncio.create_subprocess_exec(
                sys.executable, tmp_file_path,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=tempfile.gettempdir()
            )
            
            # Wait for completion with timeout
            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=10.0)
            except asyncio.TimeoutError:
                process.kill()
                return ExecutionResponse(
                    output="",
                    error="Execution timed out after 10 seconds. Your code might have an infinite loop."
                )
            
            output = stdout.decode('utf-8', errors='replace').strip()
            error = stderr.decode('utf-8', errors='replace').strip()
            
            if error:
                friendly_error = translate_error_message(error)
                return ExecutionResponse(output=output, error=friendly_error)
            
            return ExecutionResponse(output=output or "Code executed successfully (no output)")
            
        finally:
            # Clean up temporary file
            try:
                os.unlink(tmp_file_path)
            except:
                pass
                
    except Exception as e:
        return ExecutionResponse(
            output="", 
            error=f"Internal error: {str(e)}"
        )

async def explain_code_with_ai(code: str) -> ExplanationResponse:
    """
    Use OpenAI to explain the code in beginner-friendly terms
    """
    if not openai_client:
        return ExplanationResponse(
            explanation="",
            error="AI explanation not available. OpenAI API key not configured."
        )
    
    try:
        prompt = f"""
You are a Python programming tutor helping beginners understand code. 
Explain the following Python code in simple, clear terms that a beginner can understand.

Code to explain:
```python
{code}
```

Please provide:
1. What this code does (in simple terms)
2. How it works (step by step)
3. What each important part means
4. Any programming concepts it demonstrates

Keep your explanation friendly, clear, and educational. Use simple language and avoid jargon when possible.
"""

        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful Python programming tutor for beginners."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.7
            )
        )
        
        explanation = response.choices[0].message.content
        return ExplanationResponse(explanation=explanation)
        
    except Exception as e:
        return ExplanationResponse(
            explanation="",
            error=f"AI explanation failed: {str(e)}"
        )

@app.get("/")
async def root():
    return {"message": "Python IDE Backend API", "status": "running"}

@app.post("/api/execute", response_model=ExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    """
    Execute Python code safely and return output or error
    """
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="No code provided")
    
    result = await execute_python_code_safely(request.code)
    return result

@app.post("/api/explain", response_model=ExplanationResponse)
async def explain_code(request: CodeExplanationRequest):
    """
    Explain Python code using AI
    """
    if not request.code.strip():
        raise HTTPException(status_code=400, detail="No code provided")
    
    result = await explain_code_with_ai(request.code)
    return result

@app.get("/api/health")
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "ai_available": openai_client is not None,
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Python IDE Backend Server...")
    print(f"🤖 OpenAI API available: {openai_client is not None}")
    print("📡 Server will be available at: http://localhost:8000")
    print("🔗 API docs available at: http://localhost:8000/docs")
    print("⏹️  Press Ctrl+C to stop the server")
    uvicorn.run(app, host="0.0.0.0", port=8000)
