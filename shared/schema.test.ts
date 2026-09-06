import { describe, expect, it } from 'vitest';
import { mapDocumentSchema } from './schema';

describe('mapDocumentSchema', () => {
  it('accepts all supported optional node properties', () => {
    expect(
      mapDocumentSchema.safeParse({
        map: {
          maxNeighborDistance: 1500,
          nodes: [{
            x: -100,
            y: 200,
            code: 3,
            name: 'CHARGE_AND_CHUTE',
            directions: ['North', 'East', 'South', 'West'],
            charger: { direction: 'West' },
            chute: { direction: 'North' },
          }],
        },
      }).success,
    ).toBe(true);
  });

  it.each([
    ['fractional coordinates', { x: 1.5, y: 2, code: 3 }],
    ['negative QR codes', { x: 1, y: 2, code: -1 }],
    ['unknown travel directions', { x: 1, y: 2, code: 3, directions: ['Up'] }],
    ['unknown charger directions', { x: 1, y: 2, code: 3, charger: { direction: 'Up' } }],
    ['blank names', { x: 1, y: 2, code: 3, name: '   ' }],
  ])('rejects %s', (_description, node) => {
    expect(
      mapDocumentSchema.safeParse({
        map: { maxNeighborDistance: 1500, nodes: [node] },
      }).success,
    ).toBe(false);
  });

  it('requires a positive integer maximum neighbor distance', () => {
    expect(
      mapDocumentSchema.safeParse({
        map: { maxNeighborDistance: 0, nodes: [] },
      }).success,
    ).toBe(false);
  });
});
