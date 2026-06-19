export interface NutritionData {
  name: string;
  brand: string;
  servingSize: string;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
}

export type LookupResult =
  | { status: 'found'; data: NutritionData }
  | { status: 'not_found' }
  | { status: 'error'; message: string };

function parseServingGrams(servingSize: string): number {
  const match = servingSize.match(/(\d+(\.\d+)?)\s*g/i);
  return match ? parseFloat(match[1]) : 100;
}

export function scalePer100g(per100g: NutritionData['per100g'], grams: number) {
  const factor = grams / 100;
  return {
    calories: Math.round(per100g.calories * factor),
    protein: Math.round(per100g.protein * factor * 10) / 10,
    carbs: Math.round(per100g.carbs * factor * 10) / 10,
    fat: Math.round(per100g.fat * factor * 10) / 10,
    fiber: Math.round(per100g.fiber * factor * 10) / 10,
  };
}

export async function fetchProductByBarcode(barcode: string): Promise<LookupResult> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'PhasePlate/1.0 (iancoulas@coulascreations.com)',
        },
      }
    );

    if (!response.ok) {
      return { status: 'error', message: `HTTP ${response.status}` };
    }

    const json = await response.json();

    if (json.status !== 1 || !json.product) {
      return { status: 'not_found' };
    }

    const p = json.product;
    const n = p.nutriments ?? {};

    return {
      status: 'found',
      data: {
        name: p.product_name || 'Unknown product',
        brand: p.brands || '',
        servingSize: p.serving_size || '100g',
        per100g: {
          calories: n['energy-kcal_100g'] ?? n['energy_100g'] ?? 0,
          protein: n['proteins_100g'] ?? 0,
          carbs: n['carbohydrates_100g'] ?? 0,
          fat: n['fat_100g'] ?? 0,
          fiber: n['fiber_100g'] ?? 0,
        },
      },
    };
  } catch (err) {
    return { status: 'error', message: String(err) };
  }
}

export { parseServingGrams };
