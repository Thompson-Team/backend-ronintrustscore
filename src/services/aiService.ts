import axios from "axios";

export const analyzeWithAI = async (answers: Record<string, any>, wallet: string) => {
  try {
    // 1) Convertir las respuestas a texto para enviarlas al LLM
    const text = JSON.stringify(answers);

    // 2) Hacer POST al microservicio de Python
    const response = await axios.post("http://127.0.0.1:8005/analyze", {
      text,
      wallet
    });

    // 3) Devolver el resultado procesado de la IA
    return response.data;

  } catch (error) {
    console.error("AI Microservice error:", error);
    throw new Error("Microservice AI failed");
  }
};
