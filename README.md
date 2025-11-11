# 🎨 Pixel Art Generator

Create stunning retro 8-bit pixel art using AI! Powered by Google's Gemini Imagen API with a secure backend architecture.

**Live Demo:** https://daruoktab.github.io/pixel-art-generator

## ✨ Features

*   🎨 Generate unique pixel art based on text prompts
*   🔐 User authentication via Google Sign-In
*   📊 Daily image generation limit: 5 images per day for registered users
*   ⭐ Unlimited image generations for designated admin user
*   💾 Persistent quota tracking stored in your browser
*   🖼️ Multiple aspect ratio options (1:1, 16:9, 9:16, 4:3, 3:4)
*   📥 Download generated images as PNG or JPEG
*   🎮 Simple and intuitive retro-styled interface
*   🔒 Secure backend API - API keys never exposed to clients

## 🚀 Tech Stack

### Frontend
*   React 19
*   TypeScript
*   Vite
*   Tailwind CSS
*   Firebase Authentication (Google Sign-In)
*   `sql.js` (client-side SQLite database for quota tracking)

### Backend
*   Vercel Serverless Functions
*   Google Gemini Imagen API (`imagen-4.0-fast-generate-001`)

## 🏗️ Architecture

```
User Browser (GitHub Pages)
    ↓
Frontend React App
    ↓
Vercel Serverless Function (Backend API)
    ↓
Google Gemini Imagen API
```

**Security:** The API key is stored securely on Vercel's servers and never exposed in client-side code.

## 🛠️ Setup and Installation

### Prerequisites

*   Node.js (LTS version recommended)
*   npm or yarn
*   A Google Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))
*   Vercel account (free tier works!)
*   Firebase project for authentication

### Local Development Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/daruoktab/pixel-art-generator.git
    cd pixel-art-generator
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    
    Create a `.env.local` file in the root directory:
    ```env
    GEMINI_API_KEY="your-gemini-api-key-here"
    VITE_GOOGLE_CLIENT_ID="your-firebase-google-client-id"
    VITE_ADMIN_EMAIL="your-admin-email@example.com"
    ```

4.  **Configure Firebase:**
    
    Update `src/firebaseConfig.ts` with your Firebase project credentials.

5.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:5173`

### Backend Setup (Vercel)

1.  **Install Vercel CLI:**
    ```bash
    npm install -g vercel
    ```

2.  **Login to Vercel:**
    ```bash
    vercel login
    ```

3.  **Deploy the backend:**
    ```bash
    vercel --prod
    ```

4.  **Add environment variables to Vercel:**
    
    Go to your Vercel dashboard → Project Settings → Environment Variables
    
    Add:
    - **Name:** `GEMINI_API_KEY`
    - **Value:** Your Google Gemini API key
    - **Environment:** Production, Preview, Development

5.  **Disable deployment protection:**
    
    Go to Settings → Deployment Protection → Disable "Vercel Authentication" for Production

6.  **Get your API URL:**
    
    Your backend will be at: `https://your-project.vercel.app`

7.  **Update frontend API endpoint:**
    
    In `services/geminiService.ts`, update the API endpoint to your Vercel URL.

## 🚢 Deployment

### Deploy Frontend to GitHub Pages

```bash
npm run deploy
```

This will build and deploy your frontend to GitHub Pages.

### Deploy Backend to Vercel

```bash
vercel --prod --yes
```

This deploys the serverless function that handles API requests securely.

## 🎮 Usage

1.  Visit the live site: https://daruoktab.github.io/pixel-art-generator
2.  Click "Sign in with Google" and authenticate
3.  Your remaining daily images will be displayed (5 per day for regular users)
4.  Enter a text prompt (e.g., "a pixel art dragon", "retro game character")
5.  Select your desired aspect ratio
6.  Click "Forge Pixel Art!" and wait for the magic ✨
7.  Download your creation as PNG or JPEG!

## 📊 Image Quota System

*   **Regular Users:** 5 image generations per day
*   **Admin User:** Unlimited generations (configured via `VITE_ADMIN_EMAIL`)
*   **Data Storage:** Quota tracking uses SQLite in browser's localStorage
*   **Reset Time:** Quotas reset daily at midnight (local time)

**Note:** Quota data is browser-specific. Clearing browser data will reset your quota tracking.

## 🔒 Security Features

*   ✅ API keys stored securely on backend (never exposed to clients)
*   ✅ CORS configured for cross-origin requests
*   ✅ Firebase Authentication for user management
*   ✅ `.env.local` files excluded from version control
*   ✅ No sensitive data in client-side code

## 📁 Project Structure

```
pixel-art-generator/
├── api/                      # Vercel serverless functions
│   └── generate-image.ts     # Backend API endpoint
├── src/                      # Frontend React app
│   ├── components/           # React components
│   ├── contexts/             # React contexts (Auth)
│   ├── App.tsx               # Main app component
│   └── firebaseConfig.ts     # Firebase configuration
├── services/                 # API service layer
│   └── geminiService.ts      # Frontend API client
├── public/                   # Static assets
├── vercel.json               # Vercel configuration
├── vite.config.ts            # Vite configuration
├── package.json              # Dependencies and scripts
└── .env.local                # Environment variables (not committed)
```

## 🔧 Configuration Files

### `vercel.json`
Configures Vercel serverless functions, CORS headers, and routing.

### `vite.config.ts`
Vite build configuration for GitHub Pages deployment.

### `.env.local`
Local environment variables (create this file yourself, it's gitignored).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 🐛 Troubleshooting

### "Failed to fetch" error
- Ensure Vercel deployment protection is disabled for production
- Check that CORS headers are configured in `vercel.json`
- Verify your backend is deployed and accessible

### Images not generating
- Check Vercel logs for backend errors
- Verify your Gemini API key is valid and has quota
- Ensure environment variables are set correctly in Vercel

### Quota not tracking
- Check browser console for errors
- Ensure localStorage is enabled in your browser
- Clear site data and try logging in again

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

*   Powered by [Google Gemini AI](https://ai.google.dev/)
*   Font: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P)
*   Deployed on [Vercel](https://vercel.com) and [GitHub Pages](https://pages.github.com/)

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ and pixels**