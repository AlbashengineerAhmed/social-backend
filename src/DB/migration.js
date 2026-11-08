/**
 * @fileoverview Database Migration & Integrity Script
 * @description Migrates legacy inline members array in groups and attendees in events
 * to independent GroupMember and EventAttendee collections, with backup creation.
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";
import path from "node:path";

dotenv.config({ path: path.resolve("./src/config/.env.dev") });

import { groupModel } from "./model/Group.model.js";
import { groupMemberModel, groupMemberRoles, groupMemberStatus } from "./model/GroupMember.model.js";
import { eventModel } from "./model/Event.model.js";
import { eventAttendeeModel, eventAttendeeStatus } from "./model/EventAttendee.model.js";

export async function runMigration() {
    const mongoUri = process.env.DB_URI || "mongodb://localhost:27017/SocialMediaApp";
    console.log(`[Migration] Connecting to ${mongoUri}...`);
    await mongoose.connect(mongoUri);
    const db = mongoose.connection.db;

    // 1. Create backup collections if source collections exist
    console.log("[Migration] Checking collections for backup...");
    const collections = (await db.listCollections().toArray()).map((c) => c.name);

    if (collections.includes("groups")) {
        const groupsCount = await db.collection("groups").countDocuments();
        if (groupsCount > 0) {
            await db.collection("groups").aggregate([{ $out: "groups_backup_v1" }]).toArray();
            console.log(`[Migration] Backed up ${groupsCount} groups to groups_backup_v1`);
        }
    }

    if (collections.includes("events")) {
        const eventsCount = await db.collection("events").countDocuments();
        if (eventsCount > 0) {
            await db.collection("events").aggregate([{ $out: "events_backup_v1" }]).toArray();
            console.log(`[Migration] Backed up ${eventsCount} events to events_backup_v1`);
        }
    }

    // 2. Migrate Group Creator & Members to GroupMember collection
    const allGroups = await db.collection("groups").find({}).toArray();
    console.log(`[Migration] Processing ${allGroups.length} groups...`);

    for (const g of allGroups) {
        // Ensure creator is owner in GroupMember collection
        if (g.creator) {
            await groupMemberModel.updateOne(
                { groupId: g._id, userId: g.creator },
                {
                    $setOnInsert: {
                        groupId: g._id,
                        userId: g.creator,
                        role: groupMemberRoles.owner,
                        status: groupMemberStatus.active,
                        joinedAt: g.createdAt || new Date()
                    }
                },
                { upsert: true }
            );
        }

        // Migrate legacy members array if present
        if (Array.isArray(g.members) && g.members.length > 0) {
            for (const memberId of g.members) {
                if (memberId && memberId.toString() !== g.creator?.toString()) {
                    await groupMemberModel.updateOne(
                        { groupId: g._id, userId: memberId },
                        {
                            $setOnInsert: {
                                groupId: g._id,
                                userId: memberId,
                                role: groupMemberRoles.member,
                                status: groupMemberStatus.active,
                                joinedAt: new Date()
                            }
                        },
                        { upsert: true }
                    );
                }
            }
        }

        // Update membersCount accurately
        const count = await groupMemberModel.countDocuments({ groupId: g._id, status: groupMemberStatus.active });
        await groupModel.updateOne({ _id: g._id }, { $set: { membersCount: count } });
    }

    // 3. Migrate Event Creator & Attendees to EventAttendee collection
    const allEvents = await db.collection("events").find({}).toArray();
    console.log(`[Migration] Processing ${allEvents.length} events...`);

    for (const e of allEvents) {
        if (e.creator) {
            await eventAttendeeModel.updateOne(
                { eventId: e._id, userId: e.creator },
                {
                    $setOnInsert: {
                        eventId: e._id,
                        userId: e.creator,
                        status: eventAttendeeStatus.going,
                        checkedIn: false
                    }
                },
                { upsert: true }
            );
        }

        if (Array.isArray(e.attendees) && e.attendees.length > 0) {
            for (const attendeeId of e.attendees) {
                if (attendeeId && attendeeId.toString() !== e.creator?.toString()) {
                    await eventAttendeeModel.updateOne(
                        { eventId: e._id, userId: attendeeId },
                        {
                            $setOnInsert: {
                                eventId: e._id,
                                userId: attendeeId,
                                status: eventAttendeeStatus.going,
                                checkedIn: false
                            }
                        },
                        { upsert: true }
                    );
                }
            }
        }

        const goingCount = await eventAttendeeModel.countDocuments({ eventId: e._id, status: eventAttendeeStatus.going });
        const interestedCount = await eventAttendeeModel.countDocuments({ eventId: e._id, status: eventAttendeeStatus.interested });
        const notGoingCount = await eventAttendeeModel.countDocuments({ eventId: e._id, status: eventAttendeeStatus.not_going });

        await eventModel.updateOne(
            { _id: e._id },
            {
                $set: {
                    "attendeesCount.going": goingCount,
                    "attendeesCount.interested": interestedCount,
                    "attendeesCount.not_going": notGoingCount
                }
            }
        );
    }

    console.log("[Migration] Migration completed successfully!");
    await mongoose.disconnect();
}

runMigration().catch((err) => {
    console.error("[Migration Error]", err);
    process.exit(1);
});
