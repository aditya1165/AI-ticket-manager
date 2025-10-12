import Inngest from "inngest";

const EVENT_KEY = process.env.INNGEST_EVENT_KEY?.trim();
const SIGNING_KEY = process.env.INNGEST_SIGNING_KEY?.trim();
const API_KEY = process.env.INNGEST_API_KEY?.trim();

const inngest = new Inngest({id: "ticketing-system"});

// Priority: explicit event key (prod) -> signing key (local dev) -> API key (cloud)
if (EVENT_KEY) {
  inngest.setEventKey(EVENT_KEY);
  console.log("Inngest: using INNGEST_EVENT_KEY");
} else if (SIGNING_KEY) {
  inngest.setEventKey(SIGNING_KEY);
  console.log("Inngest: using INNGEST_SIGNING_KEY as event key (dev fallback)");
} else if (API_KEY) {
  // When using Inngest Cloud, the API key is used by the runtime/CLI; still set event key if provided.
  console.log("Inngest: INNGEST_API_KEY detected (use for cloud start).");
} else {
  console.warn("Inngest: no event key or signing key found. Set INNGEST_EVENT_KEY or INNGEST_SIGNING_KEY.");
}

export default inngest;