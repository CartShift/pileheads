'use strict';
// A single statement makes room+host creation indivisible, even when a
// member insert fails. Both writable CTEs depend on the created row.
const CREATE_ROOM_SQL=`WITH created AS (
 INSERT INTO pilehead_rooms(code,capacity,status,state)
 VALUES($1,$2,'lobby',$3::jsonb)
 RETURNING code,capacity,revision,status,state,expires_at
), seated AS (
 INSERT INTO pilehead_members(code,seat,display_name,token_hash)
 SELECT code,0,$4,$5 FROM created RETURNING code
)
SELECT created.* FROM created JOIN seated USING(code)`;
// Serialize a join against room updates/expiry cleanup. A concurrent join
// can still encounter a seat conflict under statement snapshot semantics;
// callers retry the statement with a fresh snapshot. Never join a finished,
// started or expired room using a stale initial read.
const JOIN_ROOM_SQL=`WITH joinable AS MATERIALIZED (
 SELECT code,capacity,revision,status,state,expires_at FROM pilehead_rooms
 WHERE code=$1::varchar(8) AND status='lobby' AND expires_at>now() FOR UPDATE
), seated AS (
 INSERT INTO pilehead_members(code,seat,display_name,token_hash)
 SELECT j.code,x,$2,$3 FROM joinable j CROSS JOIN generate_series(0,$4::integer-1) x
 WHERE NOT EXISTS(SELECT 1 FROM pilehead_members m WHERE m.code=j.code AND m.seat=x)
 ORDER BY x LIMIT 1 ON CONFLICT (code,seat) DO NOTHING RETURNING code,seat
)
SELECT joinable.*,seated.seat AS joined_seat FROM joinable JOIN seated USING(code)`;
module.exports={CREATE_ROOM_SQL,JOIN_ROOM_SQL};
