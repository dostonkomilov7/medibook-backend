import { Client } from "pg";
import bcrypt from "bcrypt";
import { UserRole, UserStatus } from "../constants/constants";

async function main() {
    const email = process.env.ADMIN_LOGIN;
    const password = process.env.ADMIN_PASSWORD;
    const fullName = process.env.ADMIN_FULL_NAME || "Doston Komilov";
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error("DATABASE_URL is not set.");
        process.exit(1);
    }
    if (!email || !password) {
        console.error("ADMIN_LOGIN and ADMIN_PASSWORD must both be set in .env before seeding.");
        process.exit(1);
    }
    if (password.length < 8) {
        console.error("ADMIN_PASSWORD is too short (min 8 characters).");
        process.exit(1);
    }

    const client = new Client({
        connectionString: databaseUrl,
        ssl: { require: true, rejectUnauthorized: false },
    });
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

main().catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
});
