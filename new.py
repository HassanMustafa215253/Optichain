from fastapi import APIRouter, FastAPI, Depends, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import create_engine, text, select, func, cast, Integer
from sqlalchemy import Column, Integer, String, update, delete, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.automap import automap_base
from jose import jwt
from jose.exceptions import JWTError
from datetime import datetime, timedelta
import json
import logging
import os

import schema

try:
    import redis
    from redis.exceptions import RedisError
except ImportError:
    redis = None
    RedisError = Exception

SECRET_KEY = "sdkljn$jern@r3jrn34kjb..34orn&un5479*hn34iugskd!fnvs()334jnk3"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
REDIS_ENABLED = os.getenv("REDIS_ENABLED", "true").lower() in {"1", "true", "yes"}
REDIS_TTL_SECONDS = int(os.getenv("REDIS_TTL_SECONDS", "60"))
CACHE_PREFIX = "cache:v1"
_redis_client = None


def parse_optional_int(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


ROLE_MANAGER_ID = parse_optional_int(os.getenv("ROLE_MANAGER_ID"))
ROLE_ADMIN_ID = parse_optional_int(os.getenv("ROLE_ADMIN_ID"))
ROLE_FINANCE_ID = parse_optional_int(os.getenv("ROLE_FINANCE_ID"))
ROLE_WORKER_ID = parse_optional_int(os.getenv("ROLE_WORKER_ID"))

# -----------------------------
# DATABASE SETUP
# -----------------------------
DATABASE_URL = "postgresql+psycopg2://curr_user:hassan@localhost/company4"

engine = create_engine(DATABASE_URL)
Base = automap_base()
Base.prepare(engine, reflect=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
BC = Base.classes  # automapped classes

# -----------------------------
# Something to do with Tokens
# -----------------------------
oauth2_scheme  = OAuth2PasswordBearer(tokenUrl="login")
    
    
    

# -----------------------------
# Initialize APP and Router
# -----------------------------
app = FastAPI()

Central_Admin_Router = APIRouter(prefix="/centralAdmin")
Finance_Router = APIRouter(prefix="/finance")
Manager_Router = APIRouter(prefix="/manager")
Worker_Router = APIRouter(prefix="/worker")
Admin_Router = APIRouter(prefix="/admin")


# -----------------------------
# Allow CORS - Usage of different ports to work together
# -----------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Helper Functions
# -----------------------------

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
        
@app.get("/get_current_user")
def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload   # this contains your stored values
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
def get_db_with_role(user = Depends(get_current_user)):
    db = SessionLocal()

    try:
        # Start transaction explicitly
        db.begin()
        # Set role locally (only for this transaction)
        db.execute(text(f'SET LOCAL ROLE "{user["role"]}"'))
        yield db
        db.commit()
    except:
        db.rollback()
        raise
    finally:
        db.close()


def resolve_local_item_id(
    db: Session,
    branch_id: int,
    product_id: int | None = None,
    item_name: str | None = None,
):
    LocalItem = Base.classes.local_item

    if product_id is not None:
        local_item_exists = db.execute(
            select(LocalItem.local_item_id).where(
                LocalItem.local_item_id == product_id,
                LocalItem.branch_id == branch_id,
            )
        ).first()

        if not local_item_exists:
            raise HTTPException(status_code=404, detail="Product not found for this branch")

        return product_id

    normalized_name = (item_name or "").strip()
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Provide product_id or item_name")

    rows = db.execute(
        select(LocalItem.local_item_id).where(
            LocalItem.branch_id == branch_id,
            LocalItem.name == normalized_name,
        )
    ).all()

    if not rows:
        raise HTTPException(status_code=404, detail="Item name not found for this branch")

    if len(rows) > 1:
        raise HTTPException(status_code=409, detail="Multiple items found with same name")

    return rows[0][0]


def get_redis_client():
    global _redis_client
    if not REDIS_ENABLED or redis is None:
        return None

    if _redis_client is None:
        try:
            _redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
            _redis_client.ping()
        except RedisError as exc:
            logging.warning("Redis unavailable: %s", exc)
            _redis_client = None

    return _redis_client


def cache_json_dumps(value):
    return json.dumps(value, default=str)


def cache_get_json(key: str):
    client = get_redis_client()
    if client is None:
        return None

    try:
        cached = client.get(key)
        if cached is None:
            return None
        return json.loads(cached)
    except (RedisError, json.JSONDecodeError) as exc:
        logging.warning("Redis read failed for %s: %s", key, exc)
        return None


def cache_set_json(key: str, value, ttl_seconds: int = REDIS_TTL_SECONDS):
    client = get_redis_client()
    if client is None:
        return

    try:
        client.set(key, cache_json_dumps(value), ex=ttl_seconds)
    except RedisError as exc:
        logging.warning("Redis write failed for %s: %s", key, exc)


def cache_delete(key: str):
    client = get_redis_client()
    if client is None:
        return

    try:
        client.delete(key)
    except RedisError as exc:
        logging.warning("Redis delete failed for %s: %s", key, exc)


def admin_cache_key(branch_id: int, resource: str) -> str:
    return f"{CACHE_PREFIX}:admin:{branch_id}:{resource}"


def get_table_class(table_name: str):
    return getattr(Base.classes, table_name, None)


def require_table_class(table_name: str):
    table_class = get_table_class(table_name)
    if table_class is None:
        raise HTTPException(status_code=500, detail=f"Missing table: {table_name}")
    return table_class


def get_column(table_class, *names):
    for name in names:
        if hasattr(table_class, name):
            return getattr(table_class, name)
    return None


def require_column(table_class, *names):
    column = get_column(table_class, *names)
    if column is None:
        raise HTTPException(
            status_code=500,
            detail=f"Missing column {names} on {table_class.__name__}",
        )
    return column


# -----------------------------
# Main - Login
# -----------------------------
@app.post("/login")
def login(data: schema.UserLogin, response: Response, db: Session = Depends(get_db)):
    
    result = db.execute(
        text("select * from login( :email, :password)"),{
            "email":data.email,
            "password":data.password
        }
    ).mappings().first()
    
    if not result:
        raise HTTPException(status_code=400, detail="Invalid credentials")

    if result["response_code"] != 200:
        return {"response_code": result["response_code"], "code_desc": result["code_desc"]}
    
    token = create_access_token({
        "id": result._employee_id,
        "branch_id": result._branch_id,
        "role": result.role
    })
    
    # Set cookie
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,   # prevents JS access (important)
        secure=False,    # True in production with HTTPS
        samesite="lax",
        max_age=3600,
        # path="/"
    )

    return {"response_code": result["response_code"], "code_desc": result["code_desc"],"role": result["role"]}


# -----------------------------
# Admin
# -----------------------------

# Get Requisition List

@Admin_Router.get("/requisitions")
def get_requisition_list(db: Session = Depends(get_db_with_role), user=Depends(get_current_user)):
    
    
    Req = Base.classes.requisition_list
    LocalItem = Base.classes.local_item
    City = Base.classes.city

    stmt = (
        select(
            Req.id,
            Req.approved,
            Req.branch_id,
            City.city_id.label("city_id"),
            City.city.label("city_name"),
            City.country_name.label("country_name"),
            Req.local_item_id,
            LocalItem.name.label("item_name"),
            Req.sales_order_quantity,
            Req.source,
            Req.import_branch_id,
        )
        .join(LocalItem, LocalItem.local_item_id == Req.local_item_id)
        .outerjoin(City, City.city_id == Req.source)
        .where(Req.branch_id == user["branch_id"])
    )

    cache_key = admin_cache_key(user["branch_id"], "requisitions")
    cached = cache_get_json(cache_key)
    if cached is not None:
        return cached

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        cache_set_json(cache_key, rows)
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.put("/requisitions/{requisition_id}")
def update_requisition(
    requisition_id: int,
    requisition: schema.RequisitionUpdate,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    Req = Base.classes.requisition_list

    update_data = requisition.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    stmt = (
        update(Req)
        .where(
            Req.id == requisition_id,
            Req.branch_id == user["branch_id"],
        )
        .values(**update_data)
    )

    try:
        result = db.execute(stmt)
        db.commit()

        if result.rowcount == 0:  # type: ignore
            raise HTTPException(status_code=404, detail="Requisition not found")

        cache_delete(admin_cache_key(user["branch_id"], "requisitions"))
        return {"message": "Requisition updated"}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.delete("/requisitions/{requisition_id}")
def delete_requisition(
    requisition_id: int,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    Req = Base.classes.requisition_list

    stmt = (
        delete(Req)
        .where(
            Req.id == requisition_id,
            Req.branch_id == user["branch_id"],
        )
    )

    try:
        result = db.execute(stmt)
        db.commit()

        if result.rowcount == 0:  # type: ignore
            raise HTTPException(status_code=404, detail="Requisition not found")

        cache_delete(admin_cache_key(user["branch_id"], "requisitions"))
        return {"message": "Requisition deleted"}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")

@Admin_Router.get("/orders")
def get_all_orders(db: Session = Depends(get_db_with_role), user=Depends(get_current_user)):

    Orders = Base.classes.orders
    customer = Base.classes.customer

    stmt = (
        select(
            Orders.order_id.label("id"),
            Orders.branch_id,
            Orders.customer_id,
            Orders.order_date,
            Orders.final_date,
            Orders.price,
            Orders.cost,
            Orders.status,
            Orders.payment_done,
            customer.name.label("customer_name"),

        )
        .outerjoin(customer,customer.customer_id == Orders.customer_id 
                   and
                   customer.branch_id == user["branch_id"])
        .where(Orders.branch_id == user["branch_id"])
    )   

    cache_key = admin_cache_key(user["branch_id"], "orders")
    cached = cache_get_json(cache_key)
    if cached is not None:
        return cached

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        cache_set_json(cache_key, rows)
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.put("/orders/{order_id}")
def update_order(
    order_id: int,
    order: schema.OrderUpdate,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    Orders = Base.classes.orders

    update_data = order.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    if "status" in update_data:
        valid_statuses = {"Delivered", "In Progress", "Cancelled"}
        if update_data["status"] not in valid_statuses:
            raise HTTPException(status_code=400, detail="Invalid order status")

    stmt = (
        update(Orders)
        .where(
            Orders.order_id == order_id,
            Orders.branch_id == user["branch_id"],
        )
        .values(**update_data)
    )

    try:
        result = db.execute(stmt)
        db.commit()

        if result.rowcount == 0:  # type: ignore
            raise HTTPException(status_code=404, detail="Order not found")

        cache_delete(admin_cache_key(user["branch_id"], "orders"))
        return {"message": "Order updated"}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.delete("/orders/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    Orders = Base.classes.orders

    stmt = (
        delete(Orders)
        .where(
            Orders.order_id == order_id,
            Orders.branch_id == user["branch_id"],
        )
    )

    try:
        result = db.execute(stmt)
        db.commit()

        if result.rowcount == 0:  # type: ignore
            raise HTTPException(status_code=404, detail="Order not found")

        cache_delete(admin_cache_key(user["branch_id"], "orders"))
        return {"message": "Order deleted"}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.get("/customers")
def get_customers(db: Session = Depends(get_db_with_role), user=Depends(get_current_user)):
    Customer = Base.classes.customer

    stmt = (
        select(
            Customer.customer_id.label("id"),
            Customer.branch_id,
            Customer.name,
            Customer.phone_number.label("phone"),
            Customer.email,
            Customer.address,
        )
        .where(Customer.branch_id == user["branch_id"])
        .order_by(Customer.customer_id)
    )

    cache_key = admin_cache_key(user["branch_id"], "customers")
    cached = cache_get_json(cache_key)
    if cached is not None:
        return cached

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        cache_set_json(cache_key, rows)
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.post("/customers")
def create_customer(
    customer: schema.CustomerCreate,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    Customer = Base.classes.customer

    try:
        new_customer = Customer(
            branch_id=user["branch_id"],
            name=customer.name,
            phone_number=customer.phone,
            email=customer.email,
            address=customer.address,
        )

        db.add(new_customer)
        db.commit()

        cache_delete(admin_cache_key(user["branch_id"], "customers"))
        return {"message": "Customer created successfully"}
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.put("/customers/{customer_id}")
def update_customer(
    customer_id: int,
    customer: schema.CustomerUpdate,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    Customer = Base.classes.customer

    update_data = customer.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    if "phone" in update_data:
        update_data["phone_number"] = update_data.pop("phone")

    stmt = (
        update(Customer)
        .where(
            Customer.customer_id == customer_id,
            Customer.branch_id == user["branch_id"],
        )
        .values(**update_data)
    )

    try:
        result = db.execute(stmt)
        db.commit()

        if result.rowcount == 0:  # type: ignore
            raise HTTPException(status_code=404, detail="Customer not found")

        cache_delete(admin_cache_key(user["branch_id"], "customers"))
        return {"message": "Customer updated"}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    Customer = Base.classes.customer

    stmt = (
        delete(Customer)
        .where(
            Customer.customer_id == customer_id,
            Customer.branch_id == user["branch_id"],
        )
    )

    try:
        result = db.execute(stmt)
        db.commit()

        if result.rowcount == 0:  # type: ignore
            raise HTTPException(status_code=404, detail="Customer not found")

        cache_delete(admin_cache_key(user["branch_id"], "customers"))
        return {"message": "Customer deleted"}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.get("/inventory")
def get_inventory(db: Session = Depends(get_db_with_role), user=Depends(get_current_user)):

    Inventory = Base.classes.inventory
    LocalItem = Base.classes.local_item

    stmt = (
        select(
            Inventory.inventory_id.label("id"),
            Inventory.branch_id,
            Inventory.local_item_id,
            Inventory.quantity,
            LocalItem.name.label("item_name")
        )
        .join(LocalItem, LocalItem.local_item_id == Inventory.local_item_id)
        .where(Inventory.branch_id == user["branch_id"])
    )   

    cache_key = admin_cache_key(user["branch_id"], "inventory")
    cached = cache_get_json(cache_key)
    if cached is not None:
        return cached

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        cache_set_json(cache_key, rows)
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")

    

@Admin_Router.get("/local_items", response_model=list[schema.LocalItemOut])
def get_local_items(
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user)
):

    LocalItem = Base.classes.local_item

    stmt = select(
        LocalItem.local_item_id,
        LocalItem.branch_id,
        LocalItem.name,
        LocalItem.category_name,
        LocalItem.weight,
        LocalItem.selling_price,
        LocalItem.production_cost
    ).where(LocalItem.branch_id == user["branch_id"])

    cache_key = admin_cache_key(user["branch_id"], "local_items")
    cached = cache_get_json(cache_key)
    if cached is not None:
        return cached

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        cache_set_json(cache_key, rows)
        return rows

    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")

@Admin_Router.get("/category")
def get_category( db :Session = Depends(get_db_with_role) ,user = Depends(get_current_user)):
    
    Category = Base.classes.category
    stmt = select(Category).where(Category.branch_id == user["branch_id"])

    try:
        rows = db.execute(stmt).mappings().all()
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")

@Admin_Router.post("/inventory")
def create_inventory_item(
    item: schema.InventoryCreate,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user)
):
    Inventory = Base.classes.inventory

    try:
        resolved_local_item_id = resolve_local_item_id(
            db=db,
            branch_id=user["branch_id"],
            product_id=item.product_id,
            item_name=item.item_name,
        )

        existing_inventory = db.execute(
            select(Inventory).where(
                Inventory.branch_id == user["branch_id"],
                Inventory.local_item_id == resolved_local_item_id
            )
        ).scalar_one_or_none()

        if existing_inventory:
            existing_inventory.quantity = existing_inventory.quantity + item.quantity
            db.commit()
            cache_delete(admin_cache_key(user["branch_id"], "inventory"))
            return {"message": "Inventory quantity updated"}

        new_inventory = Inventory(
            branch_id=user["branch_id"],
            local_item_id=resolved_local_item_id,
            quantity=item.quantity
        )

        db.add(new_inventory)
        db.commit()
        cache_delete(admin_cache_key(user["branch_id"], "inventory"))
        return {"message": "Inventory item created successfully"}

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.post("/local_items")
def create_local_item(
    item: schema.LocalItemCreate,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user)
):

    LocalItem = Base.classes.local_item

    try:

        new_item = LocalItem(
            branch_id=user["branch_id"],
            name=item.name,
            category_name=item.category_name,
            weight=item.weight,
            selling_price=item.selling_price,
            production_cost=item.production_cost
        )

        db.add(new_item)
        db.commit()

        cache_delete(admin_cache_key(user["branch_id"], "local_items"))
        cache_delete(admin_cache_key(user["branch_id"], "inventory"))
        return {"message": "Item created successfully"}

    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")
    

@Admin_Router.put("/local_items/{item_id}")
def update_local_item(
    item_id: int,
    item: schema.LocalItemUpdate,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user)
):

    LocalItem = Base.classes.local_item

    update_data = item.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    stmt = (
        update(LocalItem)
        .where(
            LocalItem.local_item_id == item_id,
            LocalItem.branch_id == user["branch_id"]
        )
        .values(**update_data)
    )

    try:

        result = db.execute(stmt)
        db.commit()

        if result.rowcount == 0: #type: ignore
            raise HTTPException(status_code=404, detail="Item not found")

        cache_delete(admin_cache_key(user["branch_id"], "local_items"))
        cache_delete(admin_cache_key(user["branch_id"], "inventory"))
        return {"message": "Item updated"}

    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.delete("/local_items/{item_id}")
def delete_local_item(
    item_id: int,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user)
):
    LocalItem = Base.classes.local_item

    stmt = (
        delete(LocalItem)
        .where(
            LocalItem.local_item_id == item_id,
            LocalItem.branch_id == user["branch_id"]
        )
    )

    try:
        result = db.execute(stmt)
        db.commit()

        if result.rowcount == 0:  # type: ignore
            raise HTTPException(status_code=404, detail="Item not found")

        cache_delete(admin_cache_key(user["branch_id"], "local_items"))
        cache_delete(admin_cache_key(user["branch_id"], "inventory"))
        return {"message": "Item deleted"}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.put("/inventory/{inventory_id}")
def update_inventory_item(
    inventory_id: int,
    item: schema.InventoryUpdate,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user)
):
    Inventory = Base.classes.inventory

    try:
        update_data = item.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")

        values_to_update = {}

        if "product_id" in update_data or "item_name" in update_data:
            values_to_update["local_item_id"] = resolve_local_item_id(
                db=db,
                branch_id=user["branch_id"],
                product_id=update_data.get("product_id"),
                item_name=update_data.get("item_name"),
            )

        if "quantity" in update_data:
            values_to_update["quantity"] = update_data["quantity"]

        if not values_to_update:
            raise HTTPException(status_code=400, detail="No valid fields provided for update")

        stmt = (
            update(Inventory)
            .where(
                Inventory.inventory_id == inventory_id,
                Inventory.branch_id == user["branch_id"]
            )
            .values(**values_to_update)
        )

        result = db.execute(stmt)
        db.commit()

        if result.rowcount == 0:  # type: ignore
            raise HTTPException(status_code=404, detail="Inventory item not found")

        cache_delete(admin_cache_key(user["branch_id"], "inventory"))
        return {"message": "Inventory item updated"}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Admin_Router.delete("/inventory/{inventory_id}")
def delete_inventory_item(
    inventory_id: int,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user)
):
    Inventory = Base.classes.inventory

    stmt = (
        delete(Inventory)
        .where(
            Inventory.inventory_id == inventory_id,
            Inventory.branch_id == user["branch_id"]
        )
    )

    try:
        result = db.execute(stmt)
        db.commit()

        if result.rowcount == 0:  # type: ignore
            raise HTTPException(status_code=404, detail="Inventory item not found")

        cache_delete(admin_cache_key(user["branch_id"], "inventory"))
        return {"message": "Inventory item deleted"}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


# -----------------------------
# Central Admin
# -----------------------------

@Central_Admin_Router.get("/branches")
def get_branch_summary(db: Session = Depends(get_db_with_role)):
    BranchTracker = get_table_class("branch_tracker")
    Orders = get_table_class("orders")

    if BranchTracker is None and Orders is None:
        raise HTTPException(status_code=500, detail="No branch data sources available")

    if BranchTracker is not None:
        branch_id = require_column(BranchTracker, "branch_id")
        report_date = require_column(BranchTracker, "report_date")
        sales = require_column(BranchTracker, "sales")
        production_cost = require_column(BranchTracker, "production_cost")
        operation_cost = require_column(BranchTracker, "operation_cost")

        stmt = (
            select(
                branch_id.label("branch_id"),
                func.max(report_date).label("latest_report_date"),
                func.coalesce(func.sum(sales), 0).label("total_sales"),
                func.coalesce(func.sum(production_cost), 0).label("total_production_cost"),
                func.coalesce(func.sum(operation_cost), 0).label("total_operation_cost"),
            )
            .group_by(branch_id)
            .order_by(branch_id)
        )
    else:
        branch_id = require_column(Orders, "branch_id")
        price = get_column(Orders, "price")
        cost = get_column(Orders, "cost")

        columns = [
            branch_id.label("branch_id"),
            func.count().label("order_count"),
        ]

        if price is not None:
            columns.append(func.coalesce(func.sum(price), 0).label("total_sales"))
        if cost is not None:
            columns.append(func.coalesce(func.sum(cost), 0).label("total_cost"))

        stmt = select(*columns).group_by(branch_id).order_by(branch_id)

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Central_Admin_Router.get("/managers")
def get_managers(
    role_id: int | None = None,
    db: Session = Depends(get_db_with_role),
):
    BranchEmployee = require_table_class("branch_employee")
    Employee = get_table_class("employee")

    employee_id = require_column(BranchEmployee, "employee_id")
    branch_id = require_column(BranchEmployee, "branch_id")
    role_col = get_column(BranchEmployee, "employee_role")
    salary_col = get_column(BranchEmployee, "salary")

    columns = [
        employee_id.label("employee_id"),
        branch_id.label("branch_id"),
    ]

    if role_col is not None:
        columns.append(role_col.label("role_id"))
    if salary_col is not None:
        columns.append(salary_col.label("salary"))

    employee_join = False
    if Employee is not None:
        emp_id = get_column(Employee, "employee_id")
        if emp_id is not None:
            employee_join = True
            name_col = get_column(Employee, "name", "full_name")
            email_col = get_column(Employee, "email")
            phone_col = get_column(Employee, "phone", "phone_number")

            if name_col is not None:
                columns.append(name_col.label("employee_name"))
            if email_col is not None:
                columns.append(email_col.label("employee_email"))
            if phone_col is not None:
                columns.append(phone_col.label("employee_phone"))

    stmt = select(*columns).select_from(BranchEmployee)
    if employee_join:
        stmt = stmt.outerjoin(Employee, get_column(Employee, "employee_id") == employee_id)

    if role_id is None and ROLE_MANAGER_ID is not None:
        role_id = ROLE_MANAGER_ID

    if role_id is not None:
        if role_col is None:
            raise HTTPException(status_code=500, detail="Role column not found")
        stmt = stmt.where(role_col == role_id)

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Central_Admin_Router.get("/reports")
def get_financial_reports(db: Session = Depends(get_db_with_role)):
    BranchTracker = require_table_class("branch_tracker")

    branch_id = require_column(BranchTracker, "branch_id")
    report_date = require_column(BranchTracker, "report_date")
    sales = require_column(BranchTracker, "sales")
    production_cost = require_column(BranchTracker, "production_cost")
    operation_cost = require_column(BranchTracker, "operation_cost")

    stmt = (
        select(
            branch_id.label("branch_id"),
            report_date.label("report_date"),
            sales.label("sales"),
            production_cost.label("production_cost"),
            operation_cost.label("operation_cost"),
        )
        .order_by(report_date.desc())
    )

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


# -----------------------------
# Manager
# -----------------------------

@Manager_Router.get("/team")
def get_branch_team(
    role_id: int | None = None,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    BranchEmployee = require_table_class("branch_employee")
    Employee = get_table_class("employee")
    RoleTable = get_table_class("employee_role")

    employee_id = require_column(BranchEmployee, "employee_id")
    branch_id = require_column(BranchEmployee, "branch_id")
    role_col = get_column(BranchEmployee, "employee_role")
    salary_col = get_column(BranchEmployee, "salary")

    columns = [
        employee_id.label("employee_id"),
        branch_id.label("branch_id"),
    ]

    if role_col is not None:
        columns.append(role_col.label("role_id"))
    if salary_col is not None:
        columns.append(salary_col.label("salary"))

    employee_join = False
    if Employee is not None:
        emp_id = get_column(Employee, "employee_id")
        if emp_id is not None:
            employee_join = True
            name_col = get_column(Employee, "name", "full_name")
            email_col = get_column(Employee, "email")
            phone_col = get_column(Employee, "phone", "phone_number")

            if name_col is not None:
                columns.append(name_col.label("employee_name"))
            if email_col is not None:
                columns.append(email_col.label("employee_email"))
            if phone_col is not None:
                columns.append(phone_col.label("employee_phone"))

    role_join = False
    if RoleTable is not None and role_col is not None:
        role_id_col = get_column(RoleTable, "role_id", "id")
        role_name_col = get_column(RoleTable, "role_name", "name")
        if role_id_col is not None and role_name_col is not None:
            role_join = True
            columns.append(role_name_col.label("role_name"))

    stmt = select(*columns).select_from(BranchEmployee)

    if employee_join:
        stmt = stmt.outerjoin(Employee, get_column(Employee, "employee_id") == employee_id)
    if role_join:
        stmt = stmt.outerjoin(RoleTable, get_column(RoleTable, "role_id", "id") == role_col)

    stmt = stmt.where(branch_id == user["branch_id"])

    if role_id is not None:
        if role_col is None:
            raise HTTPException(status_code=500, detail="Role column not found")
        stmt = stmt.where(role_col == role_id)

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Manager_Router.get("/orders")
def get_manager_orders(
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    Orders = require_table_class("orders")
    Customer = get_table_class("customer")

    order_id = require_column(Orders, "order_id")
    branch_id = require_column(Orders, "branch_id")
    status_col = get_column(Orders, "status")
    price_col = get_column(Orders, "price")
    cost_col = get_column(Orders, "cost")
    order_date = get_column(Orders, "order_date")
    final_date = get_column(Orders, "final_date")
    payment_done = get_column(Orders, "payment_done")
    customer_id = get_column(Orders, "customer_id")

    columns = [
        order_id.label("order_id"),
        branch_id.label("branch_id"),
    ]

    if status_col is not None:
        columns.append(status_col.label("status"))
    if price_col is not None:
        columns.append(price_col.label("price"))
    if cost_col is not None:
        columns.append(cost_col.label("cost"))
    if order_date is not None:
        columns.append(order_date.label("order_date"))
    if final_date is not None:
        columns.append(final_date.label("final_date"))
    if payment_done is not None:
        columns.append(payment_done.label("payment_done"))

    stmt = select(*columns).select_from(Orders)

    if Customer is not None and customer_id is not None:
        cust_id = get_column(Customer, "customer_id")
        cust_name = get_column(Customer, "name")
        cust_branch = get_column(Customer, "branch_id")
        if cust_id is not None and cust_name is not None and cust_branch is not None:
            stmt = stmt.outerjoin(
                Customer,
                (cust_id == customer_id) & (cust_branch == user["branch_id"]),
            )
            stmt = stmt.add_columns(cust_name.label("customer_name"))

    stmt = stmt.where(branch_id == user["branch_id"]).order_by(order_id.desc())

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


# -----------------------------
# Finance
# -----------------------------

@Finance_Router.get("/pricing")
def get_finance_pricing(
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    LocalItem = require_table_class("local_item")

    local_item_id = require_column(LocalItem, "local_item_id")
    branch_id = require_column(LocalItem, "branch_id")
    name_col = get_column(LocalItem, "name")
    category_col = get_column(LocalItem, "category_name", "catogary_name")
    weight_col = get_column(LocalItem, "weight")
    selling_price = get_column(LocalItem, "selling_price")
    production_cost = get_column(LocalItem, "production_cost")

    columns = [
        local_item_id.label("local_item_id"),
        branch_id.label("branch_id"),
    ]

    if name_col is not None:
        columns.append(name_col.label("name"))
    if category_col is not None:
        columns.append(category_col.label("category_name"))
    if weight_col is not None:
        columns.append(weight_col.label("weight"))
    if selling_price is not None:
        columns.append(selling_price.label("selling_price"))
    if production_cost is not None:
        columns.append(production_cost.label("production_cost"))

    stmt = select(*columns).where(branch_id == user["branch_id"]).order_by(local_item_id)

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Finance_Router.put("/pricing/{item_id}")
def update_finance_pricing(
    item_id: int,
    payload: schema.PricingUpdate,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    LocalItem = require_table_class("local_item")

    update_data = payload.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields provided for update")

    stmt = (
        update(LocalItem)
        .where(
            LocalItem.local_item_id == item_id,
            LocalItem.branch_id == user["branch_id"],
        )
        .values(**update_data)
    )

    try:
        result = db.execute(stmt)
        db.commit()

        if result.rowcount == 0:  # type: ignore
            raise HTTPException(status_code=404, detail="Item not found")

        cache_delete(admin_cache_key(user["branch_id"], "local_items"))
        cache_delete(admin_cache_key(user["branch_id"], "inventory"))
        return {"message": "Pricing updated"}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Finance_Router.get("/costs")
def get_finance_costs(
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    BranchCost = get_table_class("branch_import_cost")
    if BranchCost is None:
        return []

    from_branch_id = get_column(BranchCost, "from_branch_id")
    to_branch_id = get_column(BranchCost, "to_branch_id")
    cost_col = get_column(BranchCost, "cost")

    if to_branch_id is None:
        raise HTTPException(status_code=500, detail="Missing cost columns")

    columns = []
    if from_branch_id is not None:
        columns.append(from_branch_id.label("from_branch_id"))
    columns.append(to_branch_id.label("to_branch_id"))
    if cost_col is not None:
        columns.append(cost_col.label("cost"))

    stmt = select(*columns).where(to_branch_id == user["branch_id"])

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Finance_Router.get("/reports")
def get_finance_reports(
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    BranchTracker = require_table_class("branch_tracker")

    branch_id = require_column(BranchTracker, "branch_id")
    report_date = require_column(BranchTracker, "report_date")
    sales = require_column(BranchTracker, "sales")
    production_cost = require_column(BranchTracker, "production_cost")
    operation_cost = require_column(BranchTracker, "operation_cost")

    stmt = (
        select(
            report_date.label("report_date"),
            sales.label("sales"),
            production_cost.label("production_cost"),
            operation_cost.label("operation_cost"),
        )
        .where(branch_id == user["branch_id"])
        .order_by(report_date.desc())
    )

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


# -----------------------------
# Worker
# -----------------------------

@Worker_Router.get("/inventory")
def get_worker_inventory(
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    Inventory = require_table_class("inventory")
    LocalItem = get_table_class("local_item")

    inventory_id = require_column(Inventory, "inventory_id")
    branch_id = require_column(Inventory, "branch_id")
    local_item_id = require_column(Inventory, "local_item_id")
    quantity = require_column(Inventory, "quantity")

    columns = [
        inventory_id.label("inventory_id"),
        local_item_id.label("local_item_id"),
        quantity.label("quantity"),
    ]

    stmt = select(*columns).select_from(Inventory)

    if LocalItem is not None:
        item_id = get_column(LocalItem, "local_item_id")
        item_name = get_column(LocalItem, "name")
        if item_id is not None and item_name is not None:
            stmt = stmt.outerjoin(LocalItem, item_id == local_item_id)
            stmt = stmt.add_columns(item_name.label("item_name"))

    stmt = stmt.where(branch_id == user["branch_id"]).order_by(inventory_id)

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Worker_Router.put("/inventory/{inventory_id}")
def update_worker_inventory(
    inventory_id: int,
    item: schema.InventoryUpdate,
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    Inventory = require_table_class("inventory")

    update_data = item.model_dump(exclude_unset=True)
    if "quantity" not in update_data:
        raise HTTPException(status_code=400, detail="Only quantity updates are allowed")

    stmt = (
        update(Inventory)
        .where(
            Inventory.inventory_id == inventory_id,
            Inventory.branch_id == user["branch_id"],
        )
        .values(quantity=update_data["quantity"])
    )

    try:
        result = db.execute(stmt)
        db.commit()

        if result.rowcount == 0:  # type: ignore
            raise HTTPException(status_code=404, detail="Inventory item not found")

        cache_delete(admin_cache_key(user["branch_id"], "inventory"))
        return {"message": "Inventory updated"}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Worker_Router.get("/movements")
def get_worker_movements(
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    OrderDetail = get_table_class("order_detail")
    if OrderDetail is None:
        return []

    LocalItem = get_table_class("local_item")

    order_id = get_column(OrderDetail, "order_id")
    branch_id = get_column(OrderDetail, "branch_id")
    local_item_id = get_column(OrderDetail, "local_item_id")
    quantity = get_column(OrderDetail, "quantity")
    detail_id = get_column(OrderDetail, "order_detail_id", "detail_id")

    columns = []
    if detail_id is not None:
        columns.append(detail_id.label("movement_id"))
    if order_id is not None:
        columns.append(order_id.label("order_id"))
    if local_item_id is not None:
        columns.append(local_item_id.label("local_item_id"))
    if quantity is not None:
        columns.append(quantity.label("quantity"))

    stmt = select(*columns).select_from(OrderDetail)

    if LocalItem is not None and local_item_id is not None:
        item_id = get_column(LocalItem, "local_item_id")
        item_name = get_column(LocalItem, "name")
        if item_id is not None and item_name is not None:
            stmt = stmt.outerjoin(LocalItem, item_id == local_item_id)
            stmt = stmt.add_columns(item_name.label("item_name"))

    if branch_id is not None:
        stmt = stmt.where(branch_id == user["branch_id"])

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")


@Worker_Router.get("/replenishments")
def get_worker_replenishments(
    db: Session = Depends(get_db_with_role),
    user=Depends(get_current_user),
):
    Requisition = get_table_class("requisition_list")
    if Requisition is None:
        return []

    LocalItem = get_table_class("local_item")

    requisition_id = get_column(Requisition, "id")
    branch_id = get_column(Requisition, "branch_id")
    local_item_id = get_column(Requisition, "local_item_id")
    quantity = get_column(Requisition, "sales_order_quantity")
    approved = get_column(Requisition, "approved")

    columns = []
    if requisition_id is not None:
        columns.append(requisition_id.label("requisition_id"))
    if local_item_id is not None:
        columns.append(local_item_id.label("local_item_id"))
    if quantity is not None:
        columns.append(quantity.label("quantity"))
    if approved is not None:
        columns.append(approved.label("approved"))

    stmt = select(*columns).select_from(Requisition)

    if LocalItem is not None and local_item_id is not None:
        item_id = get_column(LocalItem, "local_item_id")
        item_name = get_column(LocalItem, "name")
        if item_id is not None and item_name is not None:
            stmt = stmt.outerjoin(LocalItem, item_id == local_item_id)
            stmt = stmt.add_columns(item_name.label("item_name"))

    if branch_id is not None:
        stmt = stmt.where(branch_id == user["branch_id"])

    try:
        rows = [dict(row) for row in db.execute(stmt).mappings().all()]
        return rows
    except SQLAlchemyError as e:
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")






app.include_router(Central_Admin_Router)
app.include_router(Finance_Router)
app.include_router(Manager_Router)
app.include_router(Worker_Router)
app.include_router(Admin_Router)