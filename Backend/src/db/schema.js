import { pgTable, serial, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  role: text("role").notNull().default("user"),
  otp: text("otp"),
  otp_expiry: timestamp("otp_expiry"),
  is_verified: boolean("is_verified").notNull().default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export const complaints = pgTable("complaints", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id")
    .notNull()
    .references(() => users.id),
  complaint_text: text("complaint_text").notNull(),
  ai_question: text("ai_question"),
  user_answer: text("user_answer"),
  created_at: timestamp("created_at").defaultNow(),
});
