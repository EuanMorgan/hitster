import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

// Setup MSW worker for browser environment (Playwright)
export const worker = setupWorker(...handlers);
