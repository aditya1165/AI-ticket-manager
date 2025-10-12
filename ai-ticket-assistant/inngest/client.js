import { Inngest } from "inngest";
import dotenv from "dotenv";
dotenv.config();
const eventKey = process.env.INNGEST_EVENT_KEY?.trim();
const signingKey = process.env.INNGEST_SIGNING_KEY?.trim();
const apiKey = process.env.INNGEST_API_KEY?.trim();

const inngest = new Inngest({
	id: "ticketing-system",
	signingKey: signingKey || undefined,
	apiKey: apiKey || undefined,
});

if (eventKey) {
	try {
		inngest.setEventKey(eventKey);
		console.log("Inngest: using INNGEST_EVENT_KEY");
	} catch (e) {
		console.warn("Inngest: failed to set event key:", e?.message || e);
	}
} else if (signingKey) {
	try {
		inngest.setEventKey(signingKey);
		console.log("Inngest: using INNGEST_SIGNING_KEY as event key (dev fallback)");
	} catch (e) {
		console.warn("Inngest: failed to set signing key as event key:", e?.message || e);
	}
} 

export { inngest };
