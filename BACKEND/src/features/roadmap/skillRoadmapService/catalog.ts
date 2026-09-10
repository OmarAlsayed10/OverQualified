import { SkillRoadmapData } from "./schema";

export const STATIC_ROADMAPS: Record<string, Omit<SkillRoadmapData, "skillKey">> = {
  docker: {
    skill: "Docker",
    category: "skill",
    officialDocs: { title: "Docker Docs", url: "https://docs.docker.com/get-started/" },
    playground: { title: "Play with Docker (Interactive Sandbox)", url: "https://labs.play-with-docker.com/" },
    projectIdeas: [
      "Containerize a Node.js REST API with a multi-stage Dockerfile",
      "Set up local full-stack dev env using Docker Compose (App + Postgres + Redis)",
      "Publish your custom container image to Docker Hub with GitHub Actions",
    ],
    courseLinks: [
      { title: "FreeCodeCamp Docker Course", url: "https://www.youtube.com/watch?v=fqMOX6JJhGo" },
      { title: "Docker Guides & Tutorials", url: "https://docs.docker.com/get-started/" },
    ],
  },
  kubernetes: {
    skill: "Kubernetes",
    category: "skill",
    officialDocs: { title: "Kubernetes Basics & Tutorials", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/" },
    playground: { title: "Killercoda Kubernetes Playground", url: "https://killercoda.com/playgrounds/scenario/kubernetes" },
    projectIdeas: [
      "Deploy a stateless web service with 3 replicas using K8s Deployments & Services",
      "Configure ConfigMaps and Secrets to pass configuration dynamically",
      "Set up Minikube locally and define an Ingress controller",
    ],
    courseLinks: [
      { title: "Kubernetes Official Tutorials", url: "https://kubernetes.io/docs/tutorials/" },
    ],
  },
  react: {
    skill: "React",
    category: "skill",
    officialDocs: { title: "React Documentation & Quick Start", url: "https://react.dev/learn" },
    playground: { title: "StackBlitz React Playground", url: "https://stackblitz.com/fork/react-ts" },
    projectIdeas: [
      "Build an interactive dashboard with custom hooks and state management",
      "Create a reusable component UI kit using TypeScript and Material UI or Tailwind",
    ],
    courseLinks: [
      { title: "React.dev Interactive Learn Guide", url: "https://react.dev/learn" },
    ],
  },
  typescript: {
    skill: "TypeScript",
    category: "skill",
    officialDocs: { title: "TypeScript Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
    playground: { title: "TypeScript Official Playground", url: "https://www.typescriptlang.org/play" },
    projectIdeas: [
      "Migrate a JavaScript utility library to strict mode TypeScript",
      "Build a type-safe API client with generic interfaces and Zod validation",
    ],
    courseLinks: [
      { title: "TypeScript Official Docs", url: "https://www.typescriptlang.org/docs/" },
    ],
  },
  postgresql: {
    skill: "PostgreSQL",
    category: "skill",
    officialDocs: { title: "PostgreSQL Official Documentation", url: "https://www.postgresql.org/docs/current/tutorial.html" },
    playground: { title: "DB-Fiddle Postgres Sandbox", url: "https://www.db-fiddle.com/" },
    projectIdeas: [
      "Design a relational database schema with foreign keys, indexes, and constraints",
      "Write complex SQL queries using JOINs, Window functions, and CTEs",
    ],
    courseLinks: [
      { title: "PostgreSQL Documentation", url: "https://www.postgresql.org/docs/" },
    ],
  },
  prisma: {
    skill: "Prisma ORM",
    category: "skill",
    officialDocs: { title: "Prisma Official Documentation", url: "https://www.prisma.io/docs" },
    playground: { title: "Prisma Playground & Examples", url: "https://github.com/prisma/prisma-examples" },
    projectIdeas: [
      "Define a multi-model relational schema with relations, indexes, and migrations in Prisma",
      "Build a type-safe Express or Next.js backend with Prisma Client queries",
    ],
    courseLinks: [
      { title: "Prisma Official Getting Started Guide", url: "https://www.prisma.io/docs/getting-started" },
    ],
  },
  nodejs: {
    skill: "Node.js & Express API Development",
    category: "skill",
    officialDocs: { title: "Node.js Official Documentation", url: "https://nodejs.org/en/docs/" },
    playground: { title: "StackBlitz Node.js Playground", url: "https://stackblitz.com/fork/node" },
    projectIdeas: [
      "Build a production-ready RESTful API with Express, TypeScript, and middleware validation",
      "Implement JWT authentication, rate limiting, and error handling",
    ],
    courseLinks: [
      { title: "FreeCodeCamp Node.js & Express Course", url: "https://www.youtube.com/watch?v=Oe421EPjeBE" },
    ],
  },
  "ai-agents": {
    skill: "AI Agentic Systems & Engineering",
    category: "2026_market_trend",
    officialDocs: { title: "Groq & OpenAI AI API Documentation", url: "https://console.groq.com/docs/quickstart" },
    playground: { title: "Vercel AI SDK Playground", url: "https://sdk.vercel.ai/" },
    projectIdeas: [
      "Build an autonomous AI coding or research agent with function calling & tool use",
      "Implement RAG (Retrieval-Augmented Generation) using vector embeddings and PostgreSQL PgVector",
      "Build a multi-agent orchestration workflow using LangGraph or custom Express services",
    ],
    courseLinks: [
      { title: "FreeCodeCamp AI Agent Development Tutorial", url: "https://www.youtube.com/results?search_query=building+ai+agents+tutorial" },
      { title: "AI Engineering & LLM Architecture Guide", url: "https://www.google.com/search?q=AI+Engineering+Agentic+Systems+tutorial" },
    ],
  },
  "fullstack-nextjs": {
    skill: "Full-Stack Web Architecture (Next.js & Prisma)",
    category: "2026_market_trend",
    officialDocs: { title: "Next.js App Router Documentation", url: "https://nextjs.org/docs" },
    playground: { title: "StackBlitz Next.js Starter", url: "https://stackblitz.com/fork/nextjs" },
    projectIdeas: [
      "Build a full-stack SaaS application with Next.js App Router, Server Actions, and Prisma",
      "Implement JWT/OAuth authentication and real-time database queries",
    ],
    courseLinks: [
      { title: "Next.js Official Learn Course", url: "https://nextjs.org/learn" },
    ],
  },
};
