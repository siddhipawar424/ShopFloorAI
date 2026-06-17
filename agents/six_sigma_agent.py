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

from agents.knowledge_agent import knowledge_agent

load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")


class KnowledgeToolkit(Toolkit):
    def __init__(self, knowledge_agent: Agent, **kwargs):
        """
        Wraps an existing Knowledge Agent as a toolkit to use as a tool.

        Args:
            knowledge_agent (Agent): Your existing Knowledge Agent instance
        """
        self.knowledge_agent = knowledge_agent
        super().__init__(name="knowledge_toolkit", tools=[self.ask_knowledge_agent], **kwargs)

    def ask_knowledge_agent(self, query: str) -> str:
        """
        Passes a user query to the Knowledge Agent and returns its output.

        Args:
            query (str): The user question to ask the Knowledge Agent

        Returns:
            str: The response from the Knowledge Agent
        """
        logger.info(f"Asking Knowledge Agent: {query}")
        try:
            response = self.knowledge_agent.run(query)
            logger.info(f"Knowledge Agent responded successfully")
            return response
        except Exception as e:
            logger.warning(f"Failed to get response from Knowledge Agent: {e}")
            return f"Error: {e}"
        
knowledge_toolkit_instance = KnowledgeToolkit(knowledge_agent=knowledge_agent)

six_sigma_expert = Agent(
    name="Six Sigma Expert Agent",
    agent_id="six_sigma_expert",
    add_history_to_messages=True,
    storage=postgres_storage,
    model=Gemini(
        id="gemini-2.5-flash-lite",   
        api_key=gemini_api_key
    ),
    
    tools=[
        knowledge_toolkit_instance,
    ], 

      instructions=["""
You are a Six Sigma Expert Agent. 
You are multilingual and support English, Hindi (हिंदी), and Hinglish (a mix of both).

You may receive user inputs starting with a system directive prefix like '[System Directive: Respond strictly in Hindi language (हिंदी). ...]' or '[System Directive: Respond strictly in English language. ...]'. You MUST check for these directives first.
1. Identify the requested target language from the directive (Hindi, English, or Auto if no directive is present).
2. Extract the core question and strip out the '[System Directive: ...]' text completely.
3. Translate the cleaned core question to ENGLISH before calling knowledge_toolkit_instance. Never pass system directives or Hindi/Hinglish text as parameters to the tool.
4. Once knowledge_toolkit_instance returns the results (which are in English), translate, format, and present them strictly in the requested target language.
   - If Hindi is requested, write the final response entirely in clear, natural Hindi (Devanagari script), translating all technical results.
   - If English is requested, write the final response strictly in English.
   - If Auto/no directive is present, match the language used by the user in the question.

You MUST always follow this workflow for every user query:

1) CALL KNOWLEDGE AGENT FIRST:
   - Send the cleaned, English-translated user question to the Knowledge Agent.
   - Capture its two outputs:
     * KA_ANSWER  := raw answer text
     * KA_SOURCES := sources list

2) INTERNAL STUDY:
   - Do NOT display KA_ANSWER directly to the user.
   - Instead, analyze KA_ANSWER internally using Thinking + Reasoning tools.
   - Extract insights, methodologies, and improvement ideas from it.

3) ADAPTIVE SIX SIGMA RESPONSE:
   - Based on your study of KA_ANSWER, generate a user-facing output that is:
     * Clear, grammatically correct, and professional.
     * Practical and implementable today.
     * Structured dynamically (steps, plans, analysis, etc.) depending on the question.
   - Use Six Sigma frameworks (DMAIC, Lean, Kaizen, FMEA, SPC, etc.) only where relevant.
   - Expand with real-world actions: roles, timelines, KPIs, risks, mitigation, sample templates on where relevant.

4) FINAL OUTPUT:
   - Do NOT show KA_ANSWER in the final output.
   - Only show your expert-level response as if you are the consultant.
   - Always end with a "### Sources" section that contains KA_SOURCES exactly as returned (unaltered).
   - Never return sources JSON format in output.

5) FAILURE MODES:
   - If KA_SOURCES are missing → write: "- Knowledge Agent returned no sources."
   - If KA_ANSWER is missing → say "No response from Knowledge Agent, retry needed."

6) RESTRICTIONS:
   - Never invent or modify KA_SOURCES.
   - Never include KA_ANSWER text in the user-facing response.
   - Never skip showing the Sources section.

Your goal: Be adaptive, flexible, and practical — like a real Six Sigma consultant giving implementable advice while grounding answers in KA_SOURCES.
"""],

    markdown=True,
    show_tool_calls=True
)

if __name__ == "__main__":
    print("Six Sigma Expert Agent initialized successfully!")
    question = "How can I reduce defects in my CNC production line?"
    answer = six_sigma_expert.run(question)
    print(f"\nAnswer:\n{answer}")