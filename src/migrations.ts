import {Database} from "bun:sqlite";

type Migration = (db: Database) => void;
const migrations: Migration[] = [
    (db) => {
            db.run(`create table SCENES
(
    ROOM_ID  TEXT
        constraint SCENES_pk
            primary key,
    ELEMENTS TEXT, 
    UPDATED_DATE DATETIME
);
`)
    }
]

export function migrate(db: Database) {
    db.run(`create table if not exists TEST_MIGRATIONS
(
    ID           integer
        constraint TEST_MIGRATIONS_pk
            primary key autoincrement,
    CREATED_DATE  DATETIME not null,
    VERSION      integer  not null
);
    `
    );

    const nextIndex = db.query(`select ifnull(max(VERSION), 0) next_index from TEST_MIGRATIONS`).get().next_index;

    //const index = (db.query(`select max(VERSION) from TEST_MIGRATIONS`).get() || 0)  + 1
    for (let i = nextIndex; i < migrations.length; i++) {
        console.log('running migration ', i)
        const fn = migrations[i];
        fn(db);
        db.run('insert into TEST_MIGRATIONS(CREATED_DATE, VERSION) values(?, ?)', Date.now(), i + 1)

        // db.transaction(() => {
        //
        // })

    }
}