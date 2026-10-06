import createApp from "./app.js";

import { config } from "./config/env.js";

import {
    connectMongoDB,
    disconnectMongoDB,
    ensureMongoIndexes,
    ensureDefaultDatasetSeeded,
} from "./infrastructure/database/mongodb.js";

const startServer = async (): Promise<void> => {
    try {
        await connectMongoDB();

        await ensureMongoIndexes();

        await ensureDefaultDatasetSeeded();

        const app = createApp();

        const server = app.listen(config.port, () => {
            console.log(
                `QuantPulse backend running on port ${config.port}`,
            );
        });

        const shutdown = async (signal: string): Promise<void> => {
            console.log(`${signal} received. Shutting down...`);

            server.close(async () => {
                await disconnectMongoDB();

                process.exit(0);
            });
        };

        process.on("SIGINT", () => {
            void shutdown("SIGINT");
        });

        process.on("SIGTERM", () => {
            void shutdown("SIGTERM");
        });
    } catch (error) {
        console.error(
            "Failed to start QuantPulse backend:",
            error,
        );

        process.exit(1);
    }
};

void startServer();
