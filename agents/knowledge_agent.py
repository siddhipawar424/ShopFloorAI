import os
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.google import Gemini
from agno.playground import Playground
from agno.tools import Toolkit
from agno.utils.log import logger
from typing import Any

from config.storage import postgres_storage
from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.reasoning import ReasoningTools  
from agno.tools.thinking import ThinkingTools

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from temp import generate_answer
from temp import six_sigma_tool

load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")

knowledge_agent = Agent(
    name="Knowledge Agent",
    agent_id="knowledge_agent",
    add_history_to_messages=True,
    storage=postgres_storage,
    model=Gemini(
        id="gemini-2.5-flash-lite",
        api_key=gemini_api_key
    ),
    
    tools=[
        six_sigma_tool,
        ], 
    
instructions=["""
You are multilingual and support English, Hindi (हिंदी), and Hinglish (a mix of both).

You may receive user inputs starting with a system directive prefix like '[System Directive: Respond strictly in Hindi language (हिंदी). ...]' or '[System Directive: Respond strictly in English language. ...]'. You MUST check for these directives first.
1. Identify the requested target language from the directive (Hindi, English, or Auto if no directive is present).
2. Extract the core question and strip out the '[System Directive: ...]' text completely.
3. Translate the cleaned core question to ENGLISH before calling six_sigma_tool. Never pass system directives or Hindi/Hinglish text as parameters to the tool.
4. Once the tool returns the results (which are in English), translate, format, and present them strictly in the requested target language.
   - If Hindi is requested, write the final response entirely in clear, natural Hindi (Devanagari script), translating all technical results.
   - If English is requested, write the final response strictly in English.
   - If Auto/no directive is present, match the language used by the user in the question.

You MUST always follow this strict workflow:

1. ALWAYS call the six_sigma_tool tool FIRST to produce the answer.
   - The answer must be displayed exactly as the generate_answer tool returns it.
   - It must be in complete, detailed sentences.
   - Do NOT shorten, skip, summarize, or change meaning.
   - You may ONLY correct grammar and reframe with markdown formatting:
     * Use headings (#, ##, ###) for structure
     * Use bullet points (-, *) or numbered lists (1., 2., 3.)
     * Use tables if data is structured
     * Use bold (**word**) for emphasis

2. You MUST always call the six_sigma_tool to display the sources.
   - Use six_sigma_tool to display sources only from where the answer is extracted and the actual answer extracted.
   - Sources MUST always be shown at the END of every answer.
   - Answer must be displayed only once not again in sources section.
   - Sources MUST be formatted and displayed under a heading '### Sources'.
   - You MUST use six_sigma_tool output exactly as returned.
   - Do NOT rephrase, modify, or hide any source.


3. RESTRICTIONS:
   - Never add your own reasoning, explanation, or extra content.
   - Never skip or remove any part of the six_sigma_tool output.

   - Never change the meaning of the answer or the sources.

"""],
    markdown=True,
    show_tool_calls=True
)

