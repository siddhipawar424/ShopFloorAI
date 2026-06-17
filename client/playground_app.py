#uvicorn client.playground_app:app --host 127.0.0.1 --port 7777
# client/playground_app.py
#python -m uvicorn client.playground_app:app --host 127.0.0.1 --port 7777

from agno.playground import Playground
from agents.web_agent import web_agent
from agents.knowledge_agent import knowledge_agent
from agents.six_sigma_agent import six_sigma_expert
from agents.oee_agent import oee_agent
from agents.cycle_time_agent import cycle_time_agent
from agents.cnc_agent import cnc_agent_expert
from agentTeam.mentor import mentor_agent
from agentTeam.observer import observer_agent
from agentTeam.predict_plan import predict_plan_agent

import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

'''playground_app = Playground(agents=[web_agent, knowledge_agent,  six_sigma_expert, oee_agent, cycle_time_agent, cnc_agent_
, observer_agent])
persist_sessions=True
app = playground_app.get_app()'''

from config.storage import postgres_storage 

agents = [
    web_agent,
    six_sigma_expert,
    cnc_agent_expert,
    oee_agent,
    cycle_time_agent,
    observer_agent,
    knowledge_agent,
    predict_plan_agent,
    mentor_agent,
]

for agent in agents:
    setattr(agent, "storage", postgres_storage)

playground_app = Playground(
    agents=agents
)

for agent in agents:
    print("AGENT:", agent.name, "ID:", getattr(agent, "agent_id", None), "STORAGE:", getattr(agent, "storage", None))

app = playground_app.get_app()

from fastapi import UploadFile, File, Form
import google.generativeai as genai

@app.post("/v1/playground/transcribe")
async def transcribe_audio(file: UploadFile = File(...), language: str = Form("auto")):
    try:
        audio_bytes = await file.read()
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        if language == "hindi":
            prompt = "Transcribe this audio precisely in Hindi (Devanagari script). Return ONLY the transcribed text. Do not add any greeting, intro, or comment. If the audio is empty or has no clear speech, return an empty string."
        elif language == "english":
            prompt = "Transcribe this audio precisely in English. Return ONLY the transcribed text. Do not add any greeting, intro, or comment. If the audio is empty or has no clear speech, return an empty string."
        else:
            prompt = "Transcribe this audio precisely. Detect the language automatically (English or Hindi). Return ONLY the transcribed text. Do not add any greeting, intro, or comment. If the audio is empty or has no clear speech, return an empty string."
        
        response = model.generate_content([
            {
                "mime_type": "audio/webm",
                "data": audio_bytes
            },
            prompt
        ])
        
        transcription_text = response.text.strip() if response.text else ""
        return {"text": transcription_text}
    except Exception as e:
        print("Audio transcription error:", e)
        return {"error": str(e), "text": ""}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "client.playground_app:app", 
        host="127.0.0.1",
        port=7777,
        reload=True,
        log_level="info"
    )
