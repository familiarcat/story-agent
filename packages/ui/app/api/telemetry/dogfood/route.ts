/**
 * GET /api/telemetry/dogfood — Section 31 Week 1 Dogfood Telemetry Dashboard
 *
 * Returns aggregated metrics for the Section 31 Week 1 dogfood cohort:
 * - opt_out_rate: % of testers who opted out or disabled crew routing
 * - error_rate: % of requests that failed with errors
 * - sentiment_breakdown: distribution of user sentiment feedback (thumbs up/neutral/down)
 * - latency_p99_ms: 99th percentile request latency
 *
 * Data source: telemetry sink (Redis cache or Supabase)
 * Refresh: real-time (per-request) or cached (30-sec intervals)
 *
 * Used by: /dogfood-dashboard (30-sec polling)
 */

export const runtime = 'nodejs';

// Mock data structure for MVP. In production, this would query the telemetry sink.
interface TelemetryMetrics {
  opt_out_rate: number;           // 0-100 %
  error_rate: number;             // 0-100 %
  sentiment_breakdown: {
    thumbs_up: number;            // 0-100 %
    neutral: number;              // 0-100 %
    thumbs_down: number;          // 0-100 %
  };
  latency_p99_ms: number;         // milliseconds
  request_count: number;          // total requests since mission start
  timestamp: string;              // ISO 8601
  cohort: string;                 // "dogfood"
}

// TODO: In production, fetch from telemetry sink (Supabase or Redis)
// For MVP, we return realistic mock data that will be replaced by live collection
function getMockMetrics(): TelemetryMetrics {
  // Simulated baseline (will be replaced by live collection from VSCode extension)
  const now = new Date();

  // Simulate time-based variation (more active during business hours)
  const hour = now.getHours();
  const isBusinessHours = hour >= 9 && hour < 17;

  return {
    cohort: 'dogfood',
    opt_out_rate: isBusinessHours ? 5 : 15,           // 5-15% opt-out during hours
    error_rate: isBusinessHours ? 2 : 8,              // 2-8% errors (crew glitches)
    sentiment_breakdown: {
      thumbs_up: isBusinessHours ? 72 : 65,
      neutral: isBusinessHours ? 20 : 25,
      thumbs_down: isBusinessHours ? 8 : 10,
    },
    latency_p99_ms: isBusinessHours ? 1200 : 800,     // p99 latency (ms)
    request_count: Math.floor(Math.random() * 5000) + 1000, // 1k-6k requests
    timestamp: now.toISOString(),
  };
}

export async function GET(request: Request) {
  try {
    // In production: query telemetry sink with time-window filter
    // const metrics = await queryTelemetrySink('dogfood', { window: '1h' });

    // MVP: return mock data (structure is correct, data flows through dashboard)
    const metrics = getMockMetrics();

    return Response.json(metrics, {
      headers: {
        'Cache-Control': 'max-age=30, s-maxage=30', // 30-sec browser + CDN cache
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GET /api/telemetry/dogfood failed:', error);
    return Response.json(
      { error: 'Failed to fetch telemetry metrics', details: String(error) },
      { status: 500 }
    );
  }
}
