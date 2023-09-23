
import sqlite from "better-sqlite3";

type Migration = (db: sqlite.Database) => void;
const migrations: Migration[] = [
    (db) => {

            db.prepare(`create table SCENES
(
    ROOM_ID  TEXT
        constraint SCENES_pk
            primary key,
    ELEMENTS TEXT, 
    UPDATED_DATE DATETIME
);
`).run();
    }
]

export function migrate(db: sqlite.Database) {
    db.prepare(`create table if not exists TEST_MIGRATIONS
(
    ID           integer
        constraint TEST_MIGRATIONS_pk
            primary key autoincrement,
    CREATED_DATE  DATETIME not null,
    VERSION      integer  not null
);
    `
    ).run();

    const nextIndex = (db.prepare(`select ifnull(max(VERSION), 0) next_index from TEST_MIGRATIONS`).get() as any).next_result;

    //const index = (db.query(`select max(VERSION) from TEST_MIGRATIONS`).get() || 0)  + 1
    for (let i = nextIndex; i < migrations.length; i++) {
        console.log('running migration ', i)
        const fn = migrations[i];
        db.transaction(() => {
            fn(db);
            db.prepare('insert into TEST_MIGRATIONS(CREATED_DATE, VERSION) values(?, ?)').run(Date.now(), i + 1)
        })


        // db.transaction(() => {
        //
        // })

    }
}