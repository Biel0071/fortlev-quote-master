import { generateStandardProductDescription as gen } from "@/utils/generateStandardProductDescription";

export type ProductDescSeed = {
  id?: string | null;
  name: string;
  categoryName?: string | null;
  sku?: string | null;
  unit?: string | null;
};

export const generateStandardProductDescription = gen;

// compat: keep old name for existing imports
export const generateProductDescriptionMarkdown = gen;

