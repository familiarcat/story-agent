/**
 * POST /api/sentiment — Section 31 Week 1 Dogfood Sentiment Feedback
 *
 * Logs user sentiment feedback (thumbs up/neutral/thumbs down) for dogfood monitoring.
 * Called by VSCode extension after each crew chat interaction.
 *
 * Request body:
 *   {
 *     reaction: "thumbs_up" | "neutral" | "thumbs_down",
 *     request_id?: string,          // optional: correlate with specific request
 *     timestamp?: string,           // optional: ISO 8601, defaults to now
 *     tester_id?: string,           // optional: crew member ID
 *     message?: string              // optional: user comment
 *   }
 *
 * Response:
 *   { logged: true, timestamp: string, id: string }
 *
 * Used by: VSCode extension (sentiment buttons in chat), /dogfood-dashboard (gauges)
 */

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reaction, request_id, timestamp, tester_id, message } = body;

    // Validate reaction
    if (!['thumbs_up', 'neutral', 'thumbs_down'].includes(reaction)) {
      return Response.json(
        { error: 'Invalid reaction. Must be thumbs_up, neutral, or thumbs_down.' },
        { status: 400 }
      );
    }

    // Create sentiment record
    const now = new Date().toISOString();
    const sentimentRecord = {
      id: `sentiment_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      reaction,
      request_id: request_id || null,
      timestamp: timestamp || now,
      tester_id: tester_id || 'anonymous',
      message: message || null,
      logged_at: now,
      cohort: 'dogfood',
    };

    // TODO: In production, persist to Supabase or telemetry sink
    // await supabase.from('dogfood_sentiment').insert([sentimentRecord]);

    // Log to console for MVP testing
    console.log('[SENTIMENT FEEDBACK]', JSON.stringify(sentimentRecord));

    return Response.json({
      logged: true,
      id: sentimentRecord.id,
      timestamp: sentimentRecord.logged_at,
    });
  } catch (error) {
    console.error('POST /api/sentiment failed:', error);
    return Response.json(
      { error: 'Failed to log sentiment feedback', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sentiment/dogfood — Section 31 Week 1 Dogfood Sentiment Aggregates
 *
 * Returns aggregated sentiment metrics for the dogfood dashboard.
 *
 * Response:
 *   {
 *     thumbs_up: number,           // count
 *     neutral: number,
 *     thumbs_down: number,
 *     total: number,
 *     breakdown: { thumbs_up: %, neutral: %, thumbs_down: % },
 *     per_tester: [{ tester_id, thumbs_up: count, neutral: count, thumbs_down: count }, ...]
 *   }
 *
 * Used by: /dogfood-dashboard (sentiment panel, tester roster table)
 */

export async function GET() {
  try {
    // TODO: In production, query aggregated sentiment data
    // const sentiments = await supabase
    //   .from('dogfood_sentiment')
    //   .select('reaction, tester_id')
    //   .eq('cohort', 'dogfood');

    // MVP: return realistic mock aggregates
    const mockAggregates = {
      thumbs_up: 285,
      neutral: 98,
      thumbs_down: 37,
      total: 420,
      breakdown: {
        thumbs_up: 67.9,
        neutral: 23.3,
        thumbs_down: 8.8,
      },
      per_tester: [
        { tester_id: 'Riker', thumbs_up: 34, neutral: 8, thumbs_down: 3 },
        { tester_id: 'Yar', thumbs_up: 31, neutral: 7, thumbs_down: 2 },
        { tester_id: 'Troi', thumbs_up: 29, neutral: 9, thumbs_down: 4 },
        { tester_id: 'Quark', thumbs_up: 28, neutral: 10, thumbs_down: 5 },
        { tester_id: 'Data', thumbs_up: 27, neutral: 8, thumbs_down: 3 },
        { tester_id: 'La Forge', thumbs_up: 26, neutral: 9, thumbs_down: 4 },
        { tester_id: 'Picard', thumbs_up: 25, neutral: 10, thumbs_down: 4 },
        { tester_id: 'Worf', thumbs_up: 26, neutral: 9, thumbs_down: 5 },
        { tester_id: 'Charlie', thumbs_up: 24, neutral: 11, thumbs_down: 3 },
        { tester_id: 'Sam', thumbs_up: 35, neutral: 12, thumbs_down: 0 },
      ],
      timestamp: new Date().toISOString(),
    };

    return Response.json(mockAggregates, {
      headers: {
        'Cache-Control': 'max-age=30, s-maxage=30',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GET /api/sentiment/dogfood failed:', error);
    return Response.json(
      { error: 'Failed to fetch sentiment metrics', details: String(error) },
      { status: 500 }
    );
  }
}
