import { NextResponse } from 'next/server';
import { invalidateProfileCache } from '@/app/lib/cacheTags';
import { auth } from '@clerk/nextjs/server';
import { createItemSchema, validationError } from '@/app/lib/validations';
import { logger } from '@/app/lib/logger';
import { itemService, ServiceError } from '@/app/services';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Tu n'as pas accès à ça.", { status: 401 });

  try {
    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const newItem = await itemService.createItem(userId, parsed.data);
    invalidateProfileCache(userId);
    return NextResponse.json(newItem);
  } catch (error) {
    if (error instanceof ServiceError) {
      return new NextResponse(error.message, { status: error.status });
    }
    logger.error("API_POST_ITEM", { userId }, error);
    return new NextResponse("Oups, petit bug. Réessaie ?", { status: 500 });
  }
}
