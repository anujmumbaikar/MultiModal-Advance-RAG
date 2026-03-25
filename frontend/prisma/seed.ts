import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import "dotenv/config"

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  // 🔹 Create Project
  const project = await prisma.project.create({
    data: {
      name: "Medical Research Papers",
      description: "Clinical trial analysis and literature review",
      domain: "Healthcare",
      instructions: "Focus on statistical significance and outcomes",
      tags: ["medical", "clinical", "research"],
      status: "ready",
    },
  })

  // 🔹 Create Documents
  const doc1 = await prisma.document.create({
    data: {
      projectId: project.id,
      name: "Clinical_Trial_Phase3.pdf",
      fileType: "pdf",
      size: 4500000,
      status: "completed",
      pages: 42,
      chunks: 3,
      contentTypes: ["text", "table"],
      uploadedAt: new Date(),
      processedAt: new Date(),
    },
  })

  const doc2 = await prisma.document.create({
    data: {
      projectId: project.id,
      name: "Drug_Interaction_Study.pdf",
      fileType: "pdf",
      size: 2800000,
      status: "completed",
      pages: 28,
      chunks: 2,
      contentTypes: ["text"],
      uploadedAt: new Date(),
      processedAt: new Date(),
    },
  })

  // 🔹 Create Chunks
  const chunk1 = await prisma.chunk.create({
    data: {
      documentId: doc1.id,
      text: "The primary endpoint showed a 34% reduction in symptoms.",
      page: 8,
      contentType: "text",
    },
  })

  const chunk2 = await prisma.chunk.create({
    data: {
      documentId: doc1.id,
      text: "Overall response rate was 67.3% in treatment group.",
      page: 12,
      contentType: "text",
    },
  })

  const chunk3 = await prisma.chunk.create({
    data: {
      documentId: doc2.id,
      text: "Combination therapy showed improved remission rates.",
      page: 15,
      contentType: "text",
    },
  })

  // 🔹 Ingestion Job
  const job = await prisma.ingestionJob.create({
    data: {
      projectId: project.id,
      documentId: doc1.id,
      currentStage: "ready",
      progress: 100,
    },
  })

  // 🔹 Stages
  await prisma.stage.createMany({
    data: [
      { jobId: job.id, stage: "upload_received", status: "completed" },
      { jobId: job.id, stage: "text_extraction", status: "completed" },
      { jobId: job.id, stage: "chunking", status: "completed" },
      { jobId: job.id, stage: "embeddings", status: "completed" },
      { jobId: job.id, stage: "ready", status: "completed" },
    ],
  })

  // 🔹 Logs
  await prisma.log.createMany({
    data: [
      {
        jobId: job.id,
        timestamp: new Date(),
        message: "Text extraction completed",
        level: "info",
      },
      {
        jobId: job.id,
        timestamp: new Date(),
        message: "Chunking completed successfully",
        level: "info",
      },
    ],
  })

  // 🔹 Chat Messages
  const userMsg = await prisma.chatMessage.create({
    data: {
      projectId: project.id,
      role: "user",
      content: "What were the main results of the trial?",
      timestamp: new Date(),
    },
  })

  const aiMsg = await prisma.chatMessage.create({
    data: {
      projectId: project.id,
      role: "assistant",
      content:
        "The trial showed a 34% reduction in symptoms and a 67.3% response rate.",
      timestamp: new Date(),
    },
  })

  // 🔹 Citations
  await prisma.citation.createMany({
    data: [
      {
        messageId: aiMsg.id,
        chunkId: chunk1.id,
        relevanceScore: 0.95,
        page: 8,
      },
      {
        messageId: aiMsg.id,
        chunkId: chunk2.id,
        relevanceScore: 0.91,
        page: 12,
      },
    ],
  })

  console.log("✅ Seed data inserted successfully")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })