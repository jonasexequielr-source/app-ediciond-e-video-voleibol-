import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ActionType, GameEvent } from "../types";

// Helper to get the AI client.
// Note: In a real production app, ensure API_KEY is secure.
const getAIClient = (apiKey?: string) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: key });
};

export const analyzeGameStats = async (events: GameEvent[]): Promise<string> => {
  try {
    const ai = getAIClient();
    
    // Summarize data for the prompt
    const total = events.length;
    const points = events.filter(e => e.type === ActionType.POINT).length;
    const defense = events.filter(e => e.type === ActionType.DEFENSE).length;
    const errors = events.filter(e => e.type === ActionType.ERROR).length;

    // Create a simplified text representation of spatial data
    const zones = events.map(e => {
        let zone = "centro";
        if (e.y < 33) zone = "red/frente";
        else if (e.y > 66) zone = "fondo";
        
        let side = "centro";
        if (e.x < 33) side = "izquierda";
        else if (e.x > 66) side = "derecha";
        
        return `${e.type} en zona ${zone}-${side}`;
    }).join(", ");

    const prompt = `
      Actúa como un entrenador experto de voleibol. Analiza los siguientes datos de un partido registrados en nuestra app:
      
      Total acciones: ${total}
      Puntos (balón a suelo): ${points}
      Defensas exitosas: ${defense}
      Errores: ${errors}
      
      Distribución de eventos:
      ${zones}
      
      Proporciona un análisis táctico breve (max 150 palabras) sobre la eficacia del ataque y las debilidades defensivas basadas en dónde cayeron los balones. Dame 3 consejos claros.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Error analyzing stats:", error);
    return "Error al conectar con Gemini AI. Verifica tu API Key.";
  }
};

export const generateDrillVideo = async (promptText: string): Promise<string | null> => {
  try {
    // Check for user selected key for Veo as per requirements
    // This assumes window.aistudio is available in the environment if using the Google specific tooling,
    // otherwise fallback to process.env
    let key = process.env.API_KEY;
    
    if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        // Just proceed, the environment usually injects or handles the key context if specifically integrated
        // Or we might trigger the selector if needed.
    } else if (window.aistudio) {
        await window.aistudio.openSelectKey();
        // Race condition mitigation as per prompt instruction: assume success immediately
    }

    // Re-instantiate with potentially new key context if the env changed, 
    // but here we rely on process.env being updated or the client handling it.
    const ai = getAIClient(); 

    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Volleyball training drill: ${promptText}. Realistic, high quality sports footage.`,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s
      operation = await ai.operations.getVideosOperation({operation: operation});
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) return null;

    // Append API key to fetch
    const videoUrl = `${downloadLink}&key=${process.env.API_KEY}`;
    return videoUrl;

  } catch (error) {
    console.error("Veo generation error:", error);
    throw error;
  }
};

export const analyzeFrameStrategy = async (base64Image: string): Promise<string> => {
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Using "Nano banana" equivalent as requested/appropriate for vision
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                    { text: "Analiza la formación defensiva en esta imagen de voleibol. ¿Hay huecos evidentes? ¿La postura de los jugadores es correcta?" }
                ]
            }
        });
        return response.text || "No se pudo analizar la imagen.";
    } catch (e) {
        console.error(e);
        return "Error analizando el frame.";
    }
}
