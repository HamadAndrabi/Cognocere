from typing import Dict, Any
import json
import uuid

from models.schemas import ClarificationQuestions, ClarificationQuestion
from services.llm_service import get_structured_llm_response

# System message for clarification question generation
CLARIFICATION_SYSTEM_MESSAGE = """
You are an expert research assistant tasked with clarifying research topics. 
Your goal is to ask precise questions that will help narrow down and better understand the research needs.
Generate 4-5 essential questions that would significantly improve the research process.
"""

async def generate_clarification_questions(topic: str) -> ClarificationQuestions:
    """
    Generate clarification questions for a given research topic.
    
    Args:
        topic: The research topic provided by the user
        
    Returns:
        A ClarificationQuestions object with 4-5 questions
    """
    prompt = f"""
    The user wants me to research the following topic: "{topic}"
    
    Before I start the research, I need to clarify certain aspects of this topic to ensure I provide the most relevant information.
    
    Generate 4-5 essential clarification questions that will help me understand exactly what the user is looking for.
    Each question should address a different aspect of the topic and help narrow down the scope of research.
    """
    
    # Define the expected output schema
    output_schema = {
        "questions": [
            {
                "id": "string",
                "question": "string"
            }
        ]
    }
    
    # Get structured response from LLM
    response = await get_structured_llm_response(
        prompt=prompt,
        output_schema=output_schema,
        system_message=CLARIFICATION_SYSTEM_MESSAGE
    )
    
    # Ensure each question has a unique ID
    questions = []
    for i, q in enumerate(response.get("questions", [])):
        if "id" not in q or not q["id"]:
            q["id"] = str(uuid.uuid4())
        questions.append(ClarificationQuestion(**q))
    
    return ClarificationQuestions(questions=questions)