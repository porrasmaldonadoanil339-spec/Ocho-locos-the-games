"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const node_http_1 = require("node:http");
const auth_1 = __importDefault(require("./auth"));
const rooms_1 = require("./rooms");
function registerRoutes(app) {
    return __awaiter(this, void 0, void 0, function* () {
        app.use("/api/auth", auth_1.default);
        const httpServer = (0, node_http_1.createServer)(app);
        (0, rooms_1.setupRooms)(httpServer);
        return httpServer;
    });
}
