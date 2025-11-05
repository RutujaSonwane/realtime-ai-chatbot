const ws = new WebSocket("ws://localhost:8000");

ws.onopen = () => console.log("✅ Connected to backend");
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "ai_stream") {
    // append streamed token to AI message
  } else if (data.type === "ai_done") {
    // mark response as completed
  } else if (data.type === "error") {
    console.error("Backend Error:", data.message);
  }
};
