import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const services = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/services" }),
  schema: z.object({
    title: z.string(),
    metaDescription: z.string(),
    eyebrow: z.string(),
    locale: z.enum(["en", "ar"]).default("en"),
    translationKey: z.string().optional(),
    heroImage: z.string().optional(),
    sections: z.array(z.object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
      image: z.string().optional(),
    })).optional(),
    features: z.array(z.string()).optional(),
    crossLinks: z.array(z.object({
      text: z.string(),
      href: z.string(),
    })).optional(),
    pillar: z.enum(["power", "it"]).default("power"),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/pages" }),
  schema: z.object({ locale: z.enum(["en", "ar"]), strings: z.record(z.string(), z.string()) }),
});

export const collections = { services, pages };
