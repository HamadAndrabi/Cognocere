from typing import Dict, List, Any, Optional
import json
import time
import logging

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

# Get a logger instance
logger = logging.getLogger(__name__)

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
    # Handle different formats for clarification_answers
    if isinstance(clarification_answers, dict) and "answers" in clarification_answers:
        answers_dict = clarification_answers.get("answers", {})
        for q_id, answer in answers_dict.items():
            question_text = q_id
            if clarification_questions and "questions" in clarification_questions:
                for q in clarification_questions["questions"]:
                    if q.get("id") == q_id:
                        question_text = q.get("question", q_id)
                        break
            formatted_answers.append(f"Question: {question_text}\nAnswer: {answer}")
    else:
        # Log warning about unexpected format
        logger.warning(f"Unexpected format for clarification_answers: {type(clarification_answers)}, content: {clarification_answers}")
    
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

    # --- BEGIN: Gemini/Groq response normalization ---
    if isinstance(response, list):
        logger.warning(f"LLM returned a list, wrapping as sections. Response: {response}")
        response = {
            "title": f"Research Report on {topic}",
            "introduction": "This report was generated based on the provided research context.",
            "sections": response,
            "conclusion": "This concludes the research report.",
            "references": []
        }
    elif not isinstance(response, dict):
        logger.error(f"Invalid response format from LLM: {type(response)}, content: {response}")
        response = {
            "title": f"Research Report on {topic}",
            "introduction": "There was an issue generating the report content.",
            "sections": [],
            "conclusion": "Please try again or contact support if the issue persists.",
            "references": []
        }
    # --- END: Gemini/Groq response normalization ---

    # Ensure response is a dictionary - different LLM providers might return different formats
    if not isinstance(response, dict):
        logger.error(f"Invalid response format from LLM: {type(response)}, content: {response}")
        # Create a minimal valid response to prevent errors
        response = {
            "title": f"Research Report on {topic}",
            "introduction": "There was an issue generating the report content.",
            "sections": [],
            "conclusion": "Please try again or contact support if the issue persists.",
            "references": []
        }

    # Assemble the full markdown content
    markdown_parts = []
    valid_sections_for_model = [] # Store valid sections for FinalReport model

    if response.get("title"):
        markdown_parts.append(f"# {response['title']}\n")
    else:
        # Provide a default title if missing
        default_title = f"Research Report on {topic}"
        markdown_parts.append(f"# {default_title}\n")
        response["title"] = default_title

    if response.get("introduction"):
        markdown_parts.append(f"## Introduction\n\n{response['introduction']}\n")
    else:
        # Provide a default introduction if missing
        default_intro = "This report provides an overview of the requested topic based on available research."
        markdown_parts.append(f"## Introduction\n\n{default_intro}\n")
        response["introduction"] = default_intro

    sections = response.get("sections", [])
    if isinstance(sections, list): # Ensure sections is actually a list
        markdown_parts.append("## Sections\n")
        for i, section in enumerate(sections):
            if isinstance(section, dict): # Check if the section is a dictionary
                if section.get("title"):
                    markdown_parts.append(f"### {section['title']}\n")
                if section.get("content"):
                    markdown_parts.append(f"{section['content']}\n")
                # TODO: Optionally add references here if needed
                markdown_parts.append("\n") # Add space between sections
                valid_sections_for_model.append(section) # Add valid section for model creation
            else:
                # Log a warning if a section item is not a dictionary
                logger.warning(f"Skipping invalid section at index {i} in LLM response. Expected dict, got {type(section)}. Content: {section}")
    else:
         logger.warning(f"LLM response for 'sections' was not a list. Type: {type(sections)}. Content: {sections}")

    if response.get("conclusion"):
        markdown_parts.append(f"## Conclusion\n\n{response['conclusion']}\n")

    # TODO: Optionally add a formatted References section

    full_markdown_content = "\n".join(markdown_parts).strip()

    # Safely get references with proper type handling
    references = response.get("references", [])
    if not isinstance(references, list):
        logger.warning(f"References is not a list: {type(references)}, using empty list instead")
        references = []

    # Attach metadata
    metadata = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "topic": topic,
        "sources_count": len(references)
    }

    # Use only valid sections when creating the FinalReport
    report_sections = []
    for sec_data in valid_sections_for_model:
        try:
            report_sections.append(ReportSection(**sec_data))
        except Exception as e:
            logger.error(f"Error creating ReportSection from data: {sec_data}. Error: {e}")

    return FinalReport(
        title=response.get("title", ""),
        introduction=response.get("introduction", ""),
        sections=report_sections, # Use the validated list
        conclusion=response.get("conclusion", ""),
        references=references,
        metadata=metadata,
        markdown_content=full_markdown_content # Pass the assembled markdown
    )