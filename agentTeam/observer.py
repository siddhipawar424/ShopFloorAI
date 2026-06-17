import os
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.google import Gemini
from agno.tools.reasoning import ReasoningTools
from agno.tools.thinking import ThinkingTools
from config.storage import postgres_storage
from agents.web_agent import web_agent
from agents.knowledge_agent import knowledge_agent
from agents.six_sigma_agent import six_sigma_expert
from agents.oee_agent import oee_agent
from agents.cycle_time_agent import cycle_time_agent
from agents.cnc_agent import cnc_agent_expert
load_dotenv()

def oee_tool(user_prompt: str) -> str:
    """Process user prompt using the OEE Agent."""
    return str(oee_agent.run(user_prompt))

def six_sigma_tool(user_prompt: str) -> str:
    """Process user prompt using the Six Sigma Expert Agent."""
    return str(six_sigma_expert.run(user_prompt))

def cnc_tool(user_prompt: str) -> str:
    """Process user prompt using the CNC Expert Agent."""
    return str(cnc_agent_expert.run(user_prompt))

def knowledge_tool(user_prompt: str) -> str:
    """Process user prompt using the Knowledge Agent."""
    return str(knowledge_agent.run(user_prompt))

def web_tool(user_prompt: str) -> str:
    """Process user prompt using the Web Agent."""
    return str(web_agent.run(user_prompt))

def cycle_time_tool(user_prompt: str) -> str:
    """Process user prompt using the Cycle Time Agent."""
    return str(cycle_time_agent.run(user_prompt))

from config.storage import postgres_storage

observer_agent = Agent(
    name="Observer Agent",
    agent_id="observer_agent",
    storage=postgres_storage,
    add_history_to_messages=True,
    model=Gemini(
        id="gemini-2.5-flash",
        api_key=os.getenv("GEMINI_API_KEY")
    ),
    tools=[
        ReasoningTools(add_instructions=True),
        ThinkingTools(add_instructions=True),
        six_sigma_tool,
        cnc_tool,
        oee_tool,
        knowledge_tool,
        cycle_time_tool,
    ],
    instructions=[
       """
        You are a production performance observer.
        You are multilingual and support English, Hindi (हिंदी), and Hinglish (a mix of both).

        You may receive user inputs starting with a system directive prefix like '[System Directive: Respond strictly in Hindi language (हिंदी). ...]' or '[System Directive: Respond strictly in English language. ...]'. You MUST check for these directives first.
        1. Identify the requested target language from the directive (Hindi, English, or Auto if no directive is present).
        2. Extract the core question and strip out the '[System Directive: ...]' text completely.
        3. Translate the cleaned core question to ENGLISH before calling any sub-agent tools (six_sigma_tool, cnc_tool, oee_tool, knowledge_tool, cycle_time_tool, etc.). Never pass system directives or Hindi/Hinglish text as parameters to the tools.
        4. Once the tools return their results (which are in English), translate, format, and present them strictly in the requested target language.
           - If Hindi is requested, write the final response entirely in clear, natural Hindi (Devanagari script), translating all technical results.
           - If English is requested, write the final response strictly in English.
           - If Auto/no directive is present, match the language used by the user in the question.
        Your responsibilities:
        - Analyze machine/system performance
        - Detect inefficiencies
        - Identify bottlenecks
        - Call appropriate domain agents tools when needed
        
        Workflow:
        1. Understand the user query.
        2. Decide which  agent tool is required.
        3. Call relevant agents tool.
        4. Analyze outputs using reasoning tools.
        5. Produce structured diagnostic report.
        
       You are required to check all available tools to retrieve the correct answer.
       If one tool fails, returns an error, or provides incomplete information, you MUST immediately try the next available tool.
       You MUST continue this process until a valid and complete answer is obtained.
       Once the correct answer is found, you MUST immediately stop searching.
       You are strictly prohibited from stopping early without verifying all necessary tools.
       You must not assume an answer without tool verification.
       You must produce the final output only after confirming the answer through tool usage.
        Do NOT simply forward tool output.
        You must synthesize insights.
        """
    ],
    markdown=True,
    show_tool_calls=True
)

