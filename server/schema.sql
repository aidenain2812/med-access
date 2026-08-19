CREATE TABLE IF NOT EXISTS facilities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Hospital','Dispensary','Pharmacy')),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  phone TEXT NOT NULL,
  license TEXT UNIQUE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medicines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  strength TEXT NOT NULL,
  UNIQUE(name, strength)
);

CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  expiry DATE NOT NULL,
  UNIQUE(facility_id, medicine_id)
);

CREATE TABLE IF NOT EXISTS delivery_requests (
  id SERIAL PRIMARY KEY,
  facility_id INTEGER NOT NULL REFERENCES facilities(id),
  medicine_id INTEGER NOT NULL REFERENCES medicines(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  customer_name TEXT NOT NULL DEFAULT 'Emergency User',
  customer_phone TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_requests (
  id SERIAL PRIMARY KEY,
  from_facility_id INTEGER NOT NULL REFERENCES facilities(id),
  to_facility_id INTEGER NOT NULL REFERENCES facilities(id),
  medicine_id INTEGER NOT NULL REFERENCES medicines(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'PENDING APPROVAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
