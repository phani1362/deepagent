"""
ReAct agent loop: Reason → Act (tool call) → Observe → repeat until done.
Streams events via an async generator so the API layer can SSE them to the client.
"""

import json
import os
from typing import AsyncGenerator
from openai import AsyncOpenAI
from .tools import TOOL_SCHEMAS, run_tool
from .memory import get_history, add_message, search_memory, save_research

SYSTEM_PROMPT = """You are DeepAgent, an expert autonomous research and analysis assistant.

You have access to these tools:
- web_search: find current information on any topic
- read_url: read the full content of a specific webpage
- execute_python: run Python code for calculations or data analysis

## How you work
1. PLAN: Briefly outline your research approach (2-3 steps).
2. ACT: Use tools methodically. Search first, then read specific URLs for depth.
3. SYNTHESIZE: After gathering enough information, write a comprehensive, well-structured answer.

## Rules
- Always verify information from at least 2 sources for important claims.
- Be specific — include numbers, dates, names when available.
- If past memory is provided, use it to avoid redundant research.
- Format your final answer in Markdown with headers, bullet points, and code blocks where relevant.
- Never make up information — only report what your tools confirm.
"""

MAX_ITERATIONS = 10


async def run_agent(
    session_id: str,
    user_query: str,
) -> AsyncGenerator[dict, None]:
    """
    Yields structured SSE events:
      {"type": "plan", "content": "..."}
      {"type": "tool_call", "tool": "web_search", "args": {...}}
      {"type": "tool_result", "tool": "web_search", "result": "..."}
      {"type": "token", "content": "..."}       <- streaming final answer tokens
      {"type": "done", "summary": "..."}
      {"type": "error", "message": "..."}
    """
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # Pull relevant past research
    past_memory = search_memory(user_query, n_results=2)
    memory_block = ""
    if past_memory:
        memory_block = "\n\n## Relevant past research:\n" + "\n".join(
            f"- [{m['original_query']}]: {m['summary']}" for m in past_memory
        )

    system = SYSTEM_PROMPT + memory_block
    history = get_history(session_id)

    messages = [{"role": "system", "content": system}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_query})

    add_message(session_id, "user", user_query)

    iteration = 0
    final_answer = ""

    while iteration < MAX_ITERATIONS:
        iteration += 1

        response = await client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=TOOL_SCHEMAS,
            tool_choice="auto",
            temperature=0.2,
            stream=False,
        )

        msg = response.choices[0].message

        # If the model wants to call tools
        if msg.tool_calls:
            # Add assistant message with tool_calls to history
            messages.append(msg)

            for tool_call in msg.tool_calls:
                fn_name = tool_call.function.name
                fn_args = json.loads(tool_call.function.arguments)

                yield {"type": "tool_call", "tool": fn_name, "args": fn_args}

                tool_result = run_tool(fn_name, fn_args)

                yield {"type": "tool_result", "tool": fn_name, "result": tool_result[:2000]}

                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": tool_result,
                })

        else:
            # Stream the final answer token by token
            stream = await client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                stream=True,
                temperature=0.2,
            )

            streamed = ""
            async for chunk in stream:
                delta = chunk.choices[0].delta.content or ""
                if delta:
                    streamed += delta
                    yield {"type": "token", "content": delta}

            final_answer = streamed
            add_message(session_id, "assistant", final_answer)

            # Persist to long-term memory
            summary = final_answer[:600]
            save_research(session_id, user_query, summary)

            yield {"type": "done", "summary": summary}
            return

    # Fallback if max iterations hit
    yield {"type": "error", "message": "Agent reached max iterations without a final answer."}
