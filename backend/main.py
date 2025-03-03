from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse
from typing import List, Dict, Any, Optional
import asyncio
import json

from models.schemas import (
    ResearchQuery, 
    ClarificationResponse, 
    ClarificationQuestions, 
    SearchPlan,
    WebSearchResults,
    CuratedContext,
    EvaluationResult,
    FinalReport
)
from modules.clarification import generate_clarification_questions
from modules.plan_generation import generate_search_plan
from modules.web_search import perform_web_search
from modules.context_curation import curate_context
from modules.evaluation import evaluate_context
from modules.report_generation import generate_report
from services.llm_service import stream_llm_response
from config import Settings

# Load settings
settings = Settings()

# Initialize FastAPI app
app = FastAPI(
    title="LLM-Powered Deep Researcher",
    description="An application that performs thorough research on user-provided topics",
    version="1.0.0"
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

    # Store active research sessions
research_sessions = {}

@app.post("/api/research/start")
async def start_research(query: ResearchQuery):
    """Initiate a new research session with the user's query"""
    session_id = str(len(research_sessions) + 1)  # Simple session ID generation
    
    research_sessions[session_id] = {
        "query": query.dict(),
        "status": "clarification_needed",
        "step": "clarification",
        "clarification_questions": None,
        "clarification_answers": None,
        "search_plan": None,
        "search_results": None,
        "curated_context": None,
        "evaluation_result": None,
        "final_report": None,
        "iterations": 0  # Track the number of research iterations
    }
    
    return {"session_id": session_id, "status": "clarification_needed"}

@app.get("/api/research/{session_id}/clarification")
async def get_clarification_questions(session_id: str):
    """Generate and return clarification questions for the research query"""
    if session_id not in research_sessions:
        raise HTTPException(status_code=404, detail="Research session not found")
    
    session = research_sessions[session_id]
    
    if session["clarification_questions"] is None:
        questions = await generate_clarification_questions(session["query"]["topic"])
        
        session["clarification_questions"] = questions.dict()
        session["status"] = "awaiting_clarification"
        research_sessions[session_id] = session
    
    return session["clarification_questions"]

@app.post("/api/research/{session_id}/clarification")
async def submit_clarification_answers(session_id: str, answers: ClarificationResponse):
    """Submit answers to clarification questions and move to plan generation"""
    if session_id not in research_sessions:
        raise HTTPException(status_code=404, detail="Research session not found")
    
    session = research_sessions[session_id]
    session["clarification_answers"] = answers.dict()
    session["status"] = "generating_plan"
    session["step"] = "plan_generation"
    research_sessions[session_id] = session
    
    return {"status": "generating_plan"}

@app.get("/api/research/{session_id}/plan")
async def generate_plan(session_id: str, background_tasks: BackgroundTasks):
    """Generate a search plan based on the clarified query"""
    if session_id not in research_sessions:
        raise HTTPException(status_code=404, detail="Research session not found")
    
    session = research_sessions[session_id]
    
    if session["status"] != "generating_plan":
        raise HTTPException(status_code=400, detail="Cannot generate plan at this stage")
    
    # Start the plan generation process
    background_tasks.add_task(
        process_plan_generation,
        session_id=session_id,
        query=session["query"]["topic"],
        clarification_answers=session["clarification_answers"]
    )
    
    return {"status": "plan_generation_started"}

async def process_plan_generation(session_id: str, query: str, clarification_answers: Dict):
    """Process plan generation in the background"""
    session = research_sessions[session_id]
    
    try:
        # Generate search plan
        search_plan = await generate_search_plan(query, clarification_answers)
        
        # Update session
        session["search_plan"] = search_plan.dict()
        session["status"] = "searching_web"
        session["step"] = "web_search"
        research_sessions[session_id] = session
        
        # Continue with web search automatically
        await process_web_search(session_id, search_plan)
    except Exception as e:
        # Handle error
        session["status"] = "error"
        session["error"] = f"Error during plan generation: {str(e)}"
        research_sessions[session_id] = session
        print(f"Error in plan generation: {str(e)}")

async def process_web_search(session_id: str, search_plan: SearchPlan):
    """Process web search in the background"""
    session = research_sessions[session_id]
    
    try:
        # Perform web search
        search_results = await perform_web_search(search_plan)
        
        # Update session
        session["search_results"] = search_results.dict()
        session["status"] = "curating_context"
        session["step"] = "context_curation"
        research_sessions[session_id] = session
        
        # Continue with context curation
        await process_context_curation(session_id, search_results)
    except Exception as e:
        # Handle error
        session["status"] = "error"
        session["error"] = f"Error during web search: {str(e)}"
        research_sessions[session_id] = session
        print(f"Error in web search: {str(e)}")

async def process_context_curation(session_id: str, search_results: WebSearchResults):
    """Process context curation in the background"""
    session = research_sessions[session_id]
    
    try:
        # Curate context
        curated_context = await curate_context(search_results)
        
        # Update session
        session["curated_context"] = curated_context.dict()
        session["status"] = "evaluating_context"
        session["step"] = "evaluation"
        research_sessions[session_id] = session
        
        # Continue with evaluation
        await process_evaluation(session_id, curated_context)
    except Exception as e:
        # Handle error
        session["status"] = "error"
        session["error"] = f"Error during context curation: {str(e)}"
        research_sessions[session_id] = session
        print(f"Error in context curation: {str(e)}")

async def process_evaluation(session_id: str, curated_context: CuratedContext):
    """Process evaluation in the background"""
    session = research_sessions[session_id]
    
    try:
        # Increment the iteration counter
        session["iterations"] = session.get("iterations", 0) + 1
        iterations = session["iterations"]
        
        # Evaluate context
        evaluation_result = await evaluate_context(
            curated_context, 
            session["query"]["topic"], 
            session["clarification_answers"],
            iteration=iterations
        )
        
        # Update session
        session["evaluation_result"] = evaluation_result.dict()
        
        if evaluation_result.is_sufficient:
            session["status"] = "generating_report"
            session["step"] = "report_generation"
            research_sessions[session_id] = session
            
            # Continue with report generation
            await process_report_generation(session_id, curated_context)
        else:
            # Need more research
            session["status"] = "searching_web_again"
            session["step"] = "web_search"
            research_sessions[session_id] = session
            
            # Update search plan for another round
            new_plan = SearchPlan(
                queries=evaluation_result.additional_queries,
                depth=session["search_plan"]["depth"] + 1
            )
            
            # Continue with another web search
            await process_web_search(session_id, new_plan)
    except Exception as e:
        # Handle error
        session["status"] = "error"
        session["error"] = f"Error during evaluation: {str(e)}"
        research_sessions[session_id] = session
        print(f"Error in evaluation: {str(e)}")

async def process_report_generation(session_id: str, curated_context: CuratedContext):
    """Process report generation in the background"""
    session = research_sessions[session_id]
    
    try:
        # Generate final report
        final_report = await generate_report(
            curated_context,
            session["query"]["topic"],
            session["clarification_answers"]
        )
        
        # Update session
        session["final_report"] = final_report.dict()
        session["status"] = "completed"
        session["step"] = "completed"
        research_sessions[session_id] = session
    except Exception as e:
        # Handle error
        session["status"] = "error"
        session["error"] = f"Error during report generation: {str(e)}"
        research_sessions[session_id] = session
        print(f"Error in report generation: {str(e)}")

@app.get("/api/research/{session_id}/status")
async def get_research_status(session_id: str):
    """Get the current status of the research session"""
    if session_id not in research_sessions:
        raise HTTPException(status_code=404, detail="Research session not found")
    
    session = research_sessions[session_id]
    return {
        "status": session["status"],
        "step": session["step"]
    }

@app.get("/api/research/{session_id}/report")
async def get_final_report(session_id: str):
    """Get the final research report"""
    if session_id not in research_sessions:
        raise HTTPException(status_code=404, detail="Research session not found")
    
    session = research_sessions[session_id]
    
    if session["status"] != "completed":
        raise HTTPException(status_code=400, detail="Research is not completed yet")
    
    return session["final_report"]

@app.get("/api/research/{session_id}/stream")
async def stream_research_progress(session_id: str):
    """Stream the research progress in real-time"""
    if session_id not in research_sessions:
        raise HTTPException(status_code=404, detail="Research session not found")
    
    async def event_generator():
        session = research_sessions[session_id]
        last_status = None
        
        # Track sent messages to avoid duplicates
        sent_messages = set()
        
        # Keep streaming until completed or error
        while session["status"] != "completed" and session["status"] != "error":
            if last_status != session["status"]:
                event_data = {
                    'status': session['status'], 
                    'step': session['step']
                }
                
                # Add error if present
                if "error" in session:
                    event_data["error"] = session["error"]
                
                yield f"data: {json.dumps(event_data)}\n\n"
                last_status = session["status"]
            
            # Send detailed information based on current status
            if session["status"] == "searching_web" or session["status"] == "searching_web_again":
                # Send search query information
                if "search_plan" in session and session["search_plan"]:
                    search_plan = session["search_plan"]
                    for query in search_plan.get("queries", []):
                        # Create a unique message ID
                        message_id = f"search:{query}"
                        
                        # Only send if not already sent
                        if message_id not in sent_messages:
                            detail_data = {
                                "detail_type": "link",
                                "detail": query
                            }
                            yield f"data: {json.dumps(detail_data)}\n\n"
                            sent_messages.add(message_id)
                            await asyncio.sleep(0.8)  # Stagger the updates
            
            elif session["status"] == "curating_context":
                # Send curation information
                if "search_results" in session and session["search_results"]:
                    search_results = session["search_results"]
                    
                    # Send structured source information
                    for i, result in enumerate(search_results.get("results", [])):
                        # Create a unique message ID
                        source_title = result.get("title", f"Source {i+1}")
                        message_id = f"curation:{source_title}"
                        
                        # Only send if not already sent
                        if message_id not in sent_messages:
                            detail_data = {
                                "detail_type": "curation",
                                "detail": source_title
                            }
                            yield f"data: {json.dumps(detail_data)}\n\n"
                            sent_messages.add(message_id)
                            await asyncio.sleep(1.2)  # Longer pause for curation items
            
            elif session["status"] == "generating_report":
                # Send report generation steps
                report_steps = [
                    "Analyzing research data...",
                    "Organizing main findings...", 
                    "Structuring report sections...",
                    "Adding citations and references..."
                ]
                
                for step in report_steps:
                    # Create a unique message ID
                    message_id = f"report:{step}"
                    
                    # Only send if not already sent
                    if message_id not in sent_messages:
                        detail_data = {
                            "detail_type": "report",
                            "detail": step
                        }
                        yield f"data: {json.dumps(detail_data)}\n\n"
                        sent_messages.add(message_id)
                        await asyncio.sleep(2.5)  # Longer pause between report steps
            
            await asyncio.sleep(1)
            session = research_sessions[session_id]
        
        # Send final event based on status
        if session["status"] == "completed" and session["final_report"]:
            # Send final report completion message
            detail_data = {
                "detail_type": "report",
                "detail": "Finalizing research report..."
            }
            yield f"data: {json.dumps(detail_data)}\n\n"
            
            # Wait a moment before sending the completed status
            await asyncio.sleep(1.5)
            
            # Send completed status with report
            yield f"data: {json.dumps({'status': 'completed', 'report': session['final_report']})}\n\n"
            
        elif session["status"] == "error":
            yield f"data: {json.dumps({'status': 'error', 'error': session.get('error', 'An unknown error occurred')})}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/research/{session_id}/report/stream")
async def stream_report_generation(session_id: str):
    """Stream the report generation process in real-time"""
    if session_id not in research_sessions:
        raise HTTPException(status_code=404, detail="Research session not found")
    
    session = research_sessions[session_id]
    
    # Make this endpoint more flexible - don't strictly require generating_report status
    # Instead, check if we have sufficient context to generate a report
    if "curated_context" not in session or not session["curated_context"]:
        raise HTTPException(status_code=400, detail="Research data is not ready for report generation")
    
    try:
        print(f"Starting report streaming for session {session_id}")
        
        # Get the topic and context from the session
        topic = session["query"]["topic"]
        context = session["curated_context"]["content"]
        
        # Update session status to ensure it's in report generation mode
        session["status"] = "generating_report"
        session["step"] = "report_generation"
        research_sessions[session_id] = session
        
        # Create a prompt for report generation
        prompt = f"Generate a detailed research report on {topic} based on the following research context:\n\n{context}"
        
        print(f"Streaming report generation for topic: {topic}")
        
        # Return the streaming response
        return StreamingResponse(
            stream_llm_response(
                prompt=prompt,
                system_message="You are an expert research report writer. Create a comprehensive, well-structured report based on the provided research data. Include an introduction, main sections, and a conclusion."
            ),
            media_type="text/event-stream"
        )
    except Exception as e:
        print(f"Error in report streaming: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)