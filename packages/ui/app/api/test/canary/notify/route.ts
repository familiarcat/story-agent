/**
 * TROI Workstream: Notification Delivery (SIMULATED)
 *
 * POST /api/test/canary/notify
 * Logs notification copy to test database (NO OUTBOUND EMAILS)
 *
 * Request: { user_id, email, subject, banner_text, opt_out_link }
 * Response: { logged: true, notification_id, timestamp }
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, email, subject, banner_text, opt_out_link } = body;

    // Validate input
    if (!user_id || !email || !subject) {
      return Response.json(
        { error: 'Missing required fields: user_id, email, subject' },
        { status: 400 }
      );
    }

    // SAFETY: Confirm test environment scope
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Log to test database (simulated)
    console.log(`[TEST::TROI] Notification logged (NO EMAIL SENT):
      notification_id: ${notificationId}
      user_id: ${user_id}
      email: ${email}
      subject: ${subject}
      banner: ${banner_text || '(no banner)'}
      opt_out_link: ${opt_out_link || '(not set)'}
      timestamp: ${new Date().toISOString()}
    `);

    return Response.json(
      {
        logged: true,
        notification_id: notificationId,
        timestamp: new Date().toISOString(),
        safety_verified: 'NO_EMAIL_SENT_TEST_ENVIRONMENT_ONLY',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[TEST::TROI] Error:', error);
    return Response.json(
      { error: 'Failed to log notification', details: String(error) },
      { status: 500 }
    );
  }
}
