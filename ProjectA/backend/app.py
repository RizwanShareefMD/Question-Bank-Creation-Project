import os
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv

# Document Processing
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
import tempfile

load_dotenv()

app = FastAPI(title="Question Bank Creator API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Question(BaseModel):
    question: str
    options: List[str]
    correct_answer: str
    explanation: Optional[str] = None

class QuestionBank(BaseModel):
    questions: List[Question]

def extract_text_from_file(file_path: str, file_type: str):
    if file_type == "application/pdf":
        loader = PyPDFLoader(file_path)
    elif file_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        loader = Docx2txtLoader(file_path)
    else:
        raise ValueError("Unsupported file type")
    
    docs = loader.load()
    return " ".join([doc.page_content for doc in docs])

def generate_questions_llm(text: str, num_questions: int = 5, difficulty: str = "medium"):
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", google_api_key=os.getenv("GOOGLE_API_KEY"))
    
    prompt_template = """
    You are an expert educator. Based on the following text, create {num_questions} multiple-choice questions.
    The difficulty level should be {difficulty}.
    
    Text: {text}
    
    Format the output as a JSON object with a key "questions" which is a list of objects.
    Each object should have:
    - "question": The question text
    - "options": A list of 4 strings
    - "correct_answer": The exact string from the options that is correct
    - "explanation": A brief explanation of why it is correct
    
    Ensure the output is ONLY valid JSON.
    """
    
    prompt = PromptTemplate(template=prompt_template, input_variables=["text", "num_questions", "difficulty"])
    chain = LLMChain(llm=llm, prompt=prompt)
    
    # Split text if it's too long
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=10000, chunk_overlap=500)
    chunks = text_splitter.split_text(text)
    
    # Using the first chunk for now for simplicity, or we could summarize/combine
    response = chain.run(text=chunks[0], num_questions=num_questions, difficulty=difficulty)
    return response

@app.get("/")
async def root():
    return {"message": "Question Bank Creator API is running"}

@app.post("/upload-and-generate")
async def upload_and_generate(
    file: UploadFile = File(...),
    num_questions: int = Form(5),
    difficulty: str = Form("medium")
):
    try:
        # Create a temporary file to store the upload
        suffix = os.path.splitext(file.filename)[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            tmp_path = tmp.name

        # Extract text
        text = extract_text_from_file(tmp_path, file.content_type)
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from file")

        # Generate questions
        questions_json = generate_questions_llm(text, num_questions, difficulty)
        
        # In a real app, you'd want to parse the JSON string back to a Python object
        # for validation, but for now we'll return the raw response or parsed result
        import json
        import re
        
        # Clean the response if it contains markdown code blocks
        clean_json = re.sub(r'```json\n|\n```', '', questions_json)
        parsed_questions = json.loads(clean_json)
        
        return parsed_questions

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
