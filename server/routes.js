import { createServer } from "node:http";
import authRouter from "./auth.js";
import { setupRooms } from "./rooms.js";
export async function registerRoutes(app) {
    app.use("/api/auth", authRouter);
    const httpServer = createServer(app);
    setupRooms(httpServer);
    return httpServer;
}
