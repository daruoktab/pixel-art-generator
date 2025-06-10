# Pixel Art Generator

Run and deploy your AI Studio app

This contains everything you need to run your app locally.

## ✨ Features

*   Generate unique pixel art based on text prompts.
*   User authentication via Google Sign-In.
*   Daily image generation limit: 5 images per day for registered users.
*   Unlimited image generations for the admin user (`daruokta@gmail.com`).
*   Persistent quota tracking: Your daily count is remembered in your browser.
*   Simple and intuitive user interface.
*   Powered by Google's Gemini AI.

## 🚀 Tech Stack

*   React
*   TypeScript
*   Vite
*   Tailwind CSS
*   Firebase Authentication (for Google Sign-In)
*   `sql.js` (for client-side SQLite database)
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
2.  Log in using your Google account.
3.  Your remaining images for the day will be displayed.
4.  Enter a text prompt describing the pixel art you want to generate (e.g., "a cute cat", "a futuristic cityscape").
5.  Click the "Generate" button.
6.  View the generated pixel art!

## Image Quota and Data Persistence

*   Upon logging in, users are allocated a quota of 5 image generations per day.
*   This quota resets daily (based on the user's local system time when they next use the app).
*   The email `daruokta@gmail.com` has unlimited generation privileges.

To keep track of your daily image generations, the application uses a small SQLite database that runs directly in your web browser (thanks to `sql.js`). This database, including your email, the date of your last generation, and the number of images you've generated today, is stored locally in your browser's `localStorage`.

**Important Limitation:** Because the data is stored in your browser:
*   If you clear your browser's cache/data (specifically `localStorage` for this site), your quota information will be lost, and it will reset as if you are a new user for the day.
*   Your quota and usage history are specific to the browser you use. Switching to a different browser or device will not sync this information; each browser will have its own separate quota tracking.

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
    (The client-side database and quota system are fully compatible with this static deployment model.)

## 📄 License

Consider adding a license file (e.g., MIT, Apache 2.0) to your project and linking it here. For example:

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
