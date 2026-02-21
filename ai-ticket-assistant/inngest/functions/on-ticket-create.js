import { inngest } from "../client.js";
import Ticket from "../../models/ticket.js";
import User from "../../models/user.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";
import analyzeTicket from "../../utils/ai.js";
import { findBestModerator } from "../../utils/intelligent-assignment.js";

export const onTicketCreated = inngest.createFunction(
  { id: "on-ticket-created", retries: 2 },
  { event: "ticket/created" },
  async ({ event, step }) => {
    try {
      const { ticketId } = event.data;
      //fetch ticket from DB
      const ticket = await step.run("fetch-ticket", async () => {
        const ticketObject = await Ticket.findById(ticketId);
        if (!ticketObject) {
          throw new NonRetriableError("Ticket not found");
        }
        return ticketObject;
      });

      await step.run("update-ticket-status", async () => {
        await Ticket.findByIdAndUpdate(ticket._id, { status: "To-Do" });
        return true;
      });

      const aiResponse = await analyzeTicket(ticket);

      const relatedskills = await step.run("ai-processing", async () => {
        let skills = [];
        if (aiResponse) {
          await Ticket.findByIdAndUpdate(ticket._id, {
            priority: !["Low", "Medium", "High"].includes(aiResponse.priority)
              ? "Medium"
              : aiResponse.priority,
            helpfulNotes: aiResponse.helpfulNotes,
            status: "In Progress",
            relatedSkills: aiResponse.relatedSkills,
          });
          skills = aiResponse.relatedSkills;
        }
        return skills;
      });

      const moderator = await step.run("assign-moderator", async () => {
        // Use intelligent load balancing algorithm
        const bestModerator = await findBestModerator(relatedskills);
        
        if (bestModerator) {
          // Update ticket with assigned moderator
          await Ticket.findByIdAndUpdate(ticket._id, {
            assignedTo: bestModerator._id,
          });

          // Update moderator's last assigned timestamp for round-robin
          await User.findByIdAndUpdate(bestModerator._id, {
            lastAssignedAt: new Date()
          });          
          return bestModerator;
        } else {
          console.warn("⚠️ No moderator found for assignment");
          return null;
        }
      });

      await step.run("send-email-notification", async () => {
        if (moderator) {
          const finalTicket = await Ticket.findById(ticket._id);
          const deadlineStr = finalTicket.deadline ? new Date(finalTicket.deadline).toLocaleString() : "No deadline set";
          await sendMail(
            moderator.email,
            "Ticket Assigned",
            `A new ticket has been assigned to you:\n\nTitle: ${finalTicket.title}\nPriority: ${finalTicket.priority || "Not set"}\nDeadline: ${deadlineStr}\n\nPlease check the system for details.`
          );
        }
      });

      return { success: true };
    } catch (err) {
      console.error("❌ Error running the step", err.message);
      return { success: false };
    }
  }
);
