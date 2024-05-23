import { z } from "zod";

export const FinalResponseSchema = {
  Response: z.object({
    text: z.string().describe(`
      You must formulate a response by taking in account the given context and user prompt
    `),
  }),
};
