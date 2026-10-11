# StaySpot — Assignment 2 (Project 3: Vacation Rental & Experiences)

## Assignment 2: React + Express application

Step 3 is implemented in `web/` and `api/`. The screens follow the exported
[wireframes](docs/design/wireframes/) and the [API sketch](docs/api_endpoints.md).

### Run locally

Use Node.js 22.12+ (or a newer supported version), npm, and the seeded PostgreSQL
and MongoDB databases described below. Commands start from this repository root.

```bash
cd api
npm ci
# Optional: copy .env.example to .env and set your database user/password.
# Without .env, PostgreSQL uses your OS username and the local stayspot database.
npm run migrate
npm start
```

In a second terminal, from the repository root:

```bash
cd web
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Express listens on **127.0.0.1:3001**; Vite proxies
`/api` to it. Both servers bind only to localhost. Keep both terminals running.
`api/.env.example` lists connection settings; credentials stay in `api/.env` and
are never included in browser code. If changing the API port, also change the
proxy target in `web/vite.config.js`.

For an existing seeded database, `npm run migrate` applies only the audit trigger,
booking procedure and additive API support script. It does **not** reseed data or
recreate the materialized view. For a fresh database, first follow the inherited
setup below, then run this migration.

For existing MongoDB data, reapply the collection setup before using guest-written
reviews (this updates validators and adds an index without deleting documents):

```bash
mongosh "mongodb://127.0.0.1:27017/stayspot" mongo/01_collections_and_indexes.js
```

Use your configured connection URI and `STAYSPOT_MONGO_DB` for a non-default local database.

### Screens and choices

- Browse properties, guests and bookings with server-side filters and 25-row pages.
- Choose Guest or Staff in the header. Guest mode shows a searchable name dropdown; only Staff mode exposes the Guests page, including direct-route access.
- Review a server-calculated booking quote, confirm the wallet debit, and see the
  exact trigger-created audit entry. Move bookings through their three statuses.
- View date-filtered wallet history and period totals.
- View per-property moving averages, all-history dense rankings, summary totals
  and a refresh button with a persistent timestamp.
- Explore search hotspots within 5 km, with ten-second polling, pause/resume,
  distance-sorted pages and an Add search pin button. Search pins expire after two hours.
- View review facets for one property or all reviews, plus flexible amenities.
- After completing a stay, open its booking details and submit a 1–5 star rating,
  optional feedback tags, and an optional written review. Each booking allows one review.

React with Vite, React Router and plain CSS keeps the frontend small and familiar.
Express uses `pg` and the MongoDB driver directly, leaving transactions, triggers,
window calculations and aggregations in the databases. Charts use SVG with a data
table alternative; Leaflet displays the map with attributed OpenStreetMap tiles.

### Scope and behavior

- Guest/Staff selection is a persisted UI mode, not authentication; this is a local assignment app. The Guests route is guarded in the frontend; API access is not authenticated.
- Amounts are currency units because the inherited schema has no currency field.
- Booking check-in must be today or later, using Asia/Kolkata for both the form and API. Check-out must be later than check-in. Past dates are rejected on quotes and final submissions.
- Dates are calendar dates; server date filters use UTC boundaries. Timestamps are
  displayed in the viewer's local time.
- The moving average excludes days without bookings, preserving the inherited query.
  Rankings and materialized summaries cover all history; chart dates affect only the chart.
- Summary time is unknown until a refresh is performed through the API. Direct SQL
  refreshes do not update API metadata. All summary refreshes in the UI record it atomically.
- The API calculates prices using PostgreSQL decimal arithmetic and owns transaction
  commit/rollback. A failed booking cannot leave a wallet debit behind.
- Network failures during writes are reported as uncertain; check the booking list
  or reload its status before retrying. The browser does not automatically retry writes.
- Empty catalogs and expired search datasets show empty states. Map tiles need internet
  access; coordinates, distances and the result list remain available through the API.
- Property editing, refunds and wallet top-ups are outside the current
  wireframes and required Step 3 scope. Audit history has no write endpoint.
- Guest-written reviews require a `COMPLETED` booking and its guest selected in the
  header. This actor check is not authentication. Reviews cannot be edited or deleted
  through the app. Existing seeded reviews remain valid without booking IDs.
- Review submissions appear in the existing property/all-property analytics on the
  next load. Duplicate requests are rejected by a unique partial MongoDB index.
  If submission is interrupted, use "Check saved review" before trying again.

### Verification

```bash
cd api
npm test
# In web/:
npm test
npm run build
```

The API tests use both running databases. They create isolated fixtures and clean them
up, covering booking success, competing debits, insufficient funds, status conflicts,
audit totals, pagination, summary refresh, map pins, review facets, and guest-written
review validation, eligibility and concurrent duplicate prevention. Tests refresh the
materialized summary and its timestamp. Frontend unit tests cover recovery guidance.
On 11 October 2026, all 14 API tests, 3 frontend tests and the production build passed.
Browser checks covered the main screens, a booking quote, wallet failure states,
map zoom preservation during polling and recovery of a deleted guest selection.
Further browser testing was stopped at the user's request; the new review form was
verified by source inspection/build, with submission behavior covered by API tests.

### SQL changes for Step 3

- `03_triggers_and_audit.sql`: records the new audit ID in a transaction-local setting.
- `04_stored_procedures.sql`: returns the new booking ID through an optional `INOUT`
  parameter; existing five-argument calls still work.
- `07_api_support.sql`: adds persistent refresh metadata and a guest-booking index.
- `mongo/01_collections_and_indexes.js`: accepts optional review `booking_id` values
  and adds the `one_review_per_booking` unique partial index. Historical reviews
  without a booking ID are unaffected. The API still uses `$geoNear` and `$facet`.
- `data_generation/postgres_seeder.py`: creates 5,000 unique, reproducible fictional
  rental titles instead of arbitrary Faker sentences, without changing record counts.


CS6.302 - Software System Development | Team: Group 12

## 1. Project

**StaySpot** is a vacation-rental platform with a React frontend, Express API, and a database layer split across:

- **PostgreSQL** — transactional core: guests, wallets, properties, bookings, audit trail.
- **MongoDB** — flexible/high-volume data: property amenities, reviews, and geospatial
"search hotspot" pings.

## 2. Repository structure

```text
README.md

docs/
  relational_erd.png        # PostgreSQL schema ERD
  mongo_schema_map.json      # MongoDB collection field/validator map

sql/
  01_schema_ddl.sql          # guests, wallet_audit_logs, properties, bookings
  02_indexes.sql             # partial unique index + secondary indexes
  03_triggers_and_audit.sql  # wallet audit trigger
  04_stored_procedures.sql   # sp_atomic_booking (Workflow 1)
  05_materialized_views.sql  # property_summary + refresh function
  06_window_analytics.sql    # Workflow 2: 7-day moving average + DENSE_RANK

mongo/
  01_collections_and_indexes.js  # collections, JSON Schema validators, indexes
  02_workflow3_geonear.js        # Workflow 3: $geoNear trending hotspots
  03_workflow4_facet.js          # Workflow 4: $facet review analytics

data_generation/
  postgres_seeder.py         # seeds guests, properties, bookings, wallet audit
  mongo_seeder.py            # seeds amenities, reviews, search sessions
  requirements.txt

performance/
  postgres_explain_analyzes.txt   # measured execution plans — see Section 8
  mongo_execution_stats.json      # measured execution plans — see Section 8
```



## 3. PostgreSQL setup

```bash
createdb stayspot
psql -d stayspot -f sql/01_schema_ddl.sql
psql -d stayspot -f sql/02_indexes.sql
psql -d stayspot -f sql/03_triggers_and_audit.sql
psql -d stayspot -f sql/04_stored_procedures.sql
psql -d stayspot -f sql/05_materialized_views.sql
```

Run `sql/06_window_analytics.sql` as a query once bookings exist (it is a `SELECT`, not DDL).

### Schema

- `guests(id, name, email, wallet_balance CHECK (>= 0), created_at)`
- `wallet_audit_logs(id, guest_id FK, amount_changed, action_type CHECK IN ('DEBIT','CREDIT'), balance_after CHECK (>= 0), timestamp)` — populated **only** by the trigger, never inserted into directly by application code.
- `properties(id, title, base_price CHECK (>0), latitude CHECK (-90..90), longitude CHECK (-180..180), created_at)`
- `bookings(id, guest_id FK, property_id FK, check_in, check_out CHECK (> check_in), total_cost CHECK (>= 0), status CHECK IN ('CONFIRMED','CHECKED_IN','COMPLETED'), created_at)`



### Audit trigger

`fn_log_wallet_audit()` fires `AFTER UPDATE OF wallet_balance ON guests` and inserts one row
into `wallet_audit_logs` per balance change, deriving `action_type` (`DEBIT`/`CREDIT`) from
the direction of the change and recording `balance_after`.

> Note: `wallet_audit_logs` is not additionally locked down with a `REVOKE`/blocking trigger
> against `UPDATE`/`DELETE`. Immutability currently relies on the fact that no script writes
> to it directly. Read-only application permissions are a useful hardening improvement; Project 3 does not explicitly require immutable storage.



### Partial unique index

`idx_active_stay` on `bookings(guest_id) WHERE status = 'CHECKED_IN'` — a guest can only have
one `CHECKED_IN` booking at a time, exactly as specified in the assignment.

### Materialized view

`property_summary` aggregates, per property: `total_bookings`, `total_nights_booked`
(`SUM(check_out - check_in)`), and `gross_revenue`. A unique index on `property_id` allows
`refresh_property_summary()` to call `REFRESH MATERIALIZED VIEW CONCURRENTLY`.

### Workflow 1 — Atomic booking (`sp_atomic_booking`)

```
CALL sp_atomic_booking(p_guest_id, p_property_id, p_total_cost, p_check_in, p_check_out);
```

1. Validates `check_out > check_in`.
2. Performs a single **conditional** `UPDATE guests SET wallet_balance = wallet_balance - cost
  WHERE id = ... AND wallet_balance >= cost`. If no row matches (insufficient funds),`  ROW_COUNT` is 0 and the procedure raises an exception.
3. On success, inserts the `bookings` row (status `CONFIRMED`).
4. The wallet `UPDATE` fires `trg_wallet_balance_audit`, so a `wallet_audit_logs` row is
  written as part of the same statement/transaction.

**Transaction ownership:** the conditional wallet update and booking insert run in
one caller-owned transaction. An API must commit on success and roll back on error;
autocommit `CALL` is also atomic. Project 3 asks for atomic debit/booking and rollback
on failure, but does not prescribe `REPEATABLE READ` or a specific exception-block
pattern. The existing implementation leaves commit/rollback to the caller instead
of explicitly committing inside the procedure.

### Workflow 2 — Window analytics

`06_window_analytics.sql` computes daily booking revenue per property, a 7-day moving
average via `AVG(...) OVER (PARTITION BY property_id ORDER BY booking_day RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW)`, and ranks properties by total revenue with `DENSE_RANK()`. The average includes booking
days within that calendar window; days without bookings are not zero-filled.

## 4. MongoDB setup

```bash
mongosh "<connection_string>" mongo/01_collections_and_indexes.js
```

Creates, with `$jsonSchema` validators:

- **PropertyAmenities** — `property_id`, `house_rules[]`, `accessibility_features[]`, free-form `amenities` object. Unique index on `property_id`.
- **PropertyReviews** — `property_id`, `guest_id`, `rating` (1–5), `tags[]`, `comment`, `created_at`. Secondary indexes on `property_id`, `rating`, `tags`.
- **SearchSessions** — `session_id`, GeoJSON `location` (Point), `created_at`. `2dsphere` index on `location`; TTL index on `created_at` with `expireAfterSeconds: 7200` (2 hours).



### Workflow 3 — Trending search hotspots (`02_workflow3_geonear.js`)

`$geoNear` (first pipeline stage, as required) finds `SearchSessions` within 5 km of an
anchor coordinate (default: Bengaluru) created in the last 2 hours, then `$bucket`s them
into 1 km distance bands and counts sessions per band.

### Workflow 4 — Multi-faceted review analytics (`03_workflow4_facet.js`)

`$facet` computes, in one pass over `PropertyReviews`: (1) rating distribution 1–5, (2) top
10 tags via `$unwind` + `$group`, (3) overall average rating and review count. Defaults to
all reviews (`propertyId = null`) so it runs without depending on a hard-coded UUID.

## 5. Data generation

```bash
pip install -r data_generation/requirements.txt
python data_generation/postgres_seeder.py   # uses STAYSPOT_PG_* environment variables
python data_generation/mongo_seeder.py      # respects STAYSPOT_MONGO_URI env var, defaults to localhost
```

Actual seeded volumes (as coded, not aspirational):


| Store      | Entity            | Count                                                                    |
| ---------- | ----------------- | ------------------------------------------------------------------------ |
| PostgreSQL | guests            | 10,000                                                                   |
| PostgreSQL | properties        | 5,000                                                                    |
| PostgreSQL | bookings          | 100,000                                                                  |
| PostgreSQL | wallet_audit_logs | 100,000 debit rows plus top-up credit rows (105,039 in the verified run) |
| MongoDB    | PropertyAmenities | 1,000                                                                    |
| MongoDB    | PropertyReviews   | 30,000                                                                   |
| MongoDB    | SearchSessions    | 550,000                                                                  |


These clear the assignment's minimums (100k+ ledger/audit rows, 50k+ bookings, 500k+ geo
pings). `postgres_seeder.py` uses `execute_values` for guests/properties and individual wallet updates and booking inserts; `mongo_seeder.py` uses
batched `bulk_write`/`InsertOne` (batch size 10,000).

## 6. Assumptions

1. `check_in`/`check_out` (`DATE`) were added to `bookings` — not explicit in the base spec,
  but required to compute `total_nights_booked` for the materialized view.
2. All primary keys are UUIDs (`gen_random_uuid()` via `pgcrypto`).
3. `bookings.status` is enforced with a `CHECK` constraint rather than a Postgres `ENUM`,
  for easier migration if new statuses are added later.
4. The partial unique index implements exactly what's specified — one `CHECKED_IN` row per
  guest at a time — not full date-range overlap detection across `CONFIRMED` bookings.
5. `sp_atomic_booking` achieves atomicity via a conditional single-statement `UPDATE`
  instead of an explicit `BEGIN/EXCEPTION/ROLLBACK` block (see Section 3, Workflow 1).
6. `wallet_audit_logs` immutability is enforced only by convention (nothing writes to it
  except the trigger), not by a `REVOKE`/blocking trigger.



## 7. Data source note

Bulk historical `wallet_audit_logs` rows are produced as a side effect of the seeder driving
real `UPDATE`s through the trigger (not inserted directly), so the trigger path is exercised
at full data scale, not just in a one-off demo.

## 8. Verification and performance proof

See [docs/handover_note.md](docs/handover_note.md) for the verified setup, changes,
limitations, and database effects. The current repeatable API integration suite is
`npm test` from `api/`; the old standalone Python verification script was removed
from the submission.

The Verification section above records the current test results.
`performance/postgres_explain_analyzes.txt` contains real `EXPLAIN (ANALYZE, BUFFERS)`
plans, and `performance/mongo_execution_stats.json` contains actual workflow outputs
and execution statistics. Selective PostgreSQL lookups use indexes; whole-dataset
analytics may reasonably use sequential scans. MongoDB Workflow 3 uses the geospatial
index. Workflow 4 uses `property_id_1` when `STAYSPOT_PROPERTY_ID` selects a property;
its default all-reviews aggregation correctly performs a collection scan.

Seeders refuse to append to populated targets. PostgreSQL connection defaults are
`localhost:5432`, database `stayspot`, the current OS user, and no explicit password.
Override with `STAYSPOT_PG_HOST`, `STAYSPOT_PG_PORT`, `STAYSPOT_PG_DB`,
`STAYSPOT_PG_USER`, and `STAYSPOT_PG_PASSWORD`. MongoDB defaults to
`mongodb://localhost:27017` and database `stayspot`; override with
`STAYSPOT_MONGO_URI` and `STAYSPOT_MONGO_DB`. Seed PostgreSQL before MongoDB so
amenities and reviews reference existing property/guest IDs.

After PostgreSQL seeding, run `SELECT refresh_property_summary();` to populate the
summary with current totals. Search sessions expire after two hours, so their count
and hotspot results will decrease over time. The TTL monitor deletes asynchronously.

## 10 Mongo - WOrflow output

```js // facet
[
  {
    ratingDistribution: [
      {
        _id: 1,
        count: 6040
      },
      {
        _id: 2,
        count: 6042
      },
      {
        _id: 3,
        count: 5931
      },
      {
        _id: 4,
        count: 6051
      },
      {
        _id: 5,
        count: 5936
      }
    ],
    topTags: [
      {
        _id: 'noisy',
        count: 6386
      },
      {
        _id: 'comfortable_beds',
        count: 6370
      },
      {
        _id: 'great_location',
        count: 6350
      },
      {
        _id: 'amazing_view',
        count: 6303
      },
      {
        _id: 'as_described',
        count: 6295
      },
      {
        _id: 'poor_wifi',
        count: 6284
      },
      {
        _id: 'friendly_host',
        count: 6253
      },
      {
        _id: 'clean',
        count: 6238
      },
      {
        _id: 'parking_issues',
        count: 6230
      },
      {
        _id: 'value_for_money',
        count: 6206
      }
    ],
    overallAverage: [
      {
        _id: null,
        avgRating: 2.9933666666666667,
        totalReviews: 30000
      }
    ]
  }
]

// geonear
[
  {
    _id: 4000,
    session_count: 12412,
    avg_distance_m: 4512.524821981002
  },
  {
    _id: 3000,
    session_count: 9634,
    avg_distance_m: 3525.5869114283028
  },
  {
    _id: 2000,
    session_count: 6893,
    avg_distance_m: 2539.0483341525514
  },
  {
    _id: 1000,
    session_count: 4101,
    avg_distance_m: 1557.5506720047103
  },
  {
    _id: 0,
    session_count: 1422,
    avg_distance_m: 666.3892969957219
  }
]
```



## 11. Repo / Commit

- GitHub URL: [https://github.com/JenilPadshala/SSD-A2-P3-StaySpot](https://github.com/JenilPadshala/SSD-A2-P3-StaySpot)





## Rebuilding local data intentionally

The local `stayspot` PostgreSQL and MongoDB databases were deleted and recreated on
11 October 2026 at the user's request. Seed results: 10,000 guests, 5,000 distinct
property titles, 100,000 bookings, 105,039 wallet audit entries, 1,000 amenities
records, 30,000 reviews and 550,000 search sessions. Search sessions expire after
2 hours; their live count will decrease. Cross-database references were verified.

To repeat a reset, stop the API first. These commands permanently replace local
StaySpot data; they are not needed for ordinary startup or the review index update.
Commands below assume local services and the default `stayspot` database names.

```bash
dropdb stayspot
createdb stayspot
mongosh "mongodb://127.0.0.1:27017/stayspot" --eval 'db.dropDatabase()'
psql -d stayspot -f sql/01_schema_ddl.sql
psql -d stayspot -f sql/02_indexes.sql
psql -d stayspot -f sql/03_triggers_and_audit.sql
psql -d stayspot -f sql/04_stored_procedures.sql
psql -d stayspot -f sql/05_materialized_views.sql
psql -d stayspot -f sql/07_api_support.sql
mongosh "mongodb://127.0.0.1:27017/stayspot" mongo/01_collections_and_indexes.js
python3 -m venv .venv
. .venv/bin/activate
pip install -r data_generation/requirements.txt
python data_generation/postgres_seeder.py
python data_generation/mongo_seeder.py
```

Export the same `STAYSPOT_*` connection variables for the seeders and API when
using custom settings; the Python seeders do not automatically load `api/.env`.
Start the API and frontend using the instructions above, then click **Refresh summary**
on Analytics to populate totals and record the refresh time. Old saved guest IDs
recover to an available guest automatically. Do not rerun the seeders on populated
databases; they deliberately reject appending another full dataset.
