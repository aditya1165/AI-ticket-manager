import User from "../models/user.js";
import Ticket from "../models/ticket.js";
import { getOrSet, CACHE_TTL, CACHE_KEYS, del } from "./cache.js";

/**
 * Calculate skill match score between ticket requirements and moderator skills
 * @param {Array} ticketSkills - Skills extracted from ticket analysis
 * @param {Array} moderatorSkills - Skills listed in moderator profile
 * @returns {number} Score between 0 and 1
 */
function calculateSkillMatchScore(ticketSkills, moderatorSkills) {
  if (!ticketSkills || ticketSkills.length === 0) return 0.5; // Neutral if no skills identified
  if (!moderatorSkills || moderatorSkills.length === 0) return 0;

  let matchCount = 0;
  const normalizedTicketSkills = ticketSkills.map(s => s.toLowerCase().trim());
  const normalizedModeratorSkills = moderatorSkills.map(s => s.toLowerCase().trim());

  for (const ticketSkill of normalizedTicketSkills) {
    for (const modSkill of normalizedModeratorSkills) {
      // Check for exact match or substring match
      if (modSkill.includes(ticketSkill) || ticketSkill.includes(modSkill)) {
        matchCount++;
        break;
      }
    }
  }

  return matchCount / normalizedTicketSkills.length;
}

/**
 * Calculate availability score based on current workload
 * @param {number} activeTicketsCount - Number of active tickets assigned to moderator
 * @param {number} maxCapacity - Maximum recommended tickets per moderator (default: 10)
 * @returns {number} Score between 0 and 1 (1 = fully available, 0 = overloaded)
 */
function calculateAvailabilityScore(activeTicketsCount, maxCapacity = 10) {
  if (activeTicketsCount >= maxCapacity) return 0;
  return 1 - (activeTicketsCount / maxCapacity);
}

/**
 * Calculate performance score based on historical resolution time
 * @param {number} avgResolutionTimeHours - Average time to resolve tickets
 * @param {number} totalResolved - Total tickets resolved by moderator
 * @param {number} targetHours - Target resolution time (default: 24 hours)
 * @returns {number} Score between 0 and 1 (1 = best performer, 0 = slowest)
 */
function calculatePerformanceScore(avgResolutionTimeHours, totalResolved, targetHours = 24) {
  // New moderators get a neutral score of 0.7 to give them a chance
  if (totalResolved === 0) return 0.7;

  // Score decreases as resolution time increases beyond target
  if (avgResolutionTimeHours <= targetHours) {
    return 1; // Excellent performance
  }

  // Gradually decrease score for slower resolution times
  const excessTime = avgResolutionTimeHours - targetHours;
  const penalty = excessTime / targetHours;
  const score = Math.max(0, 1 - (penalty * 0.5)); // Max 50% penalty
  
  return score;
}

/**
 * Find the best moderator for a ticket using intelligent load balancing
 * @param {Array} requiredSkills - Skills required for the ticket
 * @returns {Object|null} Best matching moderator or null
 */
export async function findBestModerator(requiredSkills) {
  try {
    // Fetch all moderators with their stats (with caching)
    const moderators = await getOrSet(
      CACHE_KEYS.moderatorsWithSkills(),
      async () => {
        return await User.find({ 
          role: { $in: ["moderator", "admin"] }
        }).lean();
      },
      CACHE_TTL.MODERATOR_LIST
    );

    if (moderators.length === 0) return null;

    // Calculate active tickets for each moderator
    const moderatorScores = await Promise.all(
      moderators.map(async (moderator) => {
        // Count active tickets (not completed)
        const activeTicketsCount = await Ticket.countDocuments({
          assignedTo: moderator._id,
          status: { $ne: "Completed" }
        });

        // Calculate individual scores
        const skillMatch = calculateSkillMatchScore(requiredSkills, moderator.skills);
        const availability = calculateAvailabilityScore(activeTicketsCount);
        const performance = calculatePerformanceScore(
          moderator.averageResolutionTimeHours || 24,
          moderator.totalTicketsResolved || 0
        );

        // Weighted final score
        const finalScore = (skillMatch * 0.5) + (availability * 0.3) + (performance * 0.2);

        return {
          moderator,
          scores: {
            skillMatch,
            availability,
            performance,
            final: finalScore
          },
          activeTicketsCount
        };
      })
    );

    // Sort by final score (descending)
    moderatorScores.sort((a, b) => b.scores.final - a.scores.final);

    // Round-robin tie-breaker: if top 2 scores are very close (within 5%), pick least recently assigned
    if (moderatorScores.length > 1) {
      const topScore = moderatorScores[0].scores.final;
      const secondScore = moderatorScores[1].scores.final;
      
      if (Math.abs(topScore - secondScore) < 0.05) {
        // Scores are very close, use round-robin
        const topCandidates = moderatorScores.filter(m => 
          Math.abs(m.scores.final - topScore) < 0.05
        );
        
        topCandidates.sort((a, b) => {
          const aTime = a.moderator.lastAssignedAt || new Date(0);
          const bTime = b.moderator.lastAssignedAt || new Date(0);
          return aTime - bTime; // Oldest assignment first
        });

        return topCandidates[0].moderator;
      }
    }

    // Return the best moderator
    return moderatorScores[0].moderator;

  } catch (error) {
    return null;
  }
}

/**
 * Update moderator statistics when a ticket is completed
 * @param {string} moderatorId - ID of the moderator
 * @param {Date} ticketCreatedAt - When the ticket was created
 * @param {Date} ticketCompletedAt - When the ticket was completed
 */
export async function updateModeratorStats(moderatorId, ticketCreatedAt, ticketCompletedAt) {
  try {
    const moderator = await User.findById(moderatorId);
    if (!moderator) return;

    // Calculate resolution time in hours
    const resolutionTimeMs = new Date(ticketCompletedAt) - new Date(ticketCreatedAt);
    const resolutionTimeHours = resolutionTimeMs / (1000 * 60 * 60);

    // Update running average
    const totalResolved = moderator.totalTicketsResolved || 0;
    const currentAvg = moderator.averageResolutionTimeHours || 24;
    
    const newAvg = ((currentAvg * totalResolved) + resolutionTimeHours) / (totalResolved + 1);

    // Update moderator stats
    await User.findByIdAndUpdate(moderatorId, {
      totalTicketsResolved: totalResolved + 1,
      averageResolutionTimeHours: newAvg
    });

    // Invalidate moderator cache after stats update
    await del(CACHE_KEYS.moderatorsWithSkills());
    await del(CACHE_KEYS.moderatorSkills(moderatorId));

  } catch (error) {
    // Error updating moderator stats
  }
}
