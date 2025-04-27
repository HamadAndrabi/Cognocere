from typing import Dict, List, Any, Optional
import json

from models.schemas import SearchPlan
from services.llm_service import get_structured_llm_response
from services.serper_service import search_web

# System message for search plan generation
PLAN_SYSTEM_MESSAGE = """
You are an expert research strategist tasked with creating an optimal plan for web research.
Your goal is to generate specific search queries that will yield comprehensive and relevant information.
Each query should target a different aspect of the topic to ensure thorough coverage.
"""

async def generate_search_plan(
    topic: str, 
    clarification_answers: Dict[str, str], 
    clarification_questions=None,
    model_id: Optional[str] = None) -> SearchPlan:
    """
    Generate a search plan based on the research topic and clarification answers.
    
    Args:
        topic: The research topic
        clarification_answers: The answers to clarification questions
        clarification_questions: Optional dictionary containing the clarification questions
        model_id: Optional ID of the LLM model to use
        
    Returns:
        A SearchPlan object with specific search queries
    """
    # First, do a light search to gather initial context
    try:
        initial_results = await search_web(topic, num_results=3)
        snippets = [result.get("snippet", "") for result in initial_results]
        initial_context = "\n\n".join(snippets)
    except Exception as e:
        print(f"Warning: initial search failed: {e}")
        initial_context = ""
    
    # Extract snippets from initial results
    
    # Format clarification answers for the prompt
    formatted_answers = []
    
    for q_id, answer in clarification_answers.get("answers", {}).items():
        # Try to get the actual question text if clarification_questions is provided
        question_text = q_id
        if clarification_questions and "questions" in clarification_questions:
            for q in clarification_questions["questions"]:
                if q.get("id") == q_id:
                    question_text = q.get("question", q_id)
                    break
        
        formatted_answers.append(f"Question: {question_text}\nAnswer: {answer}")
    
    formatted_answers_text = "\n".join(formatted_answers)
    
    prompt = f"""
    I need to create a comprehensive research plan for the following topic:
    
    Topic: "{topic}"
    
    The user has provided the following clarifications:
    {formatted_answers_text}
    
    Initial search results provided these snippets:
    {initial_context}
    
    Based on this information, generate 10-15 specific search queries that will cover different aspects of the topic.
    Each query should be focused and specific to yield high-quality results.
    Try to cover the breadth of the topic while also diving deep into important areas.
    """
    
    # Define the expected output schema
    output_schema = {
        "queries": ["string"]
    }
    
    # Get structured response from LLM
    response = await get_structured_llm_response(
        prompt=prompt,
        output_schema=output_schema,
        system_message=PLAN_SYSTEM_MESSAGE,
        model_id=model_id,
        module_name="plan_generation"
    )
    
    return SearchPlan(
        queries=response.get("queries", []),
        depth=1
    )