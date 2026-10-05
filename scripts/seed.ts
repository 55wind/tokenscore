/**
 * 데모 DB 만들기
 *   npm run db:reset          DB 파일을 지우고 새로 만듭니다.
 *   npm run db:setup          DB가 없을 때만 만듭니다. (npm run dev 전에 자동 실행)
 */
import fs from "node:fs";
import path from "node:path";

async function main() {
  const ifMissing = process.argv.includes("--if-missing");
  const url = process.env.DATABASE_URL ?? "file:./data/tokenscore.db";
  const isLocal = url.startsWith("file:");
  const file = isLocal ? path.resolve(url.replace(/^file:/, "")) : null;

  if (file && ifMissing && fs.existsSync(file)) {
    console.log(`데모 DB가 이미 있습니다: ${path.relative(process.cwd(), file)}`);
    return;
  }
  if (file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    for (const f of [file, `${file}-journal`, `${file}-wal`, `${file}-shm`]) if (fs.existsSync(f)) fs.rmSync(f);
  }

  const { db } = await import("../src/lib/db");
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { seedDatabase, DEMO_PASSWORD } = await import("../src/lib/db/seed");

  await migrate(db, { migrationsFolder: "drizzle" });
  const { asOf } = await seedDatabase(db);
  console.log(`데모 DB를 만들었습니다. 기준 월: ${asOf}, 데모 비밀번호: ${DEMO_PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
