from typing import Dict, List, Any, Optional
import json
import time

from models.schemas import CuratedContext, FinalReport, ReportSection
from services.llm_service import get_structured_llm_response

# System message for report generation
REPORT_SYSTEM_MESSAGE = """
You are an expert research report writer.
Your task is to create a comprehensive, well-structured report based on research findings.
Include relevant facts, data, and insights while citing sources appropriately.
Maintain a neutral, academic tone while ensuring the report is accessible to the target audience.
Organize information logically with clear sections, an introduction, and a conclusion.
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
    
    # Extract structure from curated context
    structure = curated_context.structure
    
    # Generate a title for the report
    title_prompt = f"""
    Create an informative and compelling title for a research report on the following topic:
    
    Topic: "{topic}"
    
    User clarifications:
    {formatted_answers_text}
    
    The title should be concise, descriptive, and engaging.
    """
    
    title_schema = {"title": "string"}
    
    title_response = await get_structured_llm_response(
        prompt=title_prompt,
        output_schema=title_schema,
        system_message="You create effective titles for research reports.",
        model_id=model_id,
        module_name="report_generation"
    )
    
    report_title = title_response.get("title", f"Research Report: {topic}")
    
    # Generate introduction
    intro_prompt = f"""
    Write an introduction for a research report on the following topic:
    
    Title: "{report_title}"
    Topic: "{topic}"
    
    User clarifications:
    {formatted_answers_text}
    
    Clarification questions:
    {json.dumps(clarification_questions, indent=2)}
    
    The introduction should:
    1. Provide background on the topic
    2. Explain the purpose and scope of the research
    3. Preview the main sections of the report
    4. Be approximately 2-3 paragraphs long
    """
    
    intro_schema = {"introduction": "string"}
    
    intro_response = await get_structured_llm_response(
        prompt=intro_prompt,
        output_schema=intro_schema,
        system_message="You write clear, engaging introductions for research reports.",
        model_id=model_id,
        module_name="report_generation"
    )
    
    introduction = intro_response.get("introduction", "")
    
    # Generate sections based on the content structure
    sections = []
    
    for main_topic in structure.get("main_topics", []):
        # Create a section for each main topic
        main_title = main_topic.get("title", "")
        
        section_prompt = f"""
        Write a section for a research report with the following details:
        
        Report Title: "{report_title}"
        Section Title: "{main_title}"
        
        Research Content:
        {curated_context.content}
        
        User clarifications:
        {formatted_answers_text}
        
        Clarification questions:
        {json.dumps(clarification_questions, indent=2)}
        
        Write a comprehensive section that:
        1. Covers the key information related to "{main_title}"
        2. Incorporates relevant facts, data, and insights from the research
        3. References sources by their index number in brackets like [1], [2], etc.
        4. Is well-organized with clear paragraphs
        5. Has a logical flow of information
        
        Available sources to reference (use the index number in brackets):
        {json.dumps([{"index": s["index"], "title": s["title"]} for s in curated_context.sources], indent=2)}
        """
        
        section_schema = {
            "content": "string",
            "references": ["number"]
        }
        
        section_response = await get_structured_llm_response(
            prompt=section_prompt,
            output_schema=section_schema,
            system_message="You write detailed, informative sections for research reports.",
            model_id=model_id,
            module_name="report_generation"
        )
        
        sections.append(ReportSection(
            title=main_title,
            content=section_response.get("content", ""),
            references=section_response.get("references", [])
        ))
    
    # Generate conclusion
    conclusion_prompt = f"""
    Write a conclusion for a research report with the following details:
    
    Report Title: "{report_title}"
    
    The main sections of the report are:
    {", ".join([s.title for s in sections])}
    
    User clarifications:
    {formatted_answers_text}
    
    Clarification questions:
    {json.dumps(clarification_questions, indent=2)}
    
    The conclusion should:
    1. Summarize the key findings from the research
    2. Highlight the most important insights
    3. Discuss implications or applications of the findings
    4. Suggest areas for further research if applicable
    5. Be approximately 2-3 paragraphs long
    """
    
    conclusion_schema = {"conclusion": "string"}
    
    conclusion_response = await get_structured_llm_response(
        prompt=conclusion_prompt,
        output_schema=conclusion_schema,
        system_message="You write effective conclusions for research reports.",
        model_id=model_id,
        module_name="report_generation"
    )
    
    conclusion = conclusion_response.get("conclusion", "")
    
    # Format references
    references = []
    referenced_indices = set()
    
    for section in sections:
        referenced_indices.update(section.references)
    
    for idx in sorted(referenced_indices):
        # Find the corresponding source
        matching_sources = [s for s in curated_context.sources if s["index"] == idx]
        if matching_sources:
            source = matching_sources[0]
            references.append({
                "index": idx,
                "title": source["title"],
                "url": source["url"]
            })
    
    # Create metadata
    metadata = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "topic": topic,
        "sources_count": len(references)
    }
    
    return FinalReport(
        title=report_title,
        introduction=introduction,
        sections=sections,
        conclusion=conclusion,
        references=references,
        metadata=metadata
    )