# Section 31 Week 1 Dogfood — Tester Onboarding Email

## Subject: Section 31 Week 1 Dogfood — You're Invited to Beta Test VSCode Chat on OpenRouter

---

Hi [Tester Name],

You've been selected as a trusted beta tester for **Section 31**: our experiment to route VSCode chat through our OpenRouter crew by default. This is a controlled dogfood—we're forcing crew routing for 10 testers, collecting real metrics, and ready to rollback in <5 minutes if needed.

**What's happening?**

Starting **Friday, 2026-07-11**, when you open VSCode chat, it will route to our crew brain on OpenRouter—not Copilot. The crew is Quark-selected (cost-optimized model routing) and has access to your RAG memory. We're doing this to validate:
- Crew fidelity & latency under real-world load
- Cost baseline vs. Copilot (weekly savings math)
- Auto-fallback safety when infra goes down
- Tester sentiment & usability regressions

**What we need from you:**

1. **Daily drills (15 min):** Tue/Thu/Sat, we run rollback drills—you'll see a "Rolling back to Copilot" notification, extension reloads, and you're back on Copilot temporarily. This is intentional. Just resume testing after.

2. **Daily standup (9am PT, 15 min):** Every day Mon–Fri in #section-31-dogfood Slack. We review overnight metrics and blockers. Your presence signals "no show-stoppers in my workflow." If you can't make standup, ping the channel asap.

3. **Report issues fast:** Any errors, timeouts, or UX regressions? Post in #section-31-dogfood with:
   - What happened (error message or description)
   - Which feature: `/ask` (chat), `/agent` (autonomous), inline edit, or code review
   - Time of day & how many times it happened
   - Yar or Troi will triage within 1 hour

4. **Leave sentiment feedback:** In each chat response, you'll see three buttons: 👍 (great), 😐 (ok), 👎 (broken). Click one per chat. This is our primary signal—take 2 sec per response.

**What you CAN do:**

- **Use crew routing freely** — `/ask` (chat), `/agent` (agentic), inline edits, code review. All routed to OpenRouter by default.
- **Toggle back to Copilot manually** — Status bar shows "OpenRouter" or "Copilot". Click to toggle (useful if crew feels slow; we log it).
- **Report ideas** — If crew handles something Copilot doesn't, tell us (#section-31-dogfood).

**What happens if crew breaks?**

- **Auto-fallback:** If agent :3103 is unreachable, the extension auto-falls back to Copilot with a message: "Crew brain unreachable; using Copilot. Start the local agent or check infra."
- **Manual rollback:** If error rates spike, we rollback within 5 min via scripts/rollback_dogfood.sh — no data loss, no chat history purge. You'll see "Rolling back to Copilot" and VSCode reloads.
- **Re-enable crew:** Once we fix the blocker, we flip the flag back (takes 2 min).

**Rollback SLA:** <5 minutes end-to-end (settings toggle + extension reload). This is a hard constraint we've tested.

**FAQ**

**Q: Can I still use Copilot if I want?**  
A: Yes. Status bar has an "OpenRouter" ↔ "Copilot" toggle. Click anytime. We'll log it as opt-out.

**Q: What if the crew brain crashes?**  
A: Extension auto-falls back to Copilot with an error message. You can keep working. We'll detect & fix it <5 min, then we flip the crew back on.

**Q: How long is this dogfood?**  
A: One week (Fri 2026-07-11 → Fri 2026-07-18). Friday EOD we review success metrics (error rate <0.1%, opt-out <2%, sentiment neutral or positive). If green, Week 2 we expand to 100 testers. If red, we pause & iterate.

**Q: Will chat history disappear if you rollback?**  
A: No. Chat history lives in VSCode. Rollback is a settings toggle + extension reload—data stays.

**Q: What's the cost model?**  
A: OpenRouter tokens are billed per request (Quark picks the cheap model for simple turns, quality model for complex). We measure daily cost/user and compare to Copilot Pro ($20/month baseline). Goal: <20% above Copilot baseline, or we flag ROI risk.

**Q: Can I toggle crew/Copilot mid-chat?**  
A: Toggling the provider switches the default for the *next* chat. Current chat will finish with its current provider.

**Q: Who do I contact if something feels wrong?**  
A: Post in #section-31-dogfood with details. Yar (QA) or Troi (product) will respond within 1 hour. For urgent infra issues, @O'Brien.

---

**Timeline**

- **Today (2026-07-10):** You receive this email. Verify you can access #section-31-dogfood Slack channel.
- **Tomorrow (2026-07-11):** Crew dogfood goes live, first standup 9am PT.
- **Tue/Thu/Sat:** Rollback drills (expect 1–2 min of "rolling back" messages).
- **Daily Mon–Fri:** Standups 9am PT, metrics reviews.
- **Fri EOD (2026-07-18):** Week 1 retro, go/no-go decision for Week 2 canary.

---

**You're a trusted insider.** The crew is solid, but testing on real workflows is how we catch gaps Staging can't. Your honest feedback—including "this is slower" or "I just toggled to Copilot"—drives iteration.

See you in the channel. Questions, reply here or ping in #section-31-dogfood.

— Picard & the crew

---

*P.S. — If you're curious about the architecture: the extension registers a custom VSCode chat provider (`story-agent/crew-chat`) that routes to the MCP server's /chat endpoint. Worf gates credentials, Yar monitors token fidelity, and Quark routes to the cheapest adequate model. Rollback is a one-line settings toggle.*
