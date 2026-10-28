import { existsSync } from "fs";
import { Client } from "pg";
import bcrypt from "bcrypt";
import { UserRole, UserStatus } from "../constants/constants";

interface ConnectionSettings {
    config: {
        host?: string;
        port?: number;
        user?: string;
        password?: string;
        database?: string;
        connectionString?: string;
        ssl?: false | { require: boolean; rejectUnauthorized: boolean };
    };
    label: string; // where it connects to, for the log line (never the credentials)
}

function connectionSettings(): ConnectionSettings {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME, DATABASE_URL } = process.env;

    if (DB_HOST && DB_USER && DB_NAME) {
        return {
            config: {
                host: DB_HOST,
                port: Number(DB_PORT) || 5432,
                user: DB_USER,
                password: DB_PASS,
                database: DB_NAME,
            },
            label: `database "${DB_NAME}" on ${DB_HOST}`,
        };
    }

    if (!DATABASE_URL) {
        console.error("Neither DB_HOST/DB_USER/DB_NAME nor DATABASE_URL is set (looked in the environment and in ./.env).");
        process.exit(1);
    }

    let target: URL;
    try {
        target = new URL(DATABASE_URL);
    } catch {
        console.error("DATABASE_URL is not a valid connection URL.");
        process.exit(1);
    }

    // Hosted databases need TLS; a local one usually doesn't offer it.
    const isLoopback = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(target.hostname);

    return {
        config: {
            connectionString: DATABASE_URL,
            ssl: isLoopback ? false : { require: true, rejectUnauthorized: false },
        },
        label: `database "${target.pathname.slice(1)}" on ${target.hostname}`,
    };
}

async function main() {
    // A plain `node` run doesn't read .env — only the Nest app does, through
    // ConfigModule — so run by hand from the project folder, ADMIN_LOGIN and the
    // database settings looked unset. Load the file when it is there; variables
    // that are already set still win (and inside the Docker container there is no
    // .env — see .dockerignore — and compose provides them).
    if (existsSync(".env")) process.loadEnvFile(".env");

    const email = process.env.ADMIN_LOGIN;
    const password = process.env.ADMIN_PASSWORD;
    const fullName = process.env.ADMIN_FULL_NAME || "Doston Komilov";

    if (!email || !password) {
        console.error("ADMIN_LOGIN and ADMIN_PASSWORD must both be set in .env before seeding.");
        process.exit(1);
    }
    if (password.length < 8) {
        console.error("ADMIN_PASSWORD is too short (min 8 characters).");
        process.exit(1);
    }

    // Say where this is about to write before it connects (never the credentials).
    const { config, label } = connectionSettings();
    console.log(`Seeding into ${label}.`);
    const client = new Client(config);
    await client.connect();

    try {
        const existing = await client.query(
            `SELECT id, role FROM users WHERE email = $1`,
            [email],
        );

        if (existing.rows.length > 0) {
            const found = existing.rows[0];
            if (found.role === UserRole.admin) {
                console.log(`Admin "${email}" already exists (id=${found.id}) — nothing to do.`);
            } else {
                console.error(
                    `A user with email "${email}" already exists with role "${found.role}", not Admin. ` +
                    `Refusing to overwrite it — pick a different ADMIN_LOGIN or fix the role by hand.`,
                );
                process.exit(1);
            }
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const inserted = await client.query(
            `INSERT INTO users (full_name, email, password, role, status, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id`,
            [fullName, email, hashedPassword, UserRole.admin, UserStatus.active],
        );

        console.log(`Created admin "${email}" (id=${inserted.rows[0].id}).`);
    } finally {
        await client.end();
    }
}

// `code` is the Node/pg error code (ENOTFOUND, ECONNREFUSED, 42P01, ...).
main().catch((error: NodeJS.ErrnoException & { hostname?: string }) => {
    if (error?.code === "ENOTFOUND") {
        console.error(
            `"${error.hostname}" can't be resolved from this machine. A bare name like "postgres" is a ` +
            `Docker-compose service address and only works inside the compose network — set DB_HOST/DB_NAME/... ` +
            `to a database you can reach.`,
        );
    } else if (error?.code === "ECONNREFUSED") {
        console.error("Nothing is accepting connections at that address — is PostgreSQL running?");
    } else if (error?.code === "42P01") {
        console.error(
            `The "users" table doesn't exist in that database yet. Start the backend once (pnpm start:dev) ` +
            `so it creates the tables, then run the seed again.`,
        );
    }
    console.error("Seeding failed:", error);
    process.exit(1);
});
