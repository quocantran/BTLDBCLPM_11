import { customAlphabet } from 'nanoid';
import { Model } from 'mongoose';

const NUMERIC_LENGTH = 6;
const numericId = customAlphabet('0123456789', NUMERIC_LENGTH);

/**
 * Generate a unique public identifier using the provided prefix and a numeric suffix.
 * Ensures uniqueness by checking the target collection for collisions before returning.
 */
export async function generatePrefixedPublicId<T extends { publicId: string }>(
  prefix: string,
  model: Model<T>,
): Promise<string> {
  while (true) {
    const candidate = `${prefix}${numericId()}`;
    const exists = await model.exists({ publicId: candidate });
    if (!exists) {
      return candidate;
    }
  }
}
