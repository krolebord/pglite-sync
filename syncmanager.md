Client initial launch -> init worker db, schema + seed
Make db dump -> make memory db from dump
Read pending local events -> apply to mem db

#### Mutation:

- apply to mem
- send to worker (through broadcast channel)
- Based on network
  - Network is available -> worker pushes it to server and stores with 'pushed' status
  - Network is not available or push request failes -> worker stores it with 'pending-push' status
- server orders events and broadcasts new events to the clients

#### On broadcast event received:

- it contains previous event id
- Case A - event was already applied to mem db (local event):
  - Apply to worker db
  - Remove from local events table (in transaction)
- Case B - remote event, but previous event id matches last applied event in worker db
  - Apply to worker db
  - Apply to mem db
- Case C - remote event, previous id does not match, or there are local events -> De-sync

#### On de-sync

- fetch event log starting from latest event in worker db
- apply them to worker db
- clone worker db to mem db

### Schema changes

TODO
