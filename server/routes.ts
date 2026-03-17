import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(server: Server, app: Express) {
  // Get all skills
  app.get("/api/skills", async (_req, res) => {
    const skills = await storage.getSkills();
    res.json(skills);
  });

  // Get featured skills
  app.get("/api/skills/featured", async (_req, res) => {
    const skills = await storage.getFeaturedSkills();
    res.json(skills);
  });

  // Search skills
  app.get("/api/skills/search", async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.json([]);
    }
    const skills = await storage.searchSkills(query);
    res.json(skills);
  });

  // Get skills by category
  app.get("/api/skills/category/:category", async (req, res) => {
    const skills = await storage.getSkillsByCategory(req.params.category);
    res.json(skills);
  });

  // Get single skill by name
  app.get("/api/skills/:name", async (req, res) => {
    const skill = await storage.getSkillByName(req.params.name);
    if (!skill) {
      return res.status(404).json({ message: "Skill not found" });
    }
    res.json(skill);
  });

  // Get categories with counts
  app.get("/api/categories", async (_req, res) => {
    const skills = await storage.getSkills();
    const categories: Record<string, number> = {};
    for (const skill of skills) {
      categories[skill.category] = (categories[skill.category] || 0) + 1;
    }
    res.json(categories);
  });
}
