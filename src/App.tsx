import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generatePixelArtImage } from './services/geminiService';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import { getFirestore, doc, updateDoc, Timestamp, getDoc } from 'firebase/firestore';
import { app } from './firebaseConfig';

const db = getFirestore(app);

const isTimestampToday = (timestamp: Timestamp | null): boolean => {
  if (!timestamp) return false;
  const dateFromTimestamp = timestamp.toDate();
  const today = new Date();
  return (
    dateFromTimestamp.getFullYear() === today.getFullYear() &&
    dateFromTimestamp.getMonth() === today.getMonth() &&
    dateFromTimestamp.getDate() === today.getDate()
  );
};

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
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${className}`}>
    <path fillRule="evenodd" d="M9.502 2.061a.5.5 0 0 0-.866.354L7.319 6.5H3.112a.5.5 0 0 0-.362.833l3.32 2.857-1.45 4.026a.5.5 0 0 0 .603.603L9.5 12.51l4.277 2.309a.5.5 0 0 0 .603-.603l-1.45-4.026 3.32-2.857a.5.5 0 0 0-.362-.833H12.68l-1.319-4.086a.5.5 0 0 0-.86-.353ZM10 7.5a.5.5 0 0 0 .5-.5V3.515l.939 2.913A.5.5 0 0 0 11.893 7H14.5l-2.365 2.03a.5.5 0 0 0-.17.484l1.033 2.865-3.046-1.64a.5.5 0 0 0-.454 0L6.453 12.38l1.033-2.865a.5.5 0 0 0-.17-.484L5.002 7H7.107a.5.5 0 0 0 .454-.722L8.5 3.516V7a.5.5 0 0 0 .5.5Z" clipRule="evenodd" />
    <path d="M12.528 8.528a.5.5 0 0 0-.707-.707L10 9.646l-1.821-1.821a.5.5 0 0 0-.707.707L9.293 10.354l-1.821 1.821a.5.5 0 1 0 .707.707L10 11.061l1.821 1.821a.5.5 0 0 0 .707-.707L10.707 10.354l1.821-1.821Z" />
  </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${className}`}>
    <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v6.19l1.72-1.72a.75.75 0 111.06 1.06l-3 3a.75.75 0 01-1.06 0l-3-3a.75.75 0 111.06-1.06l1.72 1.72V3.75A.75.75 0 0110 3zM3.75 13a.75.75 0 000 1.5h12.5a.75.75 0 000-1.5H3.75z" clipRule="evenodd" />
  </svg>
);

const ImagePlaceholder: React.FC = () => (
  <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-700 bg-[#1a1a2e] p-6 text-center min-h-[300px] md:min-h-0">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <p className="text-gray-500 text-sm">Your masterpiece awaits!</p>
    <p className="text-xs text-gray-600 mt-1">Describe your vision and click "Forge Pixel Art!"</p>
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
  const { currentUser, loading: authLoading, error: authError, logout, refreshUserQuota } = useAuth();
  const [showLoginPage, setShowLoginPage] = useState<boolean>(true);

  const [prompt, setPrompt] = useState<string>('');
  const [selectedRatio, setSelectedRatio] = useState<string>(ASPECT_RATIOS[0].value);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false); // Image generation loading
  const [appError, setAppError] = useState<string | null>(null); // Specific app errors
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (currentUser?.uid) { // check for uid to be more specific
      refreshUserQuota();
    }
    // Clear app-specific errors when auth state (currentUser) might change
    setAppError(null);
  }, [currentUser?.uid, refreshUserQuota]); // Added refreshUserQuota to dependencies

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
      setAppError("You must be logged in to generate images."); // Should ideally not happen if UI is correct
      return;
    }

    setIsLoading(true);
    setAppError(null); // Clear previous app-specific errors at the start of a new attempt

    const userDocRef = doc(db, 'users', currentUser.uid);

    try {
      if (currentUser.email === 'daruokta@gmail.com') {
        const result = await generatePixelArtImage(prompt, selectedRatio);
        setGeneratedImage(result.imageDataUrl);
        // No need to call setIsLoading(false) here, it's in finally
        return; // Bypass quota logic for special user
      }

      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
          setAppError("Your user profile was not found in the database. Please try logging out and in again.");
          // No need to call setIsLoading(false) here, it's in finally
          return;
      }

      let { imageQuota, lastGeneratedDate } = userDocSnap.data() as { imageQuota: number, lastGeneratedDate: Timestamp | null };

      // Check for daily reset if not already handled by AuthContext or if generation is first of the day
      if (lastGeneratedDate && !isTimestampToday(lastGeneratedDate)) {
        imageQuota = 5;
      }

      if (imageQuota > 0) {
        const result = await generatePixelArtImage(prompt, selectedRatio);
        setGeneratedImage(result.imageDataUrl);

        await updateDoc(userDocRef, {
          imageQuota: imageQuota - 1,
          lastGeneratedDate: Timestamp.now()
        });
        await refreshUserQuota(); // Refresh AuthContext state
      } else {
        setAppError("You have reached your daily image generation limit (5 images). Please try again tomorrow.");
        setGeneratedImage(null);
      }
    } catch (err) {
      console.error("Error in handleGenerateImage:", err);
      if (err instanceof Error) {
        // Check for common user-facing Gemini API errors or specific messages
        if (err.message.includes("API key not valid")) {
            setAppError("The Pixel Art service is currently unavailable (API Key issue). Please notify the site administrator.");
        } else if (err.message.includes("quota") || err.message.includes("billing")) {
            setAppError("The Pixel Art service quota has been exceeded. Please notify the site administrator.");
        } else if (err.message.includes("Firestore") || err.message.includes("database")) {
            setAppError("A database error occurred while updating your quota. Please try again. If it persists, contact support.");
        } else {
            // Generic error from generatePixelArtImage or other unexpected errors
            setAppError(err.message || "An unexpected error occurred while generating your masterpiece. Please try again.");
        }
      } else {
        setAppError("An unknown error occurred during image generation. Please try again.");
      }
      setGeneratedImage(null);
    } finally {
      setIsLoading(false); // Ensure loading is always reset
    }
  }, [prompt, selectedRatio, currentUser, refreshUserQuota]);

  const handleDownload = useCallback((format: 'png' | 'jpeg') => {
    if (!generatedImage) return;
    setAppError(null); // Clear errors before attempting download
    const filename = `pixel-art-${Date.now()}.${format}`;
    if (format === 'png') {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'jpeg') {
      try {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0,0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.9);
            const link = document.createElement('a');
            link.href = jpegDataUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          } else {
              setAppError("Could not prepare image for JPG download. Canvas context unavailable.");
          }
        };
        img.onerror = () => {
          setAppError("Could not load image for JPG conversion. Please ensure the image displayed correctly.");
        };
        img.src = generatedImage; // Make sure this is the last step for img setup
      } catch (e) {
        console.error("Error during JPG conversion:", e);
        setAppError("An unexpected error occurred while preparing your JPG download.");
      }
    }
  }, [generatedImage]);

  const handleClear = () => {
    setGeneratedImage(null);
    setAppError(null); // Also clear any app-specific errors
    setPrompt('');
  };

  // Show global auth loading spinner ONLY if not yet authenticated (no currentUser)
  // Once currentUser is set, AuthProvider's loading state might still change (e.g. during quota refresh)
  // but we don't want to overlay the whole app.
  if (authLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center">
        <LoadingSpinner />
        <p className="text-[#f0a500] text-sm mt-2">Initializing...</p>
      </div>
    );
  }

  if (!currentUser) {
    // LoginPage and SignupPage internally use useAuth() and can display authError.
    // However, if there's a persistent authError (e.g. from AuthContext's onAuthStateChanged issues),
    // displaying it here can be a fallback.
    return (
        <>
            {showLoginPage ?
                <LoginPage /> :
                <SignupPage />
            }
            {/* Global/fallback auth error display if not handled by login/signup pages */}
            {authError && (
                 <div className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-md z-20 p-2">
                    <ErrorMessage message={`Authentication Error: ${authError}`} />
                 </div>
            )}
            <div className="fixed bottom-4 right-4 text-center z-10">
                <button
                    onClick={() => { setAppError(null); setShowLoginPage(!showLoginPage); }}
                    className="text-sm text-[#f0a500] hover:underline p-2 bg-[#2a2a3e] rounded shadow-lg"
                >
                    {showLoginPage ? "Need an account? Sign Up" : "Already have an account? Login"}
                </button>
            </div>
        </>
    );
  }

  // Authenticated View
  return (
    <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-4 selection:bg-[#f0a500] selection:text-[#1a1a2e]">
      <div className="w-full md:max-w-4xl lg:max-w-5xl bg-[#2a2a3e] p-6 md:p-8 shadow-2xl border-4 border-[#0f0f1a] md:flex md:gap-6 lg:gap-8">
        <div className="md:w-2/5 flex flex-col">
          <header className="text-center mb-6">
            <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-gray-400 truncate" title={currentUser.email || undefined}>Logged in as: {currentUser.email}</p>
                <button
                    onClick={() => { setAppError(null); logout(); }}
                    className="text-xs text-[#f0a500] hover:underline"
                    disabled={isLoading} // Disable logout if image generation is in progress
                >
                    Logout
                </button>
            </div>
            <div className="text-xs text-gray-500 mb-2 h-4">
              {currentUser.email === 'daruokta@gmail.com' ? (
                <p className="text-green-400">Unlimited Image Generations</p>
              ) : (
                <p>Images remaining today: {currentUser.imageQuota ?? 'Loading...'}</p>
              )}
            </div>
            <h1 className="text-3xl md:text-3xl font-bold text-[#f0a500] tracking-wider">
              Pixel Art<span className="text-[#e0e0e0]">Forge</span>
            </h1>
            <p className="text-xs text-gray-400 mt-2">Craft 8-bit wonders with your words!</p>
          </header>

          {/* Display App-specific errors first, then fallback to general auth errors if no appError */}
          {appError && <ErrorMessage message={appError} />}
          {!appError && authError && <ErrorMessage message={`Notice: ${authError}`} />}


          <div className="mb-5">
            <label htmlFor="prompt" className="block text-sm text-gray-300 mb-2">
              Describe your vision:
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => { setPrompt(e.target.value); setAppError(null); }}
              placeholder="e.g., a knight fighting a dragon, cat wizard..."
              rows={3}
              className="w-full p-3 bg-[#1a1a2e] border-2 border-[#0f0f1a] text-gray-200 focus:border-[#f0a500] focus:ring-0 outline-none resize-none text-sm placeholder-gray-500"
              disabled={isLoading}
              aria-label="Prompt for pixel art generation"
            />
          </div>

          <div className="mb-5">
            <label className="block text-sm text-gray-300 mb-2">Aspect Ratio:</label>
            <div className="flex flex-wrap gap-2 items-center">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => { setSelectedRatio(ratio.value); setAppError(null); }}
                  disabled={isLoading}
                  className={`px-3 py-2 border-2 text-xs
                              ${selectedRatio === ratio.value ? 'bg-[#f0a500] text-[#1a1a2e] border-[#f0a500]' : 'bg-[#1a1a2e] text-gray-300 border-[#0f0f1a] hover:border-[#f0a500] hover:text-[#f0a500]'}
                              disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 ease-in-out`}
                  aria-pressed={selectedRatio === ratio.value}
                  aria-label={`Aspect ratio ${ratio.label}`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              (Note: The AI will attempt to generate an image with this aspect ratio.)
            </p>
          </div>

          <button
            onClick={handleGenerateImage}
            disabled={isLoading || (currentUser.email !== 'daruokta@gmail.com' && currentUser.imageQuota === 0)}
            className="w-full bg-[#f0a500] text-[#1a1a2e] py-3 px-4 text-base font-bold hover:bg-yellow-400 transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 group mt-auto"
            aria-label="Generate Pixel Art"
          >
            {isLoading && !generatedImage ? (
              <LoadingSpinner />
            ) : (
              <>
                <MagicWandIcon className={`${isLoading ? 'animate-pulse' : 'group-hover:animate-ping'} transition-transform duration-300`} />
                <span>{isLoading ? 'Updating Art...' : 'Forge Pixel Art!'}</span>
              </>
            )}
          </button>
           {currentUser.email !== 'daruokta@gmail.com' && currentUser.imageQuota === 0 && !isLoading && (
            <p className="text-xs text-yellow-500 text-center mt-2">
                You've used all your generations for today. Come back tomorrow!
            </p>
          )}
        </div>

        <div className="md:w-3/5 mt-8 md:mt-0 flex flex-col items-center justify-center">
          {generatedImage ? (
            <div className="w-full p-1 border-2 border-[#0f0f1a] bg-[#1a1a2e] flex flex-col items-center">
              <h2 className="text-lg text-center text-[#f0a500] my-3">Your Masterpiece!</h2>
              <div className="flex justify-center items-center bg-black bg-opacity-20 p-2 w-full max-h-[45vh] md:max-h-[55vh] lg:max-h-[calc(100vh-280px)] overflow-hidden">
                <img
                  ref={imageRef}
                  src={generatedImage}
                  alt={prompt ? `Generated pixel art for: ${prompt}` : 'Generated pixel art'}
                  className="max-w-full max-h-full object-contain shadow-lg border-2 border-gray-700 pixelated-image"
                />
              </div>
              <button
                  onClick={handleClear}
                  className="mt-3 w-full bg-red-600 text-white py-2 px-3 text-xs hover:bg-red-700 transition-colors duration-150 ease-in-out"
                  aria-label="Clear generated image and start anew"
              >
                  Clear Image & Start Anew
              </button>
              <div className="mt-2 w-full flex gap-2">
                   <button
                      onClick={() => handleDownload('png')}
                      className="flex-1 bg-green-600 text-white py-2 px-3 text-xs hover:bg-green-700 transition-colors duration-150 ease-in-out flex items-center justify-center space-x-1"
                      aria-label="Download image as PNG"
                  >
                      <DownloadIcon />
                      <span>Download PNG</span>
                  </button>
                   <button
                      onClick={() => handleDownload('jpeg')}
                      className="flex-1 bg-green-700 text-white py-2 px-3 text-xs hover:bg-green-800 transition-colors duration-150 ease-in-out flex items-center justify-center space-x-1"
                      aria-label="Download image as JPG"
                  >
                      <DownloadIcon />
                      <span>Download JPG</span>
                  </button>
              </div>
            </div>
          ) : isLoading ? (
             <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-700 bg-[#1a1a2e] p-6 text-center min-h-[300px] md:min-h-0">
                <LoadingSpinner />
                <p className="text-[#f0a500] text-sm mt-3">Conjuring Pixels...</p>
             </div>
          ) : (
            <ImagePlaceholder />
          )}
        </div>
      </div>
      <footer className="text-center text-xs text-gray-500 mt-6 pb-4">
        <p>Powered by Google Gemini & Imagen. Font: Press Start 2P.</p>
        <p>Ensure your <code className="bg-gray-700 px-1 rounded-sm">API_KEY</code> is set in your environment.</p>
      </footer>
    </div>
  );
};

export default App;
