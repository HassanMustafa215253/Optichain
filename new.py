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
import logging

import schema

SECRET_KEY = "sdkljn$jern@r3jrn34kjb..34orn&un5479*hn34iugskd!fnvs()334jnk3"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

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

    try:
        rows = db.execute(stmt).mappings().all()
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

    try:
        rows = db.execute(stmt).mappings().all()
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

    try:
        rows = db.execute(stmt).mappings().all()
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

    try:
        rows = db.execute(stmt).mappings().all()
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

    try:
        rows = db.execute(stmt).mappings().all()
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
            return {"message": "Inventory quantity updated"}

        new_inventory = Inventory(
            branch_id=user["branch_id"],
            local_item_id=resolved_local_item_id,
            quantity=item.quantity
        )

        db.add(new_inventory)
        db.commit()
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

        return {"message": "Inventory item deleted"}
    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logging.error("DB error: %s", e)
        raise HTTPException(status_code=500, detail="Database error")






app.include_router(Central_Admin_Router)
app.include_router(Finance_Router)
app.include_router(Manager_Router)
app.include_router(Worker_Router)
app.include_router(Admin_Router)