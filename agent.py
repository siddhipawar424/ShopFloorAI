import os
from dotenv import load_dotenv
from agno.agent import Agent
from agno.models.google import Gemini
from agno.playground import Playground
from agno.tools import Toolkit
from agno.utils.log import logger
from typing import Any

from agno.tools.duckduckgo import DuckDuckGoTools
from agno.tools.reasoning import ReasoningTools
from agno.tools.thinking import ThinkingTools

load_dotenv()
gemini_api_key = os.getenv("GEMINI_API_KEY")

if not gemini_api_key:
    raise ValueError("GEMINI_API_KEY not found. Please set it in your .env file.")

from temp import generate_answer
from temp import six_sigma_tool

web_agent = Agent(
    name="GPT-Level Web Agent",
    model=Gemini(
        id="gemini-2.5-flash-lite",
        api_key=gemini_api_key
    ),
    tools=[
        ReasoningTools(add_instructions=True),
        ThinkingTools(add_instructions=True),
        DuckDuckGoTools(search=True, news=True),
    ],
    instructions=[
        "You are a GPT-level research assistant delivering highly contextual, reliable, and structured answers.",
        "Always start with ReasoningTools scratchpad to analyze and plan step by step.",
        "Perform DuckDuckGoTools searches first unless the query is purely definitional or historical.",
        "Gather insights from at least 3 credible sources.",
        "Include clickable markdown citations for all claims.",
        "Synthesize content; do not copy text verbatim.",
        "Use tables, bullet points, numbered lists, timelines, and clear headings.",
        "Flag uncertainties or gaps in data to maintain transparency.",
        "Add 'Insights / Takeaways' section summarizing context, implications, and advice.",
        "Prioritize accuracy, clarity, and contextual relevance.",
        "Adjust depth: concise for simple queries, in-depth for complex ones.",
        "Ensure responses are globally contextual, considering regional differences and implications."
    ],
    markdown=True,
    show_tool_calls=True,
)

class KnowledgeToolkit(Toolkit):
    def __init__(self, **kwargs):
        super().__init__(name="knowledge_toolkit", tools=[self.ask_knowledge_agent], **kwargs)

    def ask_knowledge_agent(self, query: str) -> str:
        """
        Strict deterministic KB workflow:
        1) generate_answer()
        2) six_sigma_tool()
        3) return combined output
        """
        logger.info(f"🔎 Running strict KB workflow for query: {query}")
        try:
            answer = generate_answer(query)
            sources = six_sigma_tool(query)
            final_output = f"""{answer}

### Sources
{sources}"""
            return final_output
        except Exception as e:
            logger.warning(f"KnowledgeToolkit error: {e}")
            return f"Error while running KB flow: {e}"

knowledge_toolkit_instance = KnowledgeToolkit()

kb_agent = Agent(
    name="Knowledge Agent (Direct KB Test)",
    model=Gemini(
        id="gemini-2.0-flash",
        api_key=gemini_api_key
    ),
    tools=[
        knowledge_toolkit_instance  
    ],
    instructions=[
        """
        You are a strict Knowledge Agent.
        - ALWAYS call the KnowledgeToolkit for answers.
        - Do NOT add your own reasoning.
        - Return only what KnowledgeToolkit returns (answer + sources).
        """
    ],
    markdown=True,
    show_tool_calls=True
)

six_sigma_expert = Agent(
    name="Six Sigma Expert Agent",
    model=Gemini(
        id="gemini-2.0-flash-lite",
        api_key=gemini_api_key
    ),
    tools=[
        ReasoningTools(add_instructions=True),
        ThinkingTools(add_instructions=True),
        knowledge_toolkit_instance,
        ThinkingTools(add_instructions=True),
        ReasoningTools(add_instructions=True),
    ],
    instructions=[
        """
        You are a Six Sigma Expert Agent. 
        Workflow:

        1) CALL KNOWLEDGE AGENT FIRST:
           - Send user query verbatim to KnowledgeToolkit.
           - Capture KA_ANSWER and KA_SOURCES.

        2) INTERNAL STUDY:
           - Analyze KA_ANSWER using Thinking + Reasoning tools.
           - Extract insights, methodologies, and improvement ideas.

        3) ADAPTIVE RESPONSE:
           - Generate clear, practical, professional output.
           - Use Six Sigma frameworks only when relevant.
           - Add real-world steps, roles, timelines, KPIs, risks.

        4) FINAL OUTPUT:
           - Do NOT show KA_ANSWER directly.
           - Always include "### Sources" exactly as returned.
           - Never invent, skip, or modify sources.

        5) FAILURE MODES:
           - KA_SOURCES missing → write: "- Knowledge Agent returned no sources."
           - KA_ANSWER missing → say: "No response from Knowledge Agent, retry needed."
        """
    ],
    markdown=True,
    show_tool_calls=True
)

playground_app = Playground(agents=[web_agent, kb_agent, six_sigma_expert])
app = playground_app.get_app()

if __name__ == "__main__":
    playground_app.serve("playground:app", reload=True)

    