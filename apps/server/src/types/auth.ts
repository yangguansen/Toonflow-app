import type { AuthUser } from "@/utils/auth/supabase";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

export {};

