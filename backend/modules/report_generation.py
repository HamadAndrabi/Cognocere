from typing import Dict, List, Any, Optional
import json
import time

from models.schemas import CuratedContext, FinalReport, ReportSection
from services.llm_service import get_structured_llm_response

# System message for report generation
REPORT_SYSTEM_MESSAGE = """
You are an expert research report writer.
Your task is to create a comprehensive, well-structured JSON report based on research findings.
Include relevant facts, data, and insights while citing sources appropriately.
Maintain a neutral, academic tone.
Organize information logically with clear sections, an introduction, and a conclusion.
**IMPORTANT: Analyze the user's original 'Topic'. If the nature of the topic suggests that illustrative examples (such as code snippets, mathematical formulas, configuration examples, step-by-step instructions, etc.) would significantly enhance clarity and understanding, embed these examples directly within the 'content' of the appropriate sections. Always use proper markdown formatting with explicit language specification:**
- For code snippets: ```language_name (e.g., ```javascript, ```python, ```css)
- For mathematical formulas: Use LaTeX formatting with $$ for block formulas
- For other examples: Use appropriate markdown formatting like lists, tables, or blockquotes

Do not use generic code blocks without language specification. The language you specify will determine the syntax highlighting in the rendered report.
"""

async def generate_report(
    curated_context: CuratedContext,
    topic: str,
    clarification_answers: Dict[str, str],
    iteration: int = 1,
    clarification_questions: Dict[str, Any] = None,
    model_id: Optional[str] = None
) -> FinalReport:
    """
    Generate a final research report based on the curated context.
    
    Args:
        curated_context: The curated research context
        topic: The original research topic
        clarification_answers: The answers to clarification questions
        iteration: Current iteration number
        clarification_questions: Optional dictionary containing the clarification questions
        model_id: Optional ID of the LLM model to use
        
    Returns:
        A FinalReport with complete research findings
    """
    # Format clarification answers
    formatted_answers = []
    for q_id, answer in clarification_answers.get("answers", {}).items():
        question_text = q_id
        if clarification_questions and "questions" in clarification_questions:
            for q in clarification_questions["questions"]:
                if q.get("id") == q_id:
                    question_text = q.get("question", q_id)
                    break
        formatted_answers.append(f"Question: {question_text}\nAnswer: {answer}")
    formatted_answers_text = "\n".join(formatted_answers)

    # One-shot end-to-end report generation
    prompt = f"""
    Generate a comprehensive research report as JSON with the following structure:
    {{
      "title": string,
      "introduction": string,
      "sections": [
        {{ "title": string, "content": string, "references": [number] }}
      ],
      "conclusion": string,
      "references": [
        {{ "index": number, "title": string, "url": string }}
      ]
    }}

    Original User Topic: "{topic}"

    User clarifications:
    {formatted_answers_text}

    Curated content:
    {curated_context.content}

    Content structure:
    {json.dumps(curated_context.structure, indent=2)}

    Available sources (use index for references):
    {json.dumps(curated_context.sources, indent=2)}

    **Instruction Reminder:** Based on the 'Original User Topic' and the nature of the subject matter, decide whether to include illustrative examples within the section 'content' fields, as requested in the system message.
    """

    output_schema = {
        "title": "string",
        "introduction": "string",
        "sections": [{
            "title": "string",
            "content": "string",
            "references": ["number"]
        }],
        "conclusion": "string",
        "references": [{
            "index": "number",
            "title": "string",
            "url": "string"
        }]
    }

    response = await get_structured_llm_response(
        prompt=prompt,
        output_schema=output_schema,
        system_message=REPORT_SYSTEM_MESSAGE,
        model_id=model_id,
        module_name="report_generation"
    )

    # Attach metadata
    metadata = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "topic": topic,
        "sources_count": len(response.get("references", []))
    }

    return FinalReport(
        title=response.get("title", ""),
        introduction=response.get("introduction", ""),
        sections=[ReportSection(**sec) for sec in response.get("sections", [])],
        conclusion=response.get("conclusion", ""),
        references=response.get("references", []),
        metadata=metadata
    )