import { z } from "zod";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { env } from "~/env";

// Mocked DB
interface Post {
  id: number;
  name: string;
}
const posts: Post[] = [
  {
    id: 1,
    name: "Hello World",
  },
];

// Initialize Google Generative AI
// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// Helper function to convert base64 to GenerativePart
// Assumes JPEG format, adjust if needed or pass mimeType from client
function fileToGenerativePart(base64: string, mimeType = "image/jpeg") {
  return {
    inlineData: {
      data: base64,
      mimeType,
    },
  };
}

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => ({
      greeting: `Hello ${input.text}`,
    })),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const post: Post = {
        id: posts.length + 1,
        name: input.name,
      };
      posts.push(post);
      return post;
    }),

  getLatest: publicProcedure.query(() => posts.at(-1) ?? null),

  getChessBoardResponse: publicProcedure
    .input(z.object({ imageBase64: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-preview-04-17",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      const prompt = `Analyze the chess board image. Identify the single best legal move for white and the single best legal move for black based on the current position. Respond ONLY with a valid JSON object in the following format: {"whiteBestMove": {"from": "e2", "to": "e4", "comments": "Best opening move"}, "blackBestMove": {"from": "g8", "to": "f6", "comments": "Develop knight"}}. If the board is empty, unclear, or a side has no legal moves, represent that move as null, e.g., {"whiteBestMove": null, "blackBestMove": {"from": "g8", "to": "f6", "comments": "Develop knight"}}.`;

      const imagePart = fileToGenerativePart(input.imageBase64);

      const result = await model.generateContent([prompt, imagePart]);
      const responseText = result.response.text();

      const moveSchema = z.object({
        from: z.string(),
        to: z.string(),
        comments: z.string(),
      });
      const movesDataSchema = z.object({
        whiteBestMove: moveSchema.nullable(),
        blackBestMove: moveSchema.nullable(),
      });

      try {
        const cleanedText = responseText.replace(/```json\n?|```/g, "").trim();
        const parsed = JSON.parse(cleanedText) as unknown;
        return movesDataSchema.parse(parsed);
      } catch {
        throw new Error("Failed to parse AI response as JSON.");
      }
    }),
});
