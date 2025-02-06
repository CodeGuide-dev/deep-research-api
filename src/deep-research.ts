import FirecrawlApp, { SearchResponse } from '@mendable/firecrawl-js';
import { generateObject } from 'ai';
import { compact } from 'lodash-es';
import pLimit from 'p-limit';
import { z } from 'zod';

import dotenv from 'dotenv';

dotenv.config();

import { o3MiniModel, trimPrompt } from './ai/providers.js';
import { systemPrompt } from './prompt.js';


type ResearchResult = {
  learnings: string[];
  visitedUrls: string[];
  usage: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  };
};

// increase this if you have higher API rate limits
const ConcurrencyLimit = 2;

// Initialize Firecrawl with optional API key and optional base url

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_KEY ?? '',
  apiUrl: process.env.FIRECRAWL_BASE_URL,
});

// take en user query, return a list of SERP queries
async function generateSerpQueries({
  query,
  numQueries = 3,
  learnings,
}: {
  query: string;
  numQueries?: number;

  // optional, if provided, the research will continue from the last learning
  learnings?: string[];
}) {
  const res = await generateObject({
    model: o3MiniModel,
    system: systemPrompt(),
    prompt: `Given the following prompt from the user, generate a list of SERP queries to research the topic. Return a maximum of ${numQueries} queries, but feel free to return less if the original prompt is clear. Make sure each query is unique and not similar to each other: <prompt>${query}</prompt>\n\n${learnings
      ? `Here are some learnings from previous research, use them to generate more specific queries: ${learnings.join(
        '\n',
      )}`
      : ''
      }`,
    schema: z.object({
      queries: z
        .array(
          z.object({
            query: z.string().describe('The SERP query'),
            researchGoal: z
              .string()
              .describe(
                'First talk about the goal of the research that this query is meant to accomplish, then go deeper into how to advance the research once the results are found, mention additional research directions. Be as specific as possible, especially for additional research directions.',
              ),
          }),
        )
        .describe(`List of SERP queries, max of ${numQueries}`),
    }),
  });
  console.log(
    `Created ${res.object.queries.length} queries`,
    res.object.queries,
  );

  return {
    queries: res.object.queries.slice(0, numQueries),
    usage: res.usage,
  };
}

async function processSerpResult({
  query,
  result,
  numLearnings = 3,
  numFollowUpQuestions = 3,
}: {
  query: string;
  result: SearchResponse;
  numLearnings?: number;
  numFollowUpQuestions?: number;
}) {
  const contents = compact(result.data.map(item => item.markdown)).map(
    content => trimPrompt(content, 25_000),
  );
  console.log(`Ran ${query}, found ${contents.length} contents`);

  const res = await generateObject({
    model: o3MiniModel,
    abortSignal: AbortSignal.timeout(60_000),
    system: systemPrompt(),
    prompt: `Given the following contents from a SERP search for the query <query>${query}</query>, generate a list of learnings from the contents. Return a maximum of ${numLearnings} learnings, but feel free to return less if the contents are clear. Make sure each learning is unique and not similar to each other. The learnings should be concise and to the point, as detailed and infromation dense as possible. Make sure to include any entities like people, places, companies, products, things, etc in the learnings, as well as any exact metrics, numbers, or dates. The learnings will be used to research the topic further.\n\n<contents>${contents
      .map(content => `<content>\n${content}\n</content>`)
      .join('\n')}</contents>`,
    schema: z.object({
      learnings: z
        .array(z.string())
        .describe(`List of learnings, max of ${numLearnings}`),
      followUpQuestions: z
        .array(z.string())
        .describe(
          `List of follow-up questions to research the topic further, max of ${numFollowUpQuestions}`,
        ),
    }),
  });
  console.log(
    `Created ${res.object.learnings.length} learnings`,
    res.object.learnings,
  );

  return {
    ...res.object,
    usage: res.usage,
  };
}

export async function writeFinalReport({
  prompt,
  learnings,
  visitedUrls,
}: {
  prompt: string;
  learnings: string[];
  visitedUrls: string[];
}) {
  const learningsString = trimPrompt(
    learnings
      .map(learning => `<learning>\n${learning}\n</learning>`)
      .join('\n'),
    150_000,
  );

  const res = await generateObject({
    model: o3MiniModel,
    system: systemPrompt(),
    prompt: `Given the following prompt from the user, write a final report on the topic using the learnings from research. Make it as as detailed as possible, aim for 3 or more pages, include ALL the learnings from research:\n\n<prompt>${prompt}</prompt>\n\nHere are all the learnings from previous research:\n\n<learnings>\n${learningsString}\n</learnings>`,
    schema: z.object({
      reportMarkdown: z
        .string()
        .describe('Final report on the topic in Markdown'),
    }),
  });

  // Append the visited URLs section to the report
  const urlsSection = `\n\n## Sources\n\n${visitedUrls.map(url => `- ${url}`).join('\n')}`;
  return {
    reportMarkdown: res.object.reportMarkdown + urlsSection,
    usage: res.usage,
  };
}

export async function deepResearch({
  query,
  breadth,
  depth,
  learnings = [],
  visitedUrls = [],
  firecrawlKey,
}: {
  query: string;
  breadth: number;
  depth: number;
  learnings?: string[];
  visitedUrls?: string[];
  firecrawlKey?: string;
}): Promise<ResearchResult> {
  // Create a new Firecrawl instance if a custom key is provided
  const client = firecrawlKey ? new FirecrawlApp({
    apiKey: firecrawlKey,
    apiUrl: process.env.FIRECRAWL_BASE_URL,
  }) : firecrawl;

  const serpQueriesResult = await generateSerpQueries({
    query,
    learnings,
    numQueries: breadth,
  });
  const limit = pLimit(ConcurrencyLimit);

  const promises = serpQueriesResult.queries.map((serpQuery) => {
    return limit(async () => {
      try {
        const result = await client.search(serpQuery.query, {
          timeout: 15000,
          limit: 5,
          scrapeOptions: { formats: ['markdown'] },
        });

        // Collect URLs from this search
        const newUrls = compact(result.data.map(item => item.url));
        const newBreadth = Math.ceil(breadth / 2);
        const newDepth = depth - 1;

        const newLearningsResult = await processSerpResult({
          query: serpQuery.query,
          result,
          numFollowUpQuestions: newBreadth,
        });
        const allLearnings = [...learnings, ...newLearningsResult.learnings];
        const allUrls = [...visitedUrls, ...newUrls];

        if (newDepth > 0) {
          console.log(
            `Researching deeper, breadth: ${newBreadth}, depth: ${newDepth}`,
          );

          const nextQuery = `
          Previous research goal: ${serpQuery.researchGoal}
          Follow-up research directions: ${newLearningsResult.followUpQuestions.map(q => `\n${q}`).join('')}
        `.trim();

          return deepResearch({
            query: nextQuery,
            breadth: newBreadth,
            depth: newDepth,
            learnings: allLearnings,
            visitedUrls: allUrls,
            firecrawlKey,
          });
        } else {
          return {
            learnings: allLearnings,
            visitedUrls: allUrls,
            usage: {
              totalTokens: serpQueriesResult.usage.totalTokens + newLearningsResult.usage.totalTokens,
              promptTokens: serpQueriesResult.usage.promptTokens + newLearningsResult.usage.promptTokens,
              completionTokens: serpQueriesResult.usage.completionTokens + newLearningsResult.usage.completionTokens,
            },
          };
        }
      } catch (e) {
        console.error(`Error running query: ${serpQuery.query}: `, e);
        return {
          learnings: [],
          visitedUrls: [],
          usage: {
            totalTokens: serpQueriesResult.usage.totalTokens,
            promptTokens: serpQueriesResult.usage.promptTokens,
            completionTokens: serpQueriesResult.usage.completionTokens,
          },
        };
      }
    });
  });

  const results = await Promise.all(promises) as ResearchResult[];

  // Aggregate usage across all results
  const totalUsage = results.reduce((acc, curr) => ({
    totalTokens: acc.totalTokens + curr.usage.totalTokens,
    promptTokens: acc.promptTokens + curr.usage.promptTokens,
    completionTokens: acc.completionTokens + curr.usage.completionTokens,
  }), {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
  });

  return {
    learnings: [...new Set(results.flatMap(r => r.learnings))],
    visitedUrls: [...new Set(results.flatMap(r => r.visitedUrls))],
    usage: totalUsage,
  };
}
