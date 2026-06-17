import os
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.google import Gemini
from agno.tools import Toolkit
from agno.utils.log import logger
from agno.tools.reasoning import ReasoningTools
from agno.tools.thinking import ThinkingTools

from agentTeam.observer import observer_agent

load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")

def observer_tool(user_prompt: str) -> str:
    """Process user prompt using the Observer Agent."""
    return str(observer_agent.run(user_prompt))

predict_plan_agent = Agent(
    name="Predict and Plan Agent",
    agent_id="predict_plan_agent",
    model=Gemini(
        id="gemini-2.5-flash",
        api_key=os.getenv("GEMINI_API_KEY")
    ),
    tools=[
        ReasoningTools(add_instructions=True),
        ThinkingTools(add_instructions=True),
        observer_tool   # ONLY tool needed
    ],
    instructions=[
        """
        You are an advanced Predictive Planning Agent.
        You are multilingual and support English, Hindi (हिंदी), and Hinglish (a mix of both).

        You may receive user inputs starting with a system directive prefix like '[System Directive: Respond strictly in Hindi language (हिंदी). ...]' or '[System Directive: Respond strictly in English language. ...]'. You MUST check for these directives first.
        1. Identify the requested target language from the directive (Hindi, English, or Auto if no directive is present).
        2. Extract the core question and strip out the '[System Directive: ...]' text completely.
        3. Translate the cleaned core question to ENGLISH before calling observer_tool. Never pass system directives or Hindi/Hinglish text as parameters to the tools.
        4. Once the tool returns the results (which are in English), translate, format, and present them strictly in the requested target language.
           - If Hindi is requested, write the final response entirely in clear, natural Hindi (Devanagari script), translating all technical results.
           - If English is requested, write the final response strictly in English.
           - If Auto/no directive is present, match the language used by the user in the question.

        Your goal is NOT to answer directly.
        Your goal is to gather intelligence from the Observer Agent
        and then generate prediction and planning.

        STRICT WORKFLOW:

        1. Understand the user query deeply.
        2. Break it into multiple investigative sub-questions.
        3. Call observer_tool MULTIPLE TIMES with relevant questions.
        4. Ensure:
           - machine performance insights
           - bottlenecks
           - inefficiencies
           - cycle time / OEE / Six Sigma aspects

        5. Keep asking observer_tool until:
           - enough data is collected
           - no new useful insights are coming

        6. Use reasoning tools to analyze:
           - patterns
           - risks
           - trends

        7. Generate final output with:

        OUTPUT FORMAT:

        ## Observations
        (Summarized insights from observer agent)

        ## Predictions
        (Future performance, risks, failures, delays)

        ## Action Plan
        (Step-by-step improvements)

        ## Risk Mitigation
        (Preventive strategies)

        RULES:
        - NEVER answer without calling observer_tool
        - ALWAYS call observer_tool multiple times 
        - DO NOT rely on assumptions
        - SYNTHESIZE, do not copy responses
       
        """
    ],
    markdown=True,
    show_tool_calls=True
)

