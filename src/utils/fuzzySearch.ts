/**
 * Typo-Tolerant Fuzzy Search Engine for Retail POS
 * Allows cashiers to rapidly find items even with misspelling, partial tokens, or transposed keys.
 */

import { Product } from '../types';

/**
 * Standard Levenshtein distance calculation
 */
export const levenshteinDistance = (a: string, b: string): number => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

export interface ScoredProduct {
  product: Product;
  score: number;
  matchType: 'exact' | 'prefix' | 'token' | 'fuzzy';
}

/**
 * Perform intelligent scored fuzzy search over products
 */
export const searchProductsFuzzy = (
  products: Product[],
  rawQuery: string,
  categoryId: string = 'all',
  filterLowStock: boolean = false
): ScoredProduct[] => {
  const query = rawQuery.trim().toLowerCase();

  // If query is empty, simply return filtered products with score 0
  if (!query) {
    return products
      .filter((p) => {
        const catMatch = categoryId === 'all' || p.categoryId === categoryId;
        const stockMatch = !filterLowStock || p.stock <= p.minStock;
        return catMatch && stockMatch;
      })
      .map((p) => ({ product: p, score: 0, matchType: 'exact' }));
  }

  const normalizedQuery = query.replace(/[^a-z0-9]/gi, '');
  const queryTokens = query.split(/\s+/).filter(Boolean);
  const isExplicitSku = query.startsWith('sku:');
  const skuQuery = isExplicitSku ? query.replace(/^sku:\s*/, '') : query;
  const normalizedSkuQuery = skuQuery.replace(/[^a-z0-9]/gi, '');

  const scored: ScoredProduct[] = [];

  for (const product of products) {
    // 1. Category and stock filters
    if (categoryId !== 'all' && product.categoryId !== categoryId) continue;
    if (filterLowStock && product.stock > product.minStock) continue;

    const name = (product.name || '').toLowerCase();
    const sku = (product.sku || '').toLowerCase();
    const normSku = sku.replace(/[^a-z0-9]/gi, '');
    const barcode = (product.barcode || '').toLowerCase();
    const normBarcode = barcode.replace(/[^a-z0-9]/gi, '');
    const brand = (product.brand || '').toLowerCase();

    let score = 0;
    let matchType: 'exact' | 'prefix' | 'token' | 'fuzzy' = 'fuzzy';

    // A. Explicit SKU search
    if (isExplicitSku) {
      if (sku === skuQuery || (normSku && normSku === normalizedSkuQuery)) {
        scored.push({ product, score: 1000, matchType: 'exact' });
        continue;
      } else if (sku.includes(skuQuery) || (normalizedSkuQuery && normSku.includes(normalizedSkuQuery))) {
        scored.push({ product, score: 500, matchType: 'prefix' });
        continue;
      }
      continue;
    }

    // B. Barcode match (highest priority for scanner)
    if (barcode === query || (normBarcode && normBarcode === normalizedQuery)) {
      scored.push({ product, score: 999, matchType: 'exact' });
      continue;
    } else if (barcode.startsWith(query) || (normalizedQuery.length >= 3 && normBarcode.startsWith(normalizedQuery))) {
      score += 450;
      matchType = 'prefix';
    }

    // C. Exact SKU match
    if (sku === query || (normSku && normSku === normalizedQuery)) {
      score += 400;
      matchType = 'exact';
    } else if (sku.startsWith(query) || (normalizedQuery.length >= 2 && normSku.startsWith(normalizedQuery))) {
      score += 250;
      matchType = 'prefix';
    }

    // D. Name Exact & Prefix Match
    if (name === query) {
      score += 350;
      matchType = 'exact';
    } else if (name.startsWith(query)) {
      score += 200;
      matchType = 'prefix';
    } else if (name.includes(query)) {
      score += 150;
      matchType = 'prefix';
    }

    // E. Brand match
    if (brand && (brand.includes(query) || query.includes(brand))) {
      score += 80;
    }

    // F. Multi-token match (e.g. "susu coklat ultra" matches "Ultra Milk Coklat 250ml")
    if (queryTokens.length > 1) {
      const nameTokens = name.split(/\s+/);
      let matchedTokensCount = 0;

      for (const qToken of queryTokens) {
        const tokenMatch = nameTokens.some((nToken) => {
          if (nToken.includes(qToken)) return true;
          // Typo match for token of length >= 4
          if (qToken.length >= 4 && Math.abs(nToken.length - qToken.length) <= 2) {
            return levenshteinDistance(qToken, nToken) <= 1;
          }
          return false;
        });

        if (tokenMatch) {
          matchedTokensCount++;
        }
      }

      if (matchedTokensCount === queryTokens.length) {
        score += 180;
        matchType = 'token';
      } else if (matchedTokensCount > 0) {
        score += matchedTokensCount * 30;
      }
    }

    // G. Fuzzy Typo-tolerance on product name words if still low score
    if (score === 0 && query.length >= 3) {
      const nameWords = name.split(/\s+/);
      for (const word of nameWords) {
        if (word.length >= 3) {
          const maxDistance = query.length <= 4 ? 1 : 2;
          const dist = levenshteinDistance(query, word);
          if (dist <= maxDistance) {
            score += (100 - dist * 30);
            matchType = 'fuzzy';
            break;
          }
        }
      }
    }

    if (score > 0) {
      scored.push({ product, score, matchType });
    }
  }

  // Sort descending by relevance score
  return scored.sort((a, b) => b.score - a.score);
};
