export type RedisConnectionOptions = {
    readonly host: string;
    readonly port: number;
    readonly username?: string;
    readonly password?: string;
    readonly db?: number;
    readonly tls?: Record<string, never>;
};

export function createRedisConnectionOptions(redisConnectionString: string): RedisConnectionOptions {
    let parsedUrl: URL;

    try {
        parsedUrl = new URL(redisConnectionString);
    } catch {
        throw new Error("REDIS_URL must be a valid URL");
    }

    const dbPath = parsedUrl.pathname.replace(/^\//u, "");
    const connection: {
        host: string;
        port: number;
        username?: string;
        password?: string;
        db?: number;
        tls?: Record<string, never>;
    } = {
        host: parsedUrl.hostname,
        port: parseInt(parsedUrl.port === "" ? "6379" : parsedUrl.port, 10),
    };

    if (Number.isNaN(connection.port)) {
        throw new Error("REDIS_URL port must be a valid number");
    }

    if (parsedUrl.username.length > 0) {
        connection.username = decodeURIComponent(parsedUrl.username);
    }

    if (parsedUrl.password.length > 0) {
        connection.password = decodeURIComponent(parsedUrl.password);
    }

    if (dbPath.length > 0) {
        const db = parseInt(dbPath, 10);
        if (Number.isNaN(db)) {
            throw new Error("REDIS_URL database must be a valid number");
        }

        connection.db = db;
    }

    if (parsedUrl.protocol === "rediss:") {
        connection.tls = {};
    }

    return connection;
}
