import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { publicUser } from "@/lib/auth";
import { authError, authSuccess, readAuthBody, sameOrigin } from "@/lib/auth-response";
import { signupRole, validateCredentials } from "@/lib/auth-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return authError("forbidden", 403, request);
  try {
    const body = await readAuthBody(request);
    if (!body) return authError("invalidRequest", 400, request);
    const validation = validateCredentials(body, true);
    if (validation) return authError(validation, 400, request);
    const email = (body.email as string).trim().toLowerCase();
    if (!process.env.ADMIN_EMAIL) throw new Error("ADMIN_EMAIL is missing.");
    await connectDB();
    await User.init();
    if (await User.exists({ email })) return authError("emailTaken", 400, request);
    const passwordHash = await bcrypt.hash(body.password as string, 12);
    const user = await User.create({
      name: (body.name as string).trim(), email, phone: (body.phone as string).trim(), passwordHash,
      role: signupRole(email, process.env.ADMIN_EMAIL),
    });
    return authSuccess({ user: publicUser(user) }, 201);
  } catch (error) {
    if ((error as { code?: number }).code === 11000) return authError("emailTaken", 400, request);
    return authError("serverError", 500, request);
  }
}
