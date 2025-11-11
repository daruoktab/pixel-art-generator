interface GeneratedImage {
  imageDataUrl: string;
  altText: string;
}

// Determine the API endpoint based on environment
const getApiEndpoint = (): string => {
  // In production (GitHub Pages), use the deployed Vercel function
  if (window.location.hostname.includes("github.io")) {
    return "https://pixel-art-forge.vercel.app/api/generate-image";
  }
  // In development, use local Vercel dev server or relative path
  return "/api/generate-image";
};

export const generatePixelArtImage = async (
  prompt: string,
  aspectRatio: string,
): Promise<GeneratedImage> => {
  const fullPrompt = `Generate a pixel art image. The subject is: "${prompt}". Style: 8-bit retro game, detailed pixel illustration.`;

  try {
    const apiEndpoint = getApiEndpoint();

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        aspectRatio: aspectRatio,
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Unknown error" }));

      if (response.status === 429) {
        throw new Error(
          "API quota exceeded. Please try again later or check your quota limits.",
        );
      }

      if (response.status === 401 || response.status === 403) {
        throw new Error(
          "API authentication error. Please contact the site administrator.",
        );
      }

      throw new Error(
        `got status: ${response.status} . ${JSON.stringify(errorData)}`,
      );
    }

    const data = await response.json();

    if (data.imageUrl) {
      return {
        imageDataUrl: data.imageUrl,
        altText: `Pixel art for: ${prompt} (aspect ratio: ${aspectRatio})`,
      };
    } else {
      throw new Error("No image data received from the server.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred while generating the image.");
  }
};
