import React, { useState, useEffect, useCallback, useRef } from "react";
import { generatePixelArtImage } from "../services/geminiService.ts";
import { useAuth } from "./contexts/AuthContext.tsx";
import LoginPage from "./components/auth/LoginPage.tsx";

const LoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center space-y-2">
    <div className="w-8 h-8 border-2 border-t-transparent border-[#1a1a2e] rounded-full animate-spin"></div>
  </div>
);

interface ErrorMessageProps {
  message: string;
}
const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => (
  <div className="bg-red-700 border-2 border-red-900 p-3 my-4 text-white text-xs shadow-lg w-full">
    <p className="font-bold text-center uppercase tracking-wider">Error!</p>
    <p className="text-center mt-1">{message}</p>
  </div>
);

const MagicWandIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={`w-5 h-5 ${className}`}
  >
    <path
      fillRule="evenodd"
      d="M9.502 2.061a.5.5 0 0 0-.866.354L7.319 6.5H3.112a.5.5 0 0 0-.362.833l3.32 2.857-1.45 4.026a.5.5 0 0 0 .603.603L9.5 12.51l4.277 2.309a.5.5 0 0 0 .603-.603l-1.45-4.026 3.32-2.857a.5.5 0 0 0-.362-.833H12.68l-1.319-4.086a.5.5 0 0 0-.86-.353ZM10 7.5a.5.5 0 0 0 .5-.5V3.515l.939 2.913A.5.5 0 0 0 11.893 7H14.5l-2.365 2.03a.5.5 0 0 0-.17.484l1.033 2.865-3.046-1.64a.5.5 0 0 0-.454 0L6.453 12.38l1.033-2.865a.5.5 0 0 0-.17-.484L5.002 7H7.107a.5.5 0 0 0 .454-.722L8.5 3.516V7a.5.5 0 0 0 .5.5Z"
      clipRule="evenodd"
    />
    <path d="M12.528 8.528a.5.5 0 0 0-.707-.707L10 9.646l-1.821-1.821a.5.5 0 0 0-.707.707L9.293 10.354l-1.821 1.821a.5.5 0 1 0 .707.707L10 11.061l1.821 1.821a.5.5 0 0 0 .707-.707L10.707 10.354l1.821-1.821Z" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={`w-4 h-4 ${className}`}
  >
    <path
      fillRule="evenodd"
      d="M10 3a.75.75 0 01.75.75v6.19l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l1.72 1.72V3.75A.75.75 0 0110 3zM3.75 13a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H3.75z"
      clipRule="evenodd"
    />
  </svg>
);

const ImagePlaceholder: React.FC = () => (
  <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-700 bg-[#1a1a2e] p-8 text-center min-h-[250px] sm:min-h-[300px] md:min-h-[350px] lg:min-h-[400px] rounded-lg">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-16 w-16 text-gray-500 mb-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
    <h3 className="text-xl text-gray-300 mb-2">Your masterpiece awaits!</h3>
    <p className="text-sm text-gray-500 px-4">
      Describe your vision on the left and click "Forge Pixel Art!"
    </p>
  </div>
);

const ASPECT_RATIOS = [
  { value: "1:1", label: "1:1 (Square)" },
  { value: "16:9", label: "16:9 (Wide)" },
  { value: "4:3", label: "4:3 (Classic)" },
  { value: "9:16", label: "9:16 (Tall)" },
  { value: "3:4", label: "3:4 (Portrait)" },
];

const App: React.FC = () => {
  const {
    currentUser,
    loading: authLoading,
    error: authError,
    logout,
    decrementQuota,
  } = useAuth();
  const [prompt, setPrompt] = useState<string>("");
  const [selectedRatio, setSelectedRatio] = useState<string>(
    ASPECT_RATIOS[0].value,
  );
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Image generation loading
  const [appError, setAppError] = useState<string | null>(null); // Specific app errors
  const imageRef = useRef<HTMLImageElement>(null);

  // Add a state to explicitly track if the initial auth check is complete
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] =
    useState<boolean>(false);

  useEffect(() => {
    if (!authLoading) {
      setInitialAuthCheckComplete(true);
    }
  }, [authLoading]);

  useEffect(() => {
    // Quota is now handled by AuthContext on login/state change
    setAppError(null);
  }, [currentUser?.uid]);

  // Display auth errors from context if they exist, prioritizing appError if both are set
  useEffect(() => {
    if (authError) {
      setAppError(authError); // Or decide on a more sophisticated merging strategy
    }
  }, [authError]);

  const handleGenerateImage = useCallback(async () => {
    if (!prompt.trim()) {
      setAppError("Prompt cannot be empty, brave artist!");
      return;
    }
    if (!currentUser) {
      setAppError("You must be logged in to generate images.");
      return;
    }

    setIsLoading(true);
    setAppError(null);

    try {
      if (currentUser.email === "daruokta@gmail.com") {
        const result = await generatePixelArtImage(prompt, selectedRatio); // Use selectedRatio
        setGeneratedImage(result.imageDataUrl);
        setIsLoading(false);
        return;
      }

      if (currentUser.imageQuota > 0) {
        const result = await generatePixelArtImage(prompt, selectedRatio); // Use selectedRatio
        setGeneratedImage(result.imageDataUrl);
        await decrementQuota();
      } else {
        setAppError(
          "You have reached your daily image generation limit (5 images). Please try again tomorrow.",
        );
        setGeneratedImage(null);
      }
    } catch (err) {
      console.error("Error in handleGenerateImage:", err);
      if (err instanceof Error) {
        // Check for common user-facing Gemini API errors or specific messages
        if (err.message.includes("API key not valid")) {
          setAppError(
            "The Pixel Art service is currently unavailable (API Key issue). Please notify the site administrator.",
          );
        } else if (
          err.message.includes("quota") ||
          err.message.includes("billing")
        ) {
          setAppError(
            "The Pixel Art service quota has been exceeded. Please notify the site administrator.",
          );
        } else if (
          err.message.includes("Firestore") ||
          err.message.includes("database")
        ) {
          setAppError(
            "A database error occurred while updating your quota. Please try again. If it persists, contact support.",
          );
        } else {
          // Generic error from generatePixelArtImage or other unexpected errors
          setAppError(
            err.message ||
              "An unexpected error occurred while generating your masterpiece. Please try again.",
          );
        }
      } else {
        setAppError(
          "An unknown error occurred during image generation. Please try again.",
        );
      }
      setGeneratedImage(null);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, selectedRatio, currentUser, decrementQuota]); // Added selectedRatio to dependencies

  const handleDownload = useCallback(
    (format: "png" | "jpeg") => {
      if (!generatedImage) return;
      setAppError(null); // Clear errors before attempting download
      const filename = `pixel-art-${Date.now()}.${format}`;
      if (format === "png") {
        const link = document.createElement("a");
        link.href = generatedImage;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (format === "jpeg") {
        try {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#FFFFFF";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.9);
              const link = document.createElement("a");
              link.href = jpegDataUrl;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } else {
              setAppError(
                "Could not prepare image for JPG download. Canvas context unavailable.",
              );
            }
          };
          img.onerror = () => {
            setAppError(
              "Could not load image for JPG conversion. Please ensure the image displayed correctly.",
            );
          };
          img.src = generatedImage; // Make sure this is the last step for img setup
        } catch (e) {
          console.error("Error during JPG conversion:", e);
          setAppError(
            "An unexpected error occurred while preparing your JPG download.",
          );
        }
      }
    },
    [generatedImage],
  );

  const handleClear = () => {
    setGeneratedImage(null);
    setAppError(null); // Also clear any app-specific errors
    setPrompt("");
  };

  // Show global auth loading spinner ONLY if not yet authenticated (no currentUser)
  // Once currentUser is set, AuthProvider's loading state might still change (e.g. during quota refresh)
  // but we don't want to overlay the whole app.
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f1b] text-[#e0e0e0] flex flex-col items-center justify-center p-4 font-press-start">
        <LoadingSpinner />
        <p className="mt-4 text-lg">Loading Authentication...</p>
      </div>
    );
  }

  // Wait for the initial auth check to complete before deciding to show login/signup or app
  if (!initialAuthCheckComplete) {
    return (
      <div className="min-h-screen bg-[#0f0f1b] text-[#e0e0e0] flex flex-col items-center justify-center p-4 font-press-start">
        <LoadingSpinner />
        <p className="mt-4 text-lg">Initializing...</p>
      </div>
    ); // Or some other placeholder
  }

  if (!currentUser) {
    return <LoginPage />; // Removed onSwitchToSignup prop
  }

  // Authenticated View
  return (
    <>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col md:flex-row items-start p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 gap-4 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12 justify-center">
        {/* Left Column: Controls */}
        <div className="w-full md:w-2/5 max-w-xl space-y-6">
          {" "}
          {/* Added space-y-6 for consistent vertical spacing */}
          <header className="text-center">
            {" "}
            {/* Removed mb-6, handled by parent space-y */}
            <div className="flex justify-between items-center mb-3">
              {" "}
              {/* Increased mb-1 to mb-3 */}
              <p
                className="text-xs text-gray-400 truncate"
                title={currentUser.email || undefined}
              >
                Logged in as: {currentUser.email}
              </p>
              <button
                type="button"
                onClick={() => {
                  setAppError(null);
                  logout();
                }}
                className="text-xs text-[#f0a500] hover:underline"
                disabled={isLoading}
              >
                Logout
              </button>
            </div>
            <div className="text-xs text-gray-500 mb-4 h-auto">
              {" "}
              {/* Increased mb-2 to mb-4, h-4 to h-auto */}
              {currentUser.email === "daruokta@gmail.com" ? (
                <p className="text-green-400">Unlimited Image Generations</p>
              ) : (
                <p>
                  Images remaining today:{" "}
                  {currentUser.imageQuota ?? "Loading..."}
                </p>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#f0a500] tracking-wider mb-1">
              {" "}
              {/* Added mb-1 */}
              Pixel Art<span className="text-[#e0e0e0]">Forge</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Craft 8-bit wonders with your words!
            </p>{" "}
            {/* Adjusted mt-2 to mt-1 */}
          </header>
          {/* Wrapped error messages for spacing and conditional rendering */}
          {(appError || authError) && (
            <div className="my-2">
              {" "}
              {/* Adjusted margin for error messages */}
              {appError && <ErrorMessage message={appError} />}
              {!appError && authError && (
                <ErrorMessage message={`Notice: ${authError}`} />
              )}
            </div>
          )}
          <div className="space-y-2">
            {" "}
            {/* Removed mb-5, parent space-y-6 handles it. Added internal space-y-2 */}
            <label htmlFor="prompt" className="block text-sm text-gray-300">
              {" "}
              {/* Removed mb-2 */}
              Describe your vision:
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setAppError(null);
              }}
              placeholder="e.g., a knight fighting a dragon, cat wizard..."
              rows={3}
              className="w-full p-3 bg-[#1a1a2e] border-2 border-[#0f0f1a] text-gray-200 focus:border-[#f0a500] focus:ring-0 outline-none resize-none text-sm placeholder-gray-500"
              disabled={isLoading}
              aria-label="Prompt for pixel art generation"
            />
          </div>
          <div className="space-y-2">
            {" "}
            {/* Removed mb-5, parent space-y-6 handles it. Added internal space-y-2 */}
            <label className="block text-sm text-gray-300">
              Select Aspect Ratio:
            </label>{" "}
            {/* Removed mb-2 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  type="button" // Ensure type is explicitly button
                  onClick={() => setSelectedRatio(ratio.value)}
                  className={`px-2 py-1.5 sm:px-2.5 sm:py-2 text-[10px] sm:text-xs rounded-md transition-all duration-150 ease-in-out
                    ${
                      selectedRatio === ratio.value
                        ? "bg-purple-600 text-white ring-2 ring-purple-400"
                        : "bg-[#1a1a2e] hover:bg-purple-500 hover:text-white"
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={isLoading}
                  aria-pressed={
                    selectedRatio === ratio.value ? "true" : "false"
                  } // Corrected aria-pressed
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerateImage}
            disabled={
              isLoading ||
              (currentUser.email !== "daruokta@gmail.com" &&
                currentUser.imageQuota === 0)
            }
            {...(isLoading
              ? { "aria-pressed": "true" }
              : { "aria-pressed": "false" })}
            className="w-full px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg bg-purple-600 hover:bg-purple-700 rounded-md font-semibold shadow-md transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            aria-label="Generate Pixel Art"
          >
            {isLoading && !generatedImage ? (
              <LoadingSpinner />
            ) : (
              <>
                <MagicWandIcon
                  className={`${isLoading ? "animate-pulse" : "group-hover:animate-ping"} transition-transform duration-300`}
                />
                <span className="ml-2">Forge Pixel Art!</span>
              </>
            )}
          </button>
          {currentUser.email !== "daruokta@gmail.com" &&
            currentUser.imageQuota === 0 &&
            !isLoading && (
              <p className="text-xs text-yellow-500 text-center mt-3">
                {" "}
                {/* Increased mt-2 to mt-3 */}
                You've used all your generations for today. Come back tomorrow!
              </p>
            )}
        </div>

        {/* Right Column: Image Display */}
        <div className="w-full md:w-3/5 max-w-2xl flex flex-col items-center justify-start md:pt-0">
          {" "}
          {/* Removed mt-8 for mobile */}
          {generatedImage ? (
            <div className="w-full p-2 sm:p-3 md:p-4 border-2 border-[#0f0f1a] bg-[#1a1a2e] flex flex-col items-center sticky top-10 rounded-lg">
              {" "}
              {/* Added p-2, rounded-lg */}
              <h2 className="text-lg text-center text-[#f0a500] my-4">
                Your Masterpiece!
              </h2>
              <div className="flex justify-center items-center bg-black bg-opacity-20 p-2 sm:p-3 w-full max-h-[60vh] md:max-h-[70vh] overflow-hidden rounded">
                {" "}
                {/* Added p-3, rounded */}
                <img
                  ref={imageRef}
                  src={generatedImage}
                  alt={
                    prompt
                      ? `Generated pixel art for: ${prompt}`
                      : "Generated pixel art"
                  }
                  className="max-w-full max-h-full object-contain shadow-lg border-2 border-gray-700 pixelated-image"
                />
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="mt-4 w-full bg-red-600 text-white px-3 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm hover:bg-red-700 transition-colors duration-150 ease-in-out rounded-md" /* Adjusted styles */
                aria-label="Clear generated image and start anew"
              >
                Clear Image & Start Anew
              </button>
              <div className="mt-3 w-full flex gap-2 sm:gap-3">
                {" "}
                {/* Increased mt-2 to mt-3, gap-2 to gap-3 */}
                <button
                  onClick={() => handleDownload("png")}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-2.5 py-2 text-xs sm:px-3 sm:py-2.5 sm:text-sm transition-colors duration-150 ease-in-out flex items-center justify-center gap-1.5 rounded-md" /* Adjusted styles */
                  aria-label="Download as PNG"
                >
                  <DownloadIcon /> PNG
                </button>
                <button
                  onClick={() => handleDownload("jpeg")}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-2 text-xs sm:px-3 sm:py-2.5 sm:text-sm transition-colors duration-150 ease-in-out flex items-center justify-center gap-1.5 rounded-md" /* Adjusted styles */
                  aria-label="Download as JPG"
                >
                  <DownloadIcon /> JPG
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-700 bg-[#1a1a2e] p-8 text-center min-h-[250px] sm:min-h-[300px] md:min-h-[350px] lg:min-h-[400px] sticky top-10 rounded-lg">
              {" "}
              {/* Added p-8, rounded-lg */}
              <LoadingSpinner />
              <p className="mt-3 text-sm text-gray-400">
                Forging your vision...
              </p>{" "}
              {/* Increased mt-2 to mt-3 */}
            </div>
          ) : (
            <div className="sticky top-10 w-full">
              <ImagePlaceholder />{" "}
              {/* Placeholder min-height is adjusted in its own component definition if needed, or here if direct styling */}
            </div>
          )}
        </div>
      </div>
      <footer className="text-center text-xs text-gray-500 py-6 sm:py-8">
        {" "}
        {/* Changed mt-6 pb-4 to py-8 */}
        <p className="mb-1">
          Powered by Google Gemini & Imagen. Font: Press Start 2P.
        </p>{" "}
        {/* Added mb-1 */}
        <p>Secure backend powered by Vercel. API keys are never exposed.</p>
      </footer>
    </>
  );
};

export default App;
