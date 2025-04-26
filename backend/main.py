from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends, Form
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
from models.auth_schemas import UserDB

from modules.clarification import generate_clarification_questions
from modules.plan_generation import generate_search_plan
from modules.web_search import perform_web_search
from modules.context_curation import curate_context
from modules.evaluation import evaluate_context
from modules.report_generation import generate_report
from services.llm_service import stream_llm_response
from config import Settings

# Import authentication dependencies
from fastapi.security import OAuth2PasswordBearer
from services.auth_service import get_current_user

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
    allow_origins=settings.allow_origins,
    allow_credentials=True,
    allow_methods=settings.allow_methods,
    allow_headers=settings.allow_headers,
)

# Authentication setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Authentication routes
@app.get("/api/auth/google/url")
async def get_google_auth_url():
    """Generate the Google OAuth URL for frontend redirection"""
    auth_url = f"https://accounts.google.com/o/oauth2/auth" \
               f"?client_id={settings.google_client_id}" \
               f"&redirect_uri={settings.google_redirect_uri}" \
               f"&response_type=code" \
               f"&scope=email%20profile" \
               f"&access_type=offline"
    
    return {"auth_url": auth_url}

@app.post("/api/auth/google/callback")
async def google_callback(
    code: str = Form(...),
    redirect_uri: str = Form(None),
    state: str = Form(None),
    error: str = Form(None)
):
    """Handle Google OAuth callback with authorization code"""
    try:
        if error:
            raise HTTPException(
                status_code=400,
                detail=f"Google authentication error: {error}"
            )

        if not code:
            raise HTTPException(
                status_code=400,
                detail="No authorization code received"
            )

        # Here you would implement the code exchange for tokens
        return {
            "access_token": "dummy_token",
            "token_type": "bearer",
            "user": {
                "id": "123",
                "email": "user@example.com",
                "name": "Test User",
                "is_active": True
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Authentication error: {str(e)}"
        )

@app.get("/api/auth/me")
async def get_current_user_info(token: str = Depends(oauth2_scheme)):
    """Get current user information"""
    # Dummy implementation
    return {
        "id": "123",
        "email": "user@example.com",
        "name": "Test User",
        "is_active": True
    }

@app.post("/api/auth/logout")
async def logout():
    """Log out the current user"""
    return {"message": "Successfully logged out"}

# Store active research sessions
research_sessions = {}

# Map user IDs to their research sessions
user_sessions = {}

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
        "iterations": 0,  # Track the number of research iterations
        "user_id": None  # No user authentication yet
    }
    
    return {"session_id": session_id, "status": "clarification_needed"}

# Continue with the rest of your API endpoints...

@app.get("/api/research/{session_id}/clarification")
async def get_clarification_questions(session_id: str):
    """Generate and return clarification questions for the research query"""
    if session_id not in research_sessions:
        raise HTTPException(status_code=404, detail="Research session not found")
    
    session = research_sessions[session_id]
    model_id = session["query"].get("model_id")  # Get model_id from query
    
    if session["clarification_questions"] is None:
        questions = await generate_clarification_questions(
            session["query"]["topic"],
            model_id=model_id
        )
        
        session["clarification_questions"] = questions.model_dump()
        session["status"] = "awaiting_clarification"
        research_sessions[session_id] = session
    
    return session["clarification_questions"]

@app.post("/api/research/{session_id}/clarification")
async def submit_clarification_answers(
    session_id: str, 
    answers: ClarificationResponse, 
    background_tasks: BackgroundTasks
):
    """Submit answers to clarification questions and immediately start plan generation"""
    if session_id not in research_sessions:
        raise HTTPException(status_code=404, detail="Research session not found")
    
    session = research_sessions[session_id]
    session["clarification_answers"] = answers.model_dump()
    session["status"] = "generating_plan"
    session["step"] = "plan_generation"
    research_sessions[session_id] = session
    
    # Start the plan generation process in the background
    background_tasks.add_task(
        process_plan_generation,
        session_id=session_id,
        query=session["query"]["topic"],
        clarification_answers=session["clarification_answers"],
        clarification_questions=session["clarification_questions"]
    )
    
    # Return immediately while plan generation runs in the background
    return {"status": "plan_generation_started"}

async def process_plan_generation(session_id: str, query: str, clarification_answers: Dict, clarification_questions: Dict):
    """Process plan generation in the background"""
    session = research_sessions[session_id]
    model_id = session["query"].get("model_id")  # Get model_id from query
    
    try:
        # Generate search plan
        search_plan = await generate_search_plan(
            query, 
            clarification_answers, 
            clarification_questions,
            model_id=model_id
        )
        
        # Update session
        session["search_plan"] = search_plan.model_dump()
        session["status"] = "searching_web"
        session["step"] = "web_search"
        research_sessions[session_id] = session
        
        # Continue with web search automatically
        await process_web_search(session_id, search_plan)
    except AttributeError as e:
        error_msg = "Missing required configuration. Please check your .env file and Settings class."
        session["status"] = "error"
        session["error"] = error_msg
        research_sessions[session_id] = session
        print(f"Configuration error: {error_msg}")
    except Exception as e:
        # Capture and log the underlying error from the Serper API
        error_msg = f"Error during plan generation: {str(e)}"
        session["status"] = "error"
        session["error"] = error_msg
        research_sessions[session_id] = session
        print(f"Error in plan generation: {error_msg}")

@app.get("/api/research/{session_id}/plan")
async def generate_plan(session_id: str, background_tasks: BackgroundTasks):
    """Generate a search plan based on the clarified query (LEGACY/DEPRECATED - Plan now starts automatically)"""
    # This endpoint is likely no longer needed if plan starts automatically after clarification
    # Keep it for now but consider removing later
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
        clarification_answers=session["clarification_answers"],
        clarification_questions=session["clarification_questions"]
    )
    
    return {"status": "plan_generation_started"}

async def process_web_search(session_id: str, search_plan: SearchPlan):
    """Process web search in the background"""
    session = research_sessions[session_id]
    
    try:
        # Perform web search
        search_results = await perform_web_search(search_plan)
        
        # Update session
        session["search_results"] = search_results.model_dump()
        session["status"] = "curating_context"
        session["step"] = "context_curation"
        research_sessions[session_id] = session
        
        # Continue with context curation automatically
        await process_context_curation(session_id, search_results)
    except Exception as e:
        error_msg = f"Error during web search: {str(e)}"
        session["status"] = "error"
        session["error"] = error_msg
        research_sessions[session_id] = session
        print(f"Error in web search: {error_msg}")

async def process_context_curation(session_id: str, search_results: WebSearchResults):
    """Process context curation in the background"""
    session = research_sessions[session_id]
    model_id = session["query"].get("model_id")  # Get model_id from query
    
    try:
        # Curate context
        curated_context = await curate_context(search_results, model_id=model_id)
        
        # Update session
        session["curated_context"] = curated_context.model_dump()
        session["status"] = "evaluating"
        session["step"] = "evaluation"
        research_sessions[session_id] = session
        
        # Continue with evaluation automatically
        await process_evaluation(session_id, curated_context)
    except Exception as e:
        error_msg = f"Error during context curation: {str(e)}"
        session["status"] = "error"
        session["error"] = error_msg
        research_sessions[session_id] = session
        print(f"Error in context curation: {error_msg}")

async def process_evaluation(session_id: str, curated_context: CuratedContext):
    """Process evaluation in the background"""
    session = research_sessions[session_id]
    model_id = session["query"].get("model_id")  # Get model_id from query
    
    try:
        # Evaluate context
        evaluation_result = await evaluate_context(
            curated_context,
            session["query"]["topic"],
            session["clarification_answers"],
            session["iterations"],
            session["clarification_questions"],
            model_id=model_id
        )
        
        # Update session
        session["evaluation_result"] = evaluation_result.model_dump()
        
        if evaluation_result.is_sufficient:
            # If research is sufficient, move to report generation
            session["status"] = "generating_report"
            session["step"] = "report_generation"
            research_sessions[session_id] = session
            
            # Start report generation
            await process_report_generation(session_id, curated_context)
        else:
            # If more research is needed, increment iteration counter
            session["iterations"] += 1
            
            if session["iterations"] >= 4:
                # Force completion after 4 iterations
                session["status"] = "generating_report"
                session["step"] = "report_generation"
                research_sessions[session_id] = session
                
                # Start report generation
                await process_report_generation(session_id, curated_context)
            else:
                # Start another research iteration
                session["status"] = "generating_plan"
                session["step"] = "plan_generation"
                research_sessions[session_id] = session
                
                # Generate new search plan with additional queries
                new_plan = SearchPlan(
                    queries=evaluation_result.additional_queries,
                    depth=session["iterations"] + 1
                )
                
                # Start new iteration
                await process_web_search(session_id, new_plan)
                
    except Exception as e:
        error_msg = f"Error during evaluation: {str(e)}"
        session["status"] = "error"
        session["error"] = error_msg
        research_sessions[session_id] = session
        print(f"Error in evaluation: {error_msg}")

async def process_report_generation(session_id: str, curated_context: CuratedContext):
    """Process report generation in the background"""
    session = research_sessions[session_id]
    model_id = session["query"].get("model_id")  # Get model_id from query
    
    try:
        # Generate report
        final_report = await generate_report(
            curated_context,
            session["query"]["topic"],
            session["clarification_answers"],
            session["iterations"],
            session["clarification_questions"],
            model_id=model_id
        )
        
        # Update session
        session["final_report"] = final_report.model_dump()
        session["status"] = "completed"
        session["step"] = "completed"
        research_sessions[session_id] = session
    except Exception as e:
        error_msg = f"Error during report generation: {str(e)}"
        session["status"] = "error"
        session["error"] = error_msg
        research_sessions[session_id] = session
        print(f"Error in report generation: {error_msg}")

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
        
        # Get the topic, context, AND model_id from the session
        topic = session["query"]["topic"]
        # Safely get model_id, falling back to None if not present
        model_id = session.get("query", {}).get("model_id") 
        context = session["curated_context"]["content"]
        
        # Update session status to ensure it's in report generation mode
        session["status"] = "generating_report"
        session["step"] = "report_generation"
        research_sessions[session_id] = session
        
        # Create a prompt for report generation
        prompt = f"Generate a detailed research report on {topic} based on the following research context:\n\n{context}"
        
        print(f"Streaming report generation for topic: {topic} using model: {model_id or 'default'}")
        
        # Pass the retrieved model_id to stream_llm_response
        return StreamingResponse(
            stream_llm_response(
                prompt=prompt,
                model_id=model_id, # Pass the specific model_id for this session
                module_name="report_generation", # Add module name for logging
                system_message="You are an expert research report writer. Create a comprehensive, well-structured report based on the provided research data. Include an introduction, main sections, and a conclusion."
            ),
            media_type="text/event-stream"
        )
    except Exception as e:
        print(f"Error in report streaming: {str(e)}")
        # Log the traceback for detailed debugging
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

# Reports endpoint
@app.get("/api/user/reports")
async def get_user_reports():
    """Get all research reports (dummy implementation)"""
    return {
        "reports": [
            {
                "session_id": "1",
                "topic": "Quantum computing applications",
                "created_at": "2023-07-01T10:30:00Z",
                "title": "The Future of Quantum Computing: Applications and Implications"
            },
            {
                "session_id": "2",
                "topic": "Climate change mitigation strategies",
                "created_at": "2023-06-28T14:15:00Z",
                "title": "Climate Change Mitigation: Current Strategies and Future Directions"
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)