- Add an opt-in private tool-argument redaction fallback for L1 compression. After a
  `reasoning_extraction` refusal, configured string arguments (for example
  `skip_reply.reason`) can be omitted from one provider-facing retry while raw Chronicle
  history remains unchanged; the richer tool-prose hoist remains available afterward.
