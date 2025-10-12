import { inngest } from "../client.js";
import User from "../../models/user.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";

export const onUserSignup = inngest.createFunction(
  { id: "on-user-signup", retries: 2 },
  { event: "user/signup" },
  async ({ event, step }) => {
    try {
      const { email } = event.data;
      const user = await step.run("get-user-email", async () => {
        const userObject = await User.findOne({ email });
        if (!userObject) {
          throw new NonRetriableError("User no longer exists in our database");
        }
        return userObject;
      });

      await step.run("send-welcome-email", async () => {
        const subject = `Welcome to Ticket.io — your AI ticket assistant`;
        const message = `Hi ${user.username || "there"},\n\nThanks for signing up for Ticket.io. We're excited to have you onboard.\n\nNext steps:\n- Create your first ticket from the dashboard\n- Add skills to your profile (if you're applying to moderate)\n- Visit the documentation or help section in the app to learn more\n\nIf you have any questions, reply to this email and we'll help you out.\n\nBest,\nThe Ticket.io Team`;
        await sendMail(user.email, subject, message);
      });

      return { success: true };
    } catch (error) {
      console.error("❌ Error running step", error.message);
      return { success: false };
    }
  }
);
