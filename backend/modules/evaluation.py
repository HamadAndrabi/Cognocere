from typing import Dict, List, Any
import json

from models.schemas import CuratedContext, EvaluationResult
from services.llm_service import get_structured_llm_response

# System message for evaluation
EVALUATION_SYSTEM_MESSAGE = """
You are an expert research evaluator tasked with assessing the completeness and quality of research.
Your goal is to identify any gaps, missing information, or aspects that need further investigation.
Be reasonable in your evaluation - if the research covers the main aspects of the topic, consider it sufficient.
Only request more research if critical information is missing.
"""

async def evaluate_context(
    curated_context: CuratedContext, 
    topic: str, 
    clarification_answers: Dict[str, str],
    iteration: int = 1
) -> EvaluationResult:
    """
    Evaluate the curated context for completeness and quality.
    
    Args:
        curated_context: The curated research context
        topic: The original research topic
        clarification_answers: The answers to clarification questions
        iteration: Current iteration number (to limit cycles)
        
    Returns:
        An EvaluationResult with assessment and recommendations
    """
    # Format clarification answers for the prompt
    formatted_answers = "\n".join([
        f"Question: {q_id}\nAnswer: {answer}" 
        for q_id, answer in clarification_answers.get("answers", {}).items()
    ])
    
    # After 2 iterations, we should be more lenient
    leniency_modifier = ""
    if iteration >= 2:
        leniency_modifier = """
        NOTE: This is at least the second research iteration. Be more lenient in your evaluation.
        Unless absolutely critical information is completely missing, consider the research sufficient.
        """
    
    # After 3 iterations, we should almost always proceed to report generation
    if iteration >= 3:
        leniency_modifier = """
        NOTE: This is at least the third research iteration. Be extremely lenient in your evaluation.
        Unless the research is completely inadequate, consider it sufficient to proceed.
        """
        
    # If we've gone through 4 iterations, force it to be sufficient
    if iteration >= 4:
        return EvaluationResult(
            is_sufficient=True,
            missing_aspects=["Evaluation completed after maximum iterations"],
            additional_queries=[],
            confidence_score=0.75
        )
        
    # Create evaluation prompt
    prompt = f"""
    I need to evaluate the completeness and quality of research on the following topic:
    
    Topic: "{topic}"
    
    User clarifications:
    {formatted_answers}
    
    The current research content includes:
    {curated_context.content[:3000]}...  # Send a sample of the content
    
    {leniency_modifier}
    
    Please evaluate this research content and determine:
    1. Is the information sufficient to create a comprehensive report on the topic? (Be practical - if we have good coverage of the main aspects, consider it sufficient)
    2. What aspects or information are missing or need more depth?
    3. What additional search queries would help fill these gaps?
    4. On a scale of 0 to 1, what is your confidence that we have sufficient information?
    
    Be practical in your evaluation. It's better to proceed with a good amount of information than to keep searching indefinitely.
    """
    
    try:
        # Define the expected output schema
        output_schema = {
            "is_sufficient": "boolean",
            "missing_aspects": ["string"],
            "additional_queries": ["string"],
            "confidence_score": "number"
        }
        
        # Get structured response from LLM
        response = await get_structured_llm_response(
            prompt=prompt,
            output_schema=output_schema,
            system_message=EVALUATION_SYSTEM_MESSAGE
        )
        
        # Override the result if we've gone through enough iterations
        if iteration >= 3 and not response.get("is_sufficient", False):
            print(f"Forcing research to be sufficient after {iteration} iterations")
            return EvaluationResult(
                is_sufficient=True,
                missing_aspects=response.get("missing_aspects", ["Evaluation completed after maximum iterations"]),
                additional_queries=[],
                confidence_score=0.75
            )
            
        return EvaluationResult(
            is_sufficient=response.get("is_sufficient", False),
            missing_aspects=response.get("missing_aspects", []),
            additional_queries=response.get("additional_queries", []),
            confidence_score=response.get("confidence_score", 0.0)
        )
    except Exception as e:
        print(f"Error in evaluation: {str(e)}")
        # Return a default "sufficient" result if there's an error
        return EvaluationResult(
            is_sufficient=True,
            missing_aspects=["Error occurred during evaluation"],
            additional_queries=[],
            confidence_score=0.5
        )