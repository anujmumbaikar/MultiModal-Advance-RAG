import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db"


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      name,
      description,
      domain,
      instructions,
      enableOCR,
      enableMultimodal,
      enableCitations,
    } = body;

    if (!name || !description) {
      return NextResponse.json(
        { error: "Name and description are required" },
        { status: 400 }
      );
    }

    if (!domain) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        domain,
        instructions,

        tags: [
          enableOCR ? "ocr" : "",
          enableMultimodal ? "multimodal" : "",
          enableCitations ? "citations" : "",
        ].filter(Boolean),

        status: "idle",

        totalDocuments: 0,
        totalChunks: 0,
        totalPages: 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        project,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE_PROJECT_ERROR:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}