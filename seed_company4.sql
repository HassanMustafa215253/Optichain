BEGIN;

-- Expand lookup categories used by local items.
INSERT INTO catogary (name)
VALUES
    ('Groceries'),
    ('Beverages'),
    ('HomeCare'),
    ('Stationery'),
    ('Snacks')
ON CONFLICT (name) DO NOTHING;

-- Generate customers for the partitioned branch (branch_id = 2).
INSERT INTO customer (branch_id, name, phone_number, email)
SELECT
    2,
    'Customer ' || gs,
    (300000000 + (random() * 699999999)::int),
    'customer' || gs || '@example.com'
FROM generate_series(1, 25) AS gs;

-- Create local items with random category and pricing.
WITH category_pool AS (
    SELECT array_agg(name) AS names FROM catogary
)
INSERT INTO local_item (branch_id, name, catogary_name, weight, selling_price, production_cost)
SELECT
    2,
    'Item ' || gs,
    (
        SELECT names[1 + floor(random() * array_length(names, 1))::int]
        FROM category_pool
    ),
    (1 + floor(random() * 25))::int,
    round((50 + random() * 450)::numeric, 2)::double precision,
    round((25 + random() * 250)::numeric, 2)::double precision
FROM generate_series(1, 20) AS gs;

-- Ensure each local item has inventory in branch 2.
INSERT INTO inventory (branch_id, local_item_id, quantity)
SELECT
    2,
    li.local_item_id,
    (10 + floor(random() * 90))::int
FROM local_item li
LEFT JOIN inventory i
    ON i.branch_id = li.branch_id
   AND i.local_item_id = li.local_item_id
WHERE li.branch_id = 2
  AND i.inventory_id IS NULL;

-- Create fake sales orders with status values that satisfy check constraints.
WITH customer_pool AS (
    SELECT array_agg(customer_id) AS ids
    FROM customer
    WHERE branch_id = 2
)
INSERT INTO orders (branch_id, customer_id, order_date, final_date, cost, price, status, payment_done)
SELECT
    2,
    (
        SELECT ids[1 + floor(random() * array_length(ids, 1))::int]
        FROM customer_pool
    ),
    current_date - ((random() * 40)::int),
    current_date + ((random() * 8)::int),
    round((80 + random() * 500)::numeric, 2)::double precision,
    round((120 + random() * 700)::numeric, 2)::double precision,
    (ARRAY['Delivered', 'In Progress', 'Cancelled'])[1 + floor(random() * 3)::int],
    round((20 + random() * 450)::numeric, 2)::double precision
FROM generate_series(1, 20);

-- Attach a line item to recent orders.
WITH item_pool AS (
    SELECT array_agg(local_item_id) AS ids
    FROM local_item
    WHERE branch_id = 2
),
recent_orders AS (
    SELECT order_id
    FROM orders
    WHERE branch_id = 2
    ORDER BY order_id DESC
    LIMIT 20
)
INSERT INTO order_detail (order_id, branch_id, local_item_id, quantity)
SELECT
    o.order_id,
    2,
    (
        SELECT ids[1 + floor(random() * array_length(ids, 1))::int]
        FROM item_pool
    ),
    (1 + floor(random() * 5))::int
FROM recent_orders o;

-- Requisition entries for branch operations.
INSERT INTO requisition_list (branch_id, local_item_id, sales_order_quantity, source, import_branch_id, approved)
SELECT
    2,
    li.local_item_id,
    round((5 + random() * 40)::numeric, 2)::real,
    1,
    0,
    (random() > 0.5)
FROM local_item li
WHERE li.branch_id = 2
ORDER BY random()
LIMIT 12;

-- Central inventory snapshots.
INSERT INTO central_inventory (branch_id, item_id, quantity, expiry, weight, price)
SELECT
    2,
    li.local_item_id,
    (5 + floor(random() * 30))::int,
    current_date + ((30 + random() * 180)::int),
    (1 + floor(random() * 20))::int,
    round((40 + random() * 400)::numeric, 2)::double precision
FROM local_item li
WHERE li.branch_id = 2
ORDER BY random()
LIMIT 10;

-- Financial transfer cost between branches.
INSERT INTO branch_import_cost (from_branch_id, to_branch_id, cost)
VALUES (0, 2, 175.50)
ON CONFLICT (from_branch_id, to_branch_id)
DO UPDATE SET cost = EXCLUDED.cost;

-- Monthly branch tracker snapshots.
INSERT INTO branch_tracker (branch_id, starting_year, starting_month, production_cost, operation_cost, report_date, sales)
SELECT
    2,
    EXTRACT(YEAR FROM current_date)::int,
    gs,
    round((500 + random() * 2000)::numeric, 2)::double precision,
    round((300 + random() * 1200)::numeric, 2)::double precision,
    make_date(EXTRACT(YEAR FROM current_date)::int, gs, 1),
    round((1000 + random() * 4000)::numeric, 2)::double precision
FROM generate_series(1, 6) AS gs;

-- Map existing employees to branch 2 with role and salary.
INSERT INTO branch_employee (employee_id, branch_id, employee_role, salary)
SELECT
    e.employee_id,
    2,
    ((e.employee_id - 1) % 5) + 1,
    round((45000 + random() * 35000)::numeric, 2)::double precision
FROM employee e;

COMMIT;
