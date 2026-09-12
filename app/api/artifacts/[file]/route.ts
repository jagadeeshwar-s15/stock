import { readFile, stat } from "node:fs/promises";

import { resolveArtifact } from "@/lib/artifacts";

/**
 * Serves the pipeline's result files (CSV tables, PNG figures, the JSON
 * payload and the executed notebook) as downloads. Only names on the
 * allowlist in `lib/artifacts.ts` resolve, so path traversal is impossible.
 */
export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const artifact = resolveArtifact(file);

  if (!artifact) {
    return Response.json({ error: `Unknown artifact "${file}"` }, { status: 404 });
  }

  try {
    const [contents, info] = await Promise.all([readFile(artifact.absolutePath), stat(artifact.absolutePath)]);
    return new Response(new Uint8Array(contents), {
      headers: {
        "Content-Type": artifact.contentType,
        "Content-Length": String(info.size),
        "Content-Disposition": `attachment; filename="${file}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      return Response.json(
        { error: `${file} has not been generated yet. Run the pipeline in ml/ first.` },
        { status: 404 },
      );
    }
    return Response.json({ error: "The artifact could not be read." }, { status: 500 });
  }
}
