import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { createSessionToken, publicUser, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { authError, authSuccess, readAuthBody, sameOrigin } from "@/lib/auth-response";
import { validateCredentials } from "@/lib/auth-validation";

export const runtime = "nodejs";
// Fixed valid bcrypt hash for absent users, so unknown emails still do password work.
const DUMMY_HASH = "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return authError("forbidden", 403, request);
  try {
    const body = await readAuthBody(request);
    if (!body) return authError("invalidRequest", 400, request);
    const validation = validateCredentials(body, false);
    if (validation) return authError(validation, 400, request);
    await connectDB();
    const user = await User.findOne({ email: (body.email as string).trim().toLowerCase() }).select("+passwordHash");
    const matches = await bcrypt.compare(body.password as string, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !matches) return authError("invalidCredentials", 401, request);
    const token = await createSessionToken(String(user._id));
    const response = authSuccess({ user: publicUser(user) });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch {
    return authError("serverError", 500, request);
  }
}
