/**
 * Load .env once at process start (before other app modules).
 * quiet: true suppresses dotenv v17 tip banners in the terminal.
 */
import dotenv from "dotenv";

dotenv.config({ quiet: true });
