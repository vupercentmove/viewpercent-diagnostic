import { createAdminAuthHandlers } from "@/lib/admin-auth-handler";

export const runtime = "nodejs";

const handlers = createAdminAuthHandlers();
export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
