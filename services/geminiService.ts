
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { IMAGEN_MODEL_NAME } from '../constants';

// Ensure API_KEY is available in the environment.
const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY environment variable is not set.");
  // Potentially throw an error or handle this state in the UI
}

const ai = new GoogleGenAI({ apiKey: apiKey || "MISSING_API_KEY" }); // Provide a fallback for type safety if needed

interface GeneratedImage {
  imageDataUrl: string;
  altText: string;
}

export const generatePixelArtImage = async (prompt: string, aspectRatio: string): Promise<GeneratedImage> => {
  if (!apiKey) {
    throw new Error("API key is not configured. Please set the API_KEY environment variable.");
  }
  
  // Prompt no longer needs to include aspect ratio as it's a direct config
  const fullPrompt = `Generate a pixel art image. The subject is: "${prompt}". Style: 8-bit retro game, detailed pixel illustration.`;

  try {
    const response = await ai.models.generateImages({
      model: IMAGEN_MODEL_NAME,
      prompt: fullPrompt,
      config: { 
        numberOfImages: 1, 
        outputMimeType: 'image/png', // PNG is generally good for pixel art
        aspectRatio: aspectRatio // Use the direct API parameter
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const image = response.generatedImages[0];
      if (image.image?.imageBytes) {
        const base64ImageBytes = image.image.imageBytes;
        const imageDataUrl = `data:image/png;base64,${base64ImageBytes}`;
        return { imageDataUrl, altText: `Pixel art for: ${prompt} (intended aspect ratio: ${aspectRatio})` };
      } else {
        throw new Error("Image data is missing in the API response.");
      }
    } else {
      // This typically means the prompt was filtered or the model couldn't fulfill the request.
      throw new Error("The AI couldn't generate an image for this prompt. This might be due to safety filters or the specific nature of your request. Please try rephrasing or using a different prompt.");
    }
  } catch (error) {
    console.error("Error generating image with Gemini API:", error);
    if (error instanceof Error) {
        // Check for specific API error messages if available
        if (error.message.includes("API key not valid")) {
            throw new Error("Invalid API Key. Please check your API_KEY environment variable.");
        }
        if (error.message.toLowerCase().includes("quota") || (error as any)?.status === 429) {
             throw new Error("API quota exceeded. Please try again later or check your quota limits.");
        }
         throw new Error(`Failed to generate image: ${error.message}`);
    }
    throw new Error("An unknown error occurred while generating the image.");
  }
};