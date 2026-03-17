import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  author: text("author").notNull(),
  version: text("version").notNull().default("1.0.0"),
  license: text("license").default("MIT"),
  compatibility: text("compatibility"),
  tags: text("tags").array(),
  installCount: integer("install_count").notNull().default(0),
  securityStatus: text("security_status").notNull().default("verified"),
  featured: boolean("featured").notNull().default(false),
  skillMd: text("skill_md").notNull(),
  repoUrl: text("repo_url"),
  installCommand: text("install_command"),
});

export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
  installCount: true,
});
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type Skill = typeof skills.$inferSelect;
