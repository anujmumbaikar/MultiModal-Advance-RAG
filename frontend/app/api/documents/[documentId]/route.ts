import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;

    // Get document to find its project
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { project: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const projectId = document.projectId;

    // Delete related chunks first (citations will cascade)
    const chunks = await prisma.chunk.findMany({
      where: { documentId },
      select: { id: true },
    });

    // Delete citations related to chat messages that reference these chunks
    await prisma.citation.deleteMany({
      where: {
        chunkId: {
          in: chunks.map((c) => c.id),
        },
      },
    });

    // Delete chunks (citations cascade handled above)
    await prisma.chunk.deleteMany({
      where: { documentId },
    });

    // Delete document from Postgres (ingestionJobs, logs, stages will cascade)
    await prisma.document.delete({
      where: { id: documentId },
    });

    // Delete embeddings from Qdrant
    try {
      const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";
      await fetch(`${FASTAPI_URL}/documents/${documentId}/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project_id: projectId,
          document_name: document.name,
        }),
      });
    } catch (error) {
      console.error("Failed to delete from vector DB:", error);
      // Don't fail the request if vector DB deletion fails
    }

    // Update project stats
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        totalDocuments: {
          decrement: 1,
        },
        totalChunks: {
          decrement: document.chunks || 0,
        },
        totalPages: {
          decrement: document.pages || 0,
        },
      },
    });

    return NextResponse.json({
      message: "Document deleted successfully",
      documentId,
      projectId,
      projectStats: {
        totalDocuments: updatedProject.totalDocuments,
        totalChunks: updatedProject.totalChunks,
        totalPages: updatedProject.totalPages,
      },
    });
  } catch (error) {
    console.error("Failed to delete document:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
