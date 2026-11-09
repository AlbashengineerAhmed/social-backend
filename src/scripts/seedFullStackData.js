/**
 * @fileoverview Seed Script for 5 Full Stack Developer Groups & 5 Technical Events
 * @module scripts/seedFullStackData
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../config/.env.dev') });

const { default: connectDB } = await import('../DB/connection.js');
const { userModel } = await import('../DB/model/User.model.js');
const { groupModel, groupPrivacyTypes, groupVisibilityTypes } = await import('../DB/model/Group.model.js');
const { groupMemberModel, groupMemberRoles, groupMemberStatus } = await import('../DB/model/GroupMember.model.js');
const { eventModel, eventTypeCategories, eventStatusTypes, eventPrivacyTypes } = await import('../DB/model/Event.model.js');
const { eventAttendeeModel, eventAttendeeStatus } = await import('../DB/model/EventAttendee.model.js');

async function seed() {
    try {
        console.log('Connecting to database...');
        await connectDB();

        // 1. Find a creator user (admin or any active user)
        let creator = await userModel.findOne({ role: { $in: ['admin', 'superAdmin'] } });
        if (!creator) {
            creator = await userModel.findOne({});
        }

        if (!creator) {
            console.error('No user found in database to assign as creator.');
            process.exit(1);
        }

        console.log(`Using creator user: ${creator.userName || creator.firstName} (${creator._id})`);

        // 2. Define 5 Full Stack Developer Groups
        const groupsToSeed = [
            {
                name: 'Full Stack Developers Global',
                slug: 'full-stack-developers-global',
                description: 'The official global community for Full Stack Engineers. Discuss MERN, Next.js, TypeScript, system design, microservices, and modern web architectures.',
                rules: '1. Share production-ready insights.\n2. Be respectful and constructive.\n3. No spam or unsolicited promotions.',
                category: 'Full Stack Development',
                privacy: groupPrivacyTypes.public,
                visibility: groupVisibilityTypes.visible,
                creator: creator._id,
                cover: { secure_url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80' },
                avatar: { secure_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&auto=format&fit=crop&q=80' },
                membersCount: 1420,
                postsCount: 38
            },
            {
                name: 'MERN Stack Masters & Architects',
                slug: 'mern-stack-masters-architects',
                description: 'Deep-dive community focused on MongoDB, Express.js, React 19, and Node.js. State management, REST/GraphQL APIs, real-time WebSockets, and serverless architectures.',
                rules: '1. Technical discussions and code snippets.\n2. Help fellow developers solve complex bugs.\n3. High-quality architecture topics.',
                category: 'Web Development',
                privacy: groupPrivacyTypes.public,
                visibility: groupVisibilityTypes.visible,
                creator: creator._id,
                cover: { secure_url: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?w=1200&auto=format&fit=crop&q=80' },
                avatar: { secure_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&auto=format&fit=crop&q=80' },
                membersCount: 980,
                postsCount: 27
            },
            {
                name: 'TypeScript & React Modern Ecosystem',
                slug: 'typescript-react-modern-ecosystem',
                description: 'Advanced TypeScript patterns, React Server Components, Next.js App Router, Vite tooling, Tailwind CSS, and scalable enterprise design patterns.',
                rules: '1. Strict TypeScript best practices.\n2. Modern React paradigms only.\n3. Constructive feedback on PRs and code.',
                category: 'Frontend & Architecture',
                privacy: groupPrivacyTypes.public,
                visibility: groupVisibilityTypes.visible,
                creator: creator._id,
                cover: { secure_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80' },
                avatar: { secure_url: 'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=400&auto=format&fit=crop&q=80' },
                membersCount: 850,
                postsCount: 19
            },
            {
                name: 'Node.js, Docker & Microservices Engineering',
                slug: 'nodejs-docker-microservices-engineering',
                description: 'Scalable backend architectures, distributed systems, Docker containers, Kubernetes, message queues (Kafka, RabbitMQ), and high-throughput Node.js APIs.',
                rules: '1. Focus on backend scalability and production reliability.\n2. Benchmark and architecture breakdowns.\n3. Clean code principles.',
                category: 'Backend Engineering',
                privacy: groupPrivacyTypes.public,
                visibility: groupVisibilityTypes.visible,
                creator: creator._id,
                cover: { secure_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80' },
                avatar: { secure_url: 'https://images.unsplash.com/photo-1607799279861-4dd421887fb3?w=400&auto=format&fit=crop&q=80' },
                membersCount: 720,
                postsCount: 15
            },
            {
                name: 'DevOps, Cloud & Full Stack CI/CD',
                slug: 'devops-cloud-fullstack-cicd',
                description: 'Cloud infrastructure for full-stack developers: AWS, GCP, Vercel, Docker, GitHub Actions CI/CD pipelines, Terraform, and zero-downtime production deployments.',
                rules: '1. Infrastructure as Code discussions.\n2. Security, secrets management and compliance.\n3. Automation and CI/CD tips.',
                category: 'DevOps & Cloud',
                privacy: groupPrivacyTypes.public,
                visibility: groupVisibilityTypes.visible,
                creator: creator._id,
                cover: { secure_url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80' },
                avatar: { secure_url: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=400&auto=format&fit=crop&q=80' },
                membersCount: 610,
                postsCount: 12
            }
        ];

        console.log('\n--- Seeding Groups ---');
        const createdGroups = [];
        for (const grp of groupsToSeed) {
            let existing = await groupModel.findOne({ slug: grp.slug });
            if (existing) {
                console.log(`Group already exists: "${grp.name}" (${grp.slug}) -> updating info`);
                Object.assign(existing, grp);
                await existing.save();
                createdGroups.push(existing);
            } else {
                const created = await groupModel.create(grp);
                console.log(`Created group: "${grp.name}" (${created._id})`);
                createdGroups.push(created);

                // Add creator as owner in GroupMember
                await groupMemberModel.findOneAndUpdate(
                    { groupId: created._id, userId: creator._id },
                    { groupId: created._id, userId: creator._id, role: groupMemberRoles.owner, status: groupMemberStatus.active },
                    { upsert: true, new: true }
                );
            }
        }

        // 3. Define 5 Technical Events related to Full Stack Developer
        const now = Date.now();
        const eventsToSeed = [
            {
                title: 'Full Stack Web Summit 2026',
                slug: 'full-stack-web-summit-2026',
                description: 'Annual flagship summit exploring next-gen full stack patterns: React 19, Node.js 22 LTS, micro-frontends, edge computing, AI integrations, and real-time architectures.',
                category: 'Tech Conference',
                startDate: new Date(now + 10 * 24 * 60 * 60 * 1000), // in 10 days
                endDate: new Date(now + 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
                time: '06:00 PM',
                timeZone: 'UTC',
                eventType: eventTypeCategories.online,
                location: 'Online Virtual Stage (Global Stream)',
                meetingUrl: 'https://meet.google.com/fullstack-summit-2026',
                privacy: eventPrivacyTypes.public,
                status: eventStatusTypes.upcoming,
                creator: creator._id,
                groupId: createdGroups[0]?._id,
                cover: { secure_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80' },
                maxAttendees: 500,
                attendeesCount: { going: 184, interested: 312, not_going: 2 }
            },
            {
                title: 'Building Scalable Microservices with Node.js & Docker',
                slug: 'scalable-microservices-nodejs-docker',
                description: 'Hands-on live engineering workshop building and clustering resilient microservices in Node.js with Redis caching, Docker containerization, and monitoring.',
                category: 'Workshop',
                startDate: new Date(now + 14 * 24 * 60 * 60 * 1000), // in 14 days
                endDate: new Date(now + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
                time: '05:00 PM',
                timeZone: 'UTC',
                eventType: eventTypeCategories.online,
                location: 'Tech Hub Virtual Lab',
                meetingUrl: 'https://meet.google.com/nodejs-docker-workshop',
                privacy: eventPrivacyTypes.public,
                status: eventStatusTypes.upcoming,
                creator: creator._id,
                groupId: createdGroups[3]?._id,
                cover: { secure_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&auto=format&fit=crop&q=80' },
                maxAttendees: 200,
                attendeesCount: { going: 96, interested: 145, not_going: 0 }
            },
            {
                title: 'React 19 & Next.js App Router Masterclass',
                slug: 'react-19-nextjs-masterclass',
                description: 'Deep dive into React 19 Actions, Server Components, optimistic UI, Suspense streaming, and full-stack performance optimization with practical code labs.',
                category: 'Masterclass',
                startDate: new Date(now + 20 * 24 * 60 * 60 * 1000), // in 20 days
                endDate: new Date(now + 20 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
                time: '04:30 PM',
                timeZone: 'UTC',
                eventType: eventTypeCategories.hybrid,
                location: 'Innovation Center Auditorium & Live Stream',
                address: 'Building 4, Smart Technology District',
                meetingUrl: 'https://meet.google.com/react19-nextjs-masterclass',
                privacy: eventPrivacyTypes.public,
                status: eventStatusTypes.upcoming,
                creator: creator._id,
                groupId: createdGroups[2]?._id,
                cover: { secure_url: 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=1200&auto=format&fit=crop&q=80' },
                maxAttendees: 300,
                attendeesCount: { going: 142, interested: 208, not_going: 4 }
            },
            {
                title: 'MongoDB Advanced Aggregation & Performance Indexing',
                slug: 'mongodb-advanced-aggregation-performance',
                description: 'Mastering MongoDB pipeline aggregations, compound indexing strategies, explain plans, replica sets, and query optimization for high-scale applications.',
                category: 'Database Engineering',
                startDate: new Date(now + 25 * 24 * 60 * 60 * 1000), // in 25 days
                endDate: new Date(now + 25 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
                time: '07:00 PM',
                timeZone: 'UTC',
                eventType: eventTypeCategories.online,
                location: 'Cloud DB Live Stage',
                meetingUrl: 'https://meet.google.com/mongo-scale-mastery',
                privacy: eventPrivacyTypes.public,
                status: eventStatusTypes.upcoming,
                creator: creator._id,
                groupId: createdGroups[1]?._id,
                cover: { secure_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80' },
                maxAttendees: 250,
                attendeesCount: { going: 110, interested: 180, not_going: 1 }
            },
            {
                title: 'Full Stack System Design & Architecture Bootcamp',
                slug: 'fullstack-system-design-bootcamp',
                description: 'Intensive architecture session on designing scalable web systems: load balancers, caching layers, database sharding, fault tolerance, and high availability.',
                category: 'Career & Architecture',
                startDate: new Date(now + 30 * 24 * 60 * 60 * 1000), // in 30 days
                endDate: new Date(now + 30 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
                time: '03:00 PM',
                timeZone: 'UTC',
                eventType: eventTypeCategories.in_person,
                location: 'Metropolitan Tech Center, Hall A',
                address: '100 Innovation Boulevard, Tech Park',
                privacy: eventPrivacyTypes.public,
                status: eventStatusTypes.upcoming,
                creator: creator._id,
                groupId: createdGroups[0]?._id,
                cover: { secure_url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80' },
                maxAttendees: 150,
                attendeesCount: { going: 85, interested: 190, not_going: 3 }
            }
        ];

        console.log('\n--- Seeding Events ---');
        for (const evt of eventsToSeed) {
            let existing = await eventModel.findOne({ slug: evt.slug });
            if (existing) {
                console.log(`Event already exists: "${evt.title}" (${evt.slug}) -> updating info`);
                Object.assign(existing, evt);
                await existing.save();
            } else {
                const created = await eventModel.create(evt);
                console.log(`Created event: "${evt.title}" (${created._id})`);

                // Register creator as going attendee
                await eventAttendeeModel.findOneAndUpdate(
                    { eventId: created._id, userId: creator._id },
                    { eventId: created._id, userId: creator._id, status: eventAttendeeStatus.going },
                    { upsert: true, new: true }
                );
            }
        }

        console.log('\n✅ Successfully seeded 5 Full Stack Groups and 5 Full Stack Events!');
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during seeding:', err);
        process.exit(1);
    }
}

seed();
