import initSqlJs, { type Database } from 'sql.js';

const DB_STORAGE_KEY = 'pixelArtGeneratorDb';
let db: Database | null = null;

export async function saveDb(dbInstance: Database | null): Promise<void> {
  if (!dbInstance) {
    console.error("saveDb: Called with null dbInstance. Cannot save."); // Changed from warn to error
    throw new Error("saveDb: Called with null dbInstance. Cannot save.");
  }
  try {
    const binaryArray = dbInstance.export();
    // Convert Uint8Array to regular array of numbers for JSON stringification
    const array = Array.from(binaryArray);
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(array));
    console.log('Database saved to localStorage.');
  } catch (error: any) { // Added :any to access error.message
    console.error('Failed to save database to localStorage:', error);
    throw new Error(`Failed to save database to localStorage: ${error.message}`);
  }
}

export async function initDb(): Promise<Database> {
  if (db) {
    return db;
  }

  const SQL = await initSqlJs({
    locateFile: file => {
      // Ensure BASE_URL ends with a slash if it's not just '/'
      const baseUrl = import.meta.env.BASE_URL;
      const path = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
      console.log(`AuthContext: locateFile path for ${file}: ${path}${file}`);
      return `${path}${file}`;
    }
  });

  try {
    const storedDbString = localStorage.getItem(DB_STORAGE_KEY);
    if (storedDbString) {
      console.log('Found existing database in localStorage. Attempting to load.');
      // Convert JSON string back to array of numbers, then to Uint8Array
      const array = JSON.parse(storedDbString);
      const uint8Array = new Uint8Array(array);
      db = new SQL.Database(uint8Array);
      console.log('Database loaded from localStorage.');
    } else {
      console.log('No database found in localStorage. Creating a new one.');
      db = new SQL.Database();
      // Initial save for new DB will be after table creation
    }
  } catch (error) {
    console.error('Failed to load database from localStorage. Creating a new one:', error);
    db = new SQL.Database(); // Fallback to new DB on error
    // Initial save for new DB will be after table creation
  }

  const createUserImageUsageTable = `
    CREATE TABLE IF NOT EXISTS user_image_usage (
      email TEXT PRIMARY KEY,
      last_generation_date TEXT,
      images_generated_today INTEGER NOT NULL DEFAULT 0
    );
  `;
  // Ensure db is not null before running, though it should be initialized by now
  if (db) {
    db.run(createUserImageUsageTable);
    console.log('user_image_usage table created/verified.');

    // If it was a new DB (no storedDbString or error during load), save it now.
    const storedDbString = localStorage.getItem(DB_STORAGE_KEY); // Check again, in case of load error
    if (!storedDbString) { // Could also use a flag set during the catch/else block above
        console.log('Saving newly created database to localStorage for the first time.');
        await saveDb(db);
    }

  } else {
    // This case should ideally not be reached if logic above is correct
    console.error("Database instance is null after initialization attempt. This should not happen.");
    throw new Error("Failed to initialize database instance properly.");
  }

  console.log('Database initialization process complete.');
  return db;
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb first.');
  }
  return db;
}

// Optional: Basic test/example usage
async function testDb() {
  try {
    const database = await initDb();
    const testEmail = 'test@example.com';
    const today = new Date().toISOString().split('T')[0];

    // Insert or update test user
    database.run(
      "INSERT OR REPLACE INTO user_image_usage (email, last_generation_date, images_generated_today) VALUES (?, ?, ?)",
      [testEmail, today, 1]
    );
    console.log('Test user inserted/updated.');

    // Select test user
    const stmt = database.prepare("SELECT * FROM user_image_usage WHERE email = :email");
    const result = stmt.getAsObject({ ':email': testEmail });
    stmt.free();

    console.log('Test user selected:', result);

    // Clean up test user
    database.run("DELETE FROM user_image_usage WHERE email = ?", [testEmail]);
    console.log('Test user deleted.');

  } catch (error) {
    console.error('Database test failed:', error);
  }
}

// Uncomment to run the test when this file is loaded (for quick verification)
// testDb();
