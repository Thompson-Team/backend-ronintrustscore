import axios from "axios";

/**
 * Convierte las respuestas del cuestionario a un texto legible para la IA
 */
const formatAnswersAsText = (answers: Record<string, any>): string => {
  const lines: string[] = [];
  
  // Agregar encabezado
  lines.push("=== User Questionnaire Responses ===\n");
  
  // Procesar cada respuesta
  Object.entries(answers).forEach(([key, value]) => {
    // Formatear la clave (convertir snake_case o camelCase a palabras)
    const formattedKey = key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .replace(/\b\w/g, char => char.toUpperCase());
    
    // Formatear el valor
    let formattedValue: string;
    
    if (typeof value === 'object' && value !== null) {
      // Si es un objeto, convertirlo a texto legible
      formattedValue = JSON.stringify(value, null, 2)
        .replace(/[{}"]/g, '')
        .replace(/,/g, '\n');
    } else if (Array.isArray(value)) {
      // Si es un array
      formattedValue = value.join(', ');
    } else {
      // Valor simple
      formattedValue = String(value);
    }
    
    lines.push(`${formattedKey}: ${formattedValue}`);
  });
  
  return lines.join('\n');
};

export const analyzeWithAI = async (answers: Record<string, any>, wallet: string) => {
  try {
    console.log('🤖 Preparing text for AI analysis...');
    
    // Convertir las respuestas a texto legible
    const text = formatAnswersAsText(answers);
    
    console.log('📝 Formatted text preview:');
    console.log(text.substring(0, 200) + '...');

    // Hacer POST al microservicio de Python
    const response = await axios.post("http://127.0.0.1:8005/analyze", {
      text,
      wallet
    });

    console.log('✅ AI analysis completed');
    console.log('📊 Score:', response.data.overallScore);

    return response.data;

  } catch (error: any) {
    console.error("AI Microservice error:", error.response?.data || error.message);
    throw new Error("Microservice AI failed");
  }
};