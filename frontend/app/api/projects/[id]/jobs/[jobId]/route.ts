import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

const STAGE_PROGRESS: Record<string, Record<string, number>> = {
  upload_received: { running: 5, completed: 10 },
  chunking: { running: 15, completed: 50 },
  embeddings: { running: 55, completed: 75 },
  vector_storage: { running: 80, completed: 90 },
  ready: { running: 95, completed: 100 },
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const { stage, status, message, level = "info" } = await req.json();

    const progress = STAGE_PROGRESS[stage]?.[status] ?? 0;

    await prisma.stage.updateMany({
      where: { jobId, stage },
      data: {
        status,
        ...(status === "running" ? { startedAt: new Date() } : {}),
        ...(status === "completed" || status === "failed" ? { completedAt: new Date() } : {}),
      },
    });

    await prisma.ingestionJob.update({
      where: { id: jobId },
      data: {
        currentStage: stage,
        progress,
      },
    });

    if (message) {
      await prisma.log.create({
        data: {
          jobId,
          timestamp: new Date(),
          message,
          level,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("JOB_PATCH_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { jobId } = await params;
    await prisma.ingestionJob.delete({ where: { id: jobId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("JOB_DELETE_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
