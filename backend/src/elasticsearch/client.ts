import { Client } from '@elastic/elasticsearch';
import { config } from '../config/env';
import { prisma } from '../config/db';

export const esClient = new Client({
  node: config.elasticsearchUrl,
  maxRetries: 3,
  requestTimeout: 5000,
});

const INDEX_NAME = 'emails';

export async function initElasticsearch() {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });
    if (!exists) {
      await esClient.indices.create({
        index: INDEX_NAME,
        mappings: {
          properties: {
            id: { type: 'keyword' },
            scheduleId: { type: 'keyword' },
            userId: { type: 'keyword' },
            sender: { type: 'keyword' },
            recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            subject: { type: 'text' },
            body: { type: 'text' },
            status: { type: 'keyword' },
            scheduledAt: { type: 'date' },
            sentAt: { type: 'date' },
            createdAt: { type: 'date' },
          },
        },
      });
      console.log(`✅ Elasticsearch index '${INDEX_NAME}' created`);
    } else {
      console.log(`✅ Elasticsearch index '${INDEX_NAME}' exists`);
    }
  } catch (error: any) {
    console.warn(`⚠️ Elasticsearch init warning (falling back to database search if ES unavailable): ${error.message}`);
  }
}

export interface EmailDocument {
  id: string; // recipient ID
  scheduleId: string;
  userId: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  createdAt: Date;
}

export async function indexEmail(doc: EmailDocument) {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: doc.id,
      document: {
        id: doc.id,
        scheduleId: doc.scheduleId,
        userId: doc.userId,
        sender: doc.sender,
        recipient: doc.recipient,
        subject: doc.subject,
        body: doc.body,
        status: doc.status,
        scheduledAt: doc.scheduledAt.toISOString(),
        sentAt: doc.sentAt ? doc.sentAt.toISOString() : null,
        createdAt: doc.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.warn(`⚠️ Elasticsearch indexing failed for recipient ${doc.id}: ${error.message}`);
  }
}

export async function searchEmailsInES(userId: string, query: string, status?: string) {
  try {
    const mustClause: any[] = [{ match: { userId } }];
    if (status) {
      mustClause.push({ term: { status } });
    }

    const response = await esClient.search({
      index: INDEX_NAME,
      query: {
        bool: {
          must: mustClause,
          should: [
            { match_phrase_prefix: { recipient: query } },
            { match_phrase_prefix: { subject: query } },
            { match_phrase_prefix: { body: query } },
            { wildcard: { recipient: `*${query.toLowerCase()}*` } },
            { wildcard: { subject: `*${query.toLowerCase()}*` } },
          ],
          minimum_should_match: 1,
        },
      },
    });

    const hits = response.hits.hits.map((hit: any) => hit._source);
    return hits;
  } catch (error: any) {
    console.warn(`⚠️ Elasticsearch search failed: ${error.message}. Falling back to DB search.`);
    
    // Database Fallback Search using Prisma
    const recipients = await prisma.emailRecipient.findMany({
      where: {
        schedule: { userId },
        ...(status ? { status: status as any } : {}),
        OR: [
          { email: { contains: query } },
          { schedule: { subject: { contains: query } } },
          { schedule: { body: { contains: query } } },
        ],
      },
      include: {
        schedule: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });

    return recipients.map((r) => ({
      id: r.id,
      scheduleId: r.scheduleId,
      userId: r.schedule.userId,
      sender: r.schedule.sender,
      recipient: r.email,
      subject: r.schedule.subject,
      body: r.schedule.body,
      status: r.status,
      scheduledAt: r.scheduledAt,
      sentAt: r.sentAt,
      createdAt: r.createdAt,
    }));
  }
}
