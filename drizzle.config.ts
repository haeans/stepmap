import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

// DATABASE_URL은 마이그레이션(drizzle-kit)에만 쓴다. 앱 코드에서는 쓰지 않는다.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  entities: {
    roles: { provider: "supabase" },
  },
});
