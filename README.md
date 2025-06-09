# Pixel Art Generator

Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## ✨ Features

*   Generate unique pixel art based on text prompts.
*   Simple and intuitive user interface.
*   Powered by Google's Gemini AI.

## 🚀 Tech Stack

*   React
*   TypeScript
*   Vite
*   Tailwind CSS (via CDN for development, consider integrating for production)
*   Google Gemini API

## 🛠️ Setup and Installation

**Prerequisites:**

*   Node.js (LTS version recommended)
*   npm (comes with Node.js)
*   A Google Gemini API Key

**Steps:**

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone https://github.com/daruoktab/pixel-art-generator.git
    cd pixel-art-generator
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Set up your API Key:**
    *   Create a file named `.env.local` in the root of the project.
    *   Add your Google Gemini API key to this file:
        ```env
        GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
        ```
    *   Replace `"YOUR_GEMINI_API_KEY"` with your actual API key.
    *   **Important:** The `.env.local` file is already in `.gitignore` to prevent your API key from being committed to the repository.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will start the app, typically at `http://localhost:5173`.

## 🎮 Usage

1.  Open the application in your browser (usually `http://localhost:5173` when running locally, or the GitHub Pages URL when deployed).
2.  Enter a text prompt describing the pixel art you want to generate (e.g., "a cute cat", "a futuristic cityscape").
3.  Click the "Generate" button.
4.  View the generated pixel art!

## Deployment

This project is configured for deployment to GitHub Pages.

1.  **Ensure your `vite.config.ts` has the correct `base` path:**
    ```typescript
    // vite.config.ts
    export default defineConfig(({ mode }) => {
      // ...
      return {
        base: '/pixel-art-generator/', // Or your repository name
        // ...
      };
    });
    ```

2.  **Ensure your `package.json` has the `homepage` and deploy scripts:**
    ```json
    // package.json
    {
      "name": "pixel-art-generator",
      "homepage": "https://<your-username>.github.io/<your-repository-name>",
      "scripts": {
        // ...
        "predeploy": "npm run build",
        "deploy": "gh-pages -d dist"
      }
      // ...
    }
    ```
    Replace `<your-username>` and `<your-repository-name>` with your actual GitHub username and repository name.

3.  **Build the project:**
    ```bash
    npm run build
    ```

4.  **Deploy to GitHub Pages:**
    ```bash
    npm run deploy
    ```
    This will push the contents of your `dist` folder to a `gh-pages` branch on your repository, which will then be served by GitHub Pages.

## 📄 License

Consider adding a license file (e.g., MIT, Apache 2.0) to your project and linking it here. For example:

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
