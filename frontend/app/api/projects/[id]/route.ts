import prisma from "@/lib/db"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: (await params).id },
      include: {
        documents: true,
        ingestionJobs: {
            include: {
                stages: true,
                logs: true,
            },
        },
        chatMessages: true,
      },
    })

    if (!project) {
      return new Response("Project not found", { status: 404 })
    }

    return Response.json(project)
  } catch (error) {
    console.error(error)
    return new Response("Internal Server Error", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await prisma.project.delete({
      where: { id: (await params).id },
    })

    return new Response("Project deleted", { status: 200 })
  } catch (error) {
    console.error(error)
    return new Response("Internal Server Error", { status: 500 })
  }
}