import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "ticketing-system",eventkey:process.env.INNGEST_EVENT_KEY});
