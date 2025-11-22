import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in environment variables");
}

export const generateToken = (walletAddress: string): string => {
  return jwt.sign(
    { walletAddress },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
};

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.error("Invalid or expired token:", err);
    return null; // Podés devolver null o tirar error
  }
};
