import { getDashboard } from "@/lib/dashboard";

/**
 * The full pipeline payload as JSON, for programmatic use (the dashboard
 * itself reads the file directly on the server).
 */
export async function GET() {
  const state = await getDashboard();

  if (state.status === "missing") {
    return Response.json(
      { error: "No pipeline results yet.", path: state.path, hint: "Run python run_pipeline.py in ml/." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (state.status === "invalid") {
    return Response.json(
      { error: "The pipeline output could not be read.", path: state.path, reason: state.reason },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return Response.json(state.data, {
    headers: { "Cache-Control": "no-store", "X-Generated-At": state.data.generatedAt },
  });
}
