import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { query, answer, citations } = await req.json();

    if (!query || !answer) {
      return NextResponse.json(
        { error: "query and answer are required" },
        { status: 400 }
      );
    }

    // Create user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        projectId,
        role: "user",
        content: query,
        timestamp: new Date(),
      },
    });

    // Create assistant message
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        projectId,
        role: "assistant",
        content: answer,
        timestamp: new Date(),
        citations: {
          create: citations?.map((c: any) => ({
            chunkId: c.chunkId,
            relevanceScore: c.relevanceScore,
            page: c.page,
          })) || [],
        },
      },
      include: {
        citations: {
          include: {
            chunk: {
              include: {
                document: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      userMessage: {
        id: userMessage.id,
        role: userMessage.role,
        content: userMessage.content,
        timestamp: userMessage.timestamp,
      },
      assistantMessage: {
        id: assistantMessage.id,
        role: assistantMessage.role,
        content: assistantMessage.content,
        timestamp: assistantMessage.timestamp,
        citations: assistantMessage.citations.map((c) => ({
          chunkId: c.chunkId,
          relevanceScore: c.relevanceScore,
          page: c.page,
          documentName: c.chunk.document.name,
          text: c.chunk.text,
        })),
      },
    });
  } catch (error) {
    console.error("Failed to save chat message:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const messages = await prisma.chatMessage.findMany({
      where: { projectId },
      orderBy: { timestamp: "asc" },
      include: {
        citations: {
          include: {
            chunk: {
              include: {
                document: true,
              },
            },
          },
        },
      },
    });

    const formattedMessages = messages.map((msg) => ({
      id: msg.id,
      projectId: msg.projectId,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp.toISOString(),
      citations: msg.citations.map((c) => ({
        chunkId: c.chunkId,
        relevanceScore: c.relevanceScore,
        page: c.page,
        documentName: c.chunk.document.name,
        text: c.chunk.text,
      })),
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error("Failed to fetch chat messages:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    await prisma.chatMessage.deleteMany({
      where: { projectId },
    });

    return NextResponse.json({ message: "Chat history cleared" });
  } catch (error) {
    console.error("Failed to clear chat messages:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
