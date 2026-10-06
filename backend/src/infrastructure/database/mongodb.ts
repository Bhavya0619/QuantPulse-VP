import {
    MongoClient,
    type Db,
} from "mongodb";

import { config } from "../../config/env.js";

const client = new MongoClient(config.mongodb.uri);

let database: Db | null = null;

export const connectMongoDB = async (): Promise<Db> => {
    if (database) {
        return database;
    }

    await client.connect();

    database = client.db(config.mongodb.databaseName);

    await database.command({ ping: 1 });

    console.log(
        `MongoDB connected: ${config.mongodb.databaseName}`,
    );

    return database;
};

export const getMongoDB = (): Db => {
    if (!database) {
        throw new Error(
            "MongoDB has not been connected. Call connectMongoDB() first.",
        );
    }

    return database;
};

export const disconnectMongoDB = async (): Promise<void> => {
    await client.close();

    database = null;

    console.log("MongoDB disconnected");
};

export const checkMongoHealth = async (): Promise<{ status: "connected" | "disconnected" | "error"; latencyMs?: number; error?: string }> => {
    if (!database) {
        return { status: "disconnected" };
    }
    try {
        const start = Date.now();
        await database.command({ ping: 1 });
        const latencyMs = Date.now() - start;
        return { status: "connected", latencyMs };
    } catch (err) {
        return {
            status: "error",
            error: err instanceof Error ? err.message : String(err),
        };
    }
};

export const ensureMongoIndexes = async (): Promise<void> => {
    const db = getMongoDB();

    await db.collection("datasets").createIndex(
        { id: 1 },
        { unique: true },
    );

    await db.collection("datasets").createIndex({
        symbol: 1,
        timeframe: 1,
    });

    await db.collection("market_bars").createIndex(
        {
            datasetId: 1,
            symbol: 1,
            timestamp: 1,
        },
        {
            unique: true,
        },
    );
};

export const ensureDefaultDatasetSeeded = async (): Promise<void> => {
    const db = getMongoDB();
    try {
        const count = await db.collection("datasets").countDocuments();
        if (count === 0) {
            const { SAMPLE_DATASET, SAMPLE_BARS } = await import("./sample-data.js");
            console.log("Seeding default RELIANCE market dataset into MongoDB...");
            await db.collection("datasets").insertOne({
                id: SAMPLE_DATASET.id,
                name: SAMPLE_DATASET.name,
                symbol: SAMPLE_DATASET.symbol,
                timeframe: SAMPLE_DATASET.timeframe,
                source: SAMPLE_DATASET.source,
                description: SAMPLE_DATASET.description,
                createdAt: SAMPLE_DATASET.createdAt,
                updatedAt: SAMPLE_DATASET.updatedAt,
            });

            await db.collection("market_bars").insertMany(
                SAMPLE_BARS.map((bar) => ({
                    datasetId: bar.datasetId,
                    symbol: bar.symbol,
                    timestamp: bar.timestamp,
                    open: bar.open,
                    high: bar.high,
                    low: bar.low,
                    close: bar.close,
                    volume: bar.volume,
                })),
            );
            console.log("Default market dataset seeded successfully (10 bars).");
        }
    } catch (err) {
        console.warn("Could not seed default dataset (non-fatal):", err);
    }
};
