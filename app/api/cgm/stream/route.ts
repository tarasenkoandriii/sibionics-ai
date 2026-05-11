import { createMockReading } from "@/lib/cgm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let tick = 0;
  let timer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        try {
          const reading = createMockReading(new Date(Date.now() + tick * 60_000));
          controller.enqueue(encoder.encode(`event: glucose\ndata: ${JSON.stringify(reading)}\n\n`));
          tick += 1;
        } catch {
          if (timer) clearInterval(timer);
          try {
            controller.close();
          } catch {
            // Stream can already be closed after browser disconnect.
          }
        }
      };

      send();
      timer = setInterval(send, 2_500);

      request.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          // Ignore already closed controller.
        }
      });
    },
    cancel() {
      if (timer) clearInterval(timer);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
