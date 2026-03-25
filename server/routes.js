import { createServer } from "node:http";
import authRouter from "./auth";
import { setupRooms } from "./rooms";
export async function registerRoutes(app) {
    app.use("/api/auth", authRouter);
    const httpServer = createServer(app);
    setupRooms(httpServer);
    return httpServer;
}
