from fastapi import APIRouter, FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text, select, func, cast, Integer
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.automap import automap_base

# -----------------------------
# DATABASE SETUP
# -----------------------------
DATABASE_URL = "postgresql+psycopg2://curr_user:hassan@localhost/company2"

engine = create_engine(DATABASE_URL)
Base = automap_base()
Base.prepare(engine, reflect=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

BC = Base.classes  # automapped classes

# -----------------------------
# DEPENDENCY
# -----------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_with_role(role_name: str):
    db = SessionLocal()

    try:
        # Start transaction explicitly
        db.begin()
        # Set role locally (only for this transaction)
        db.execute(text(f'SET LOCAL ROLE "{role_name}"'))
        yield db
        db.commit()
    except:
        db.rollback()
        raise
    finally:
        db.close()
        

# -----------------------------
# Create local branch context for each request
# -----------------------------
def ensure_branch_context(db: Session):
    """
    Ensures branch_id exists on THIS connection.
    Fails fast if user is not logged in.
    """
    branch_id = db.execute(
        text("SELECT current_setting('my.branch_id', true)")
    ).scalar()

    if branch_id is None:
        raise HTTPException(
            status_code=401,
            detail="Session has no branch_id (not logged in)"
        )

    # re-attach it safely for THIS transaction
    db.execute(
        text("SET LOCAL my.branch_id = :branch_id"),
        {"branch_id": branch_id}
    )

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
# Pydantic request model ONLY
# -----------------------------
class LoginRequest(BaseModel):
    email: str
    password: str
    
    
# -----------------------------
# LOGIN ROUTE
# -----------------------------
@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    try:
        sql = text('SELECT * FROM "login"(:loginemail, :loginpass)')
        result = (
            db.execute(sql, {"loginemail": data.email, "loginpass": data.password})
            .mappings()
            .fetchone()
        )

        if not result:
            return {"status": "error", "message": "Invalid login"}

        # Fetch current role after login
        role_name = db.execute(
            text("select current_setting('my.role')")
        ).scalar()

        # SET ROLE inside the DB session
        if role_name:
            db.execute(text(f'SET ROLE "{role_name}"'))
            db.commit()

        return {
            "status": "success",
            "message": "Login successful",
            "role": role_name
        }

    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))





# -----------------------------
# Admin Routes
# -----------------------------


# Get Requisition List

@Admin_Router.get("/requisitions")
def get_requisition_list(session: Session = Depends(get_db)):
    Req = Base.classes.requisition_list
    LocalItem = Base.classes.local_item
    City      = Base.classes.city
    Country   = Base.classes.country
    
    ensure_branch_context(session)

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
        .outerjoin(City, City.city_id == cast(Req.source, Integer))
        .where(
            Req.branch_id == cast(func.current_setting("my.branch_id"), Integer)
        )
    )

    rows = session.execute(stmt).mappings().all()
    return rows


@Admin_Router.get("/orders")
def get_all_orders(session: Session = Depends(get_db)):
    ensure_branch_context(session)

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
                   customer.branch_id == cast(func.current_setting("my.branch_id"), Integer))
        .where(Orders.branch_id == cast(func.current_setting("my.branch_id"), Integer))
    )   

    rows = session.execute(stmt).mappings().all()
    return rows















app.include_router(Central_Admin_Router)
app.include_router(Finance_Router)
app.include_router(Manager_Router)
app.include_router(Worker_Router)
app.include_router(Admin_Router)