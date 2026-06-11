import { createMiddleware } from "@tanstack/react-start";
import { getStoredBlockchairKey } from "./api-key-store";

// Attaches the user's stored Blockchair API key (if any, and only if it
// passes shape validation) as a request header. The server reads the header
// inside `bcFetch` and uses it in place of the project-default key.
// The key never leaves the user's browser except in this header.
export const attachBlockchairKey = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const key = getStoredBlockchairKey();
    return next({
      headers: key ? { "x-blockchair-key": key } : {},
    });
  },
);
