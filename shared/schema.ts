import { z } from 'zod';

export const DIRECTIONS = ['North', 'East', 'South', 'West'] as const;

export const directionSchema = z.enum(DIRECTIONS);

export const mapNodeSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  code: z.number().int().nonnegative(),
  directions: z.array(directionSchema).max(4).optional(),
  charger: z.object({ direction: directionSchema }).optional(),
  chute: z.object({ direction: directionSchema }).optional(),
  name: z.string().trim().min(1).max(80).optional(),
});

export const mapDocumentSchema = z.object({
  map: z.object({
    maxNeighborDistance: z.number().int().positive(),
    nodes: z.array(mapNodeSchema).max(10_000),
  }),
});

export type Direction = z.infer<typeof directionSchema>;
export type MapNode = z.infer<typeof mapNodeSchema>;
export type MapDocument = z.infer<typeof mapDocumentSchema>;

export function formatValidationIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join('.') : 'document';
    return `${path}: ${issue.message}`;
  });
}
