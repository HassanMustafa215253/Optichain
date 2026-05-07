from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.automap import automap_base
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy import create_engine, text, func, cast, Integer, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.inspection import inspect
from typing import Optional

# -----------------------------
# DATABASE SETUP
# -----------------------------
DATABASE_URL = "postgresql+psycopg2://curr_user:hassan@localhost/company2"

engine = create_engine(DATABASE_URL)
Base = automap_base()
Base.prepare(engine, reflect=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

BC = Base.classes  # automapped classes



def orm_to_dict(obj):
    """Convert an ORM object into a dictionary."""
    return {c.key: getattr(obj, c.key) for c in inspect(obj).mapper.column_attrs}


# -----------------------------
# DEPENDENCY
# -----------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------------
# Pydantic request model ONLY
# -----------------------------
class LoginRequest(BaseModel):
    email: str
    password: str


# -----------------------------
# FASTAPI APP
# -----------------------------
app = FastAPI()


# -----------------------------
# LOGIN ROUTE (no response model)
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
# OPTIONAL: GET CURRENT ROLE
# -----------------------------
@app.get("/role")
def get_role(db: Session = Depends(get_db)):
    try:
        role = db.execute(text("select current_setting('my.role')")).scalar()
        return {"role": role}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------
# 1) GET ALL EMPLOYEES
# ---------------------------------------
@app.get("/employees")
def get_employees(db: Session = Depends(get_db)):
    employees = db.query(BC.employee).all()

    employee_list = []
    for emp in employees:
        employee_list.append({
            "employee_id": emp.employee_id,
            "firstname": emp.firstname,
            "lastname": emp.lastname,
            "email": emp.email,
            "phone": emp.phone if hasattr(emp, "phone") else None,
        })

    return employee_list


# ---------------------------------------
# 2) ADD EMPLOYEE  (requires Pydantic for POST body)
# ---------------------------------------
class AddEmployeeRequest(BaseModel):
    firstname: str
    lastname: str
    email: str
    password: str

@app.post("/employees/add")
def add_employee(data: AddEmployeeRequest, db: Session = Depends(get_db)):
    new_employee = BC.employee(
        firstname=data.firstname,
        lastname=data.lastname,
        email=data.email,
        password=data.password
    )

    db.add(new_employee)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "success", "message": "Employee added successfully"}


# ---------------------------------------
# 3) DELETE EMPLOYEE (only email param)
# ---------------------------------------
@app.delete("/employees/delete/{email}")
def delete_employee(email: str, db: Session = Depends(get_db)):
    employee = (
        db.query(BC.employee)
        .filter(BC.employee.email == email)
        .first()
    )

    if not employee:
        return {
            "status": "error",
            "message": f"Employee '{email}' not found"
        }

    db.delete(employee)
    db.commit()

    return {
        "status": "success",
        "message": f"Employee '{email}' removed successfully"
    }


# ---------------------------------------
# 4) ADD BRANCH (uses stored procedure)
# ---------------------------------------
class AddBranchRequest(BaseModel):
    city: str
    country: str

@app.post("/branches/add")
def add_branch(data: AddBranchRequest, db: Session = Depends(get_db)):

    sql = text("select * from add_new_branch(:city, :country)")
    result = (
        db.execute(sql, {"city": data.city, "country": data.country})
        .mappings()
        .fetchone()
    )

    if not result:
        return {
            "response_code": 500,
            "code_desc": "No data returned from add_new_branch",
            "ret_branch_id": None
        }

    return {
        "response_code": result["response_code"],
        "code_desc": result["code_desc"],
        "ret_branch_id": result["ret_branch_id"]
    }
    db.commit()
# add_branch(session,"Russia","Moscow")


# Delete Branch
@app.delete("/branches/delete/{branch_id}")
def delete_branch(branch_id: int, db: Session = Depends(get_db)):
    result = (
        db.execute(
            text("select * from remove_branch(:branch_id)"),
            {"branch_id": branch_id}
        )
        .mappings()
        .fetchone()
    )

    if not result:
        return {
            "success": False,
            "message": "No data returned from stored procedure"
        }

    return dict(result)

# delete_branch(session,4)

class AssignManagerRequest(BaseModel):
    employee_email: str
    branch_id: int
    salary: int = 0


# Assign manager to branch
@app.post("/branches/assign-manager")
def add_manager_to_branch(data: AssignManagerRequest, db: Session = Depends(get_db)):
    try:
        Employee = BC.employee
        BranchEmployee = BC.branch_employee

        # 1. Find employee by email
        employee = (
            db.query(Employee)
            .filter(Employee.email == data.employee_email)
            .first()
        )

        if not employee:
            return {"success": False, "error": "Employee not found"}

        employee_id = employee.employee_id

        # 2. Check if employee already belongs to branch
        existing = (
            db.query(BranchEmployee)
            .filter(
                BranchEmployee.employee_id == employee_id,
                BranchEmployee.branch_id == data.branch_id,
            )
            .first()
        )

        # Case A: employee exists in branch
        if existing:
            # Already manager
            if existing.employee_role == 2:
                return {
                    "success": True,
                    "message": "Employee is already a manager",
                    "branch_employee_id": existing.branch_employee_id,
                }

            # Not manager → promote to manager
            existing.employee_role = 2
            db.commit()
            db.refresh(existing)

            return {
                "success": True,
                "message": "Existing employee promoted to manager",
                "branch_employee_id": existing.branch_employee_id,
            }

        # Case B: employee not in branch → add as manager
        new_record = BranchEmployee(
            employee_id=employee_id,
            branch_id=data.branch_id,
            employee_role=2,  # manager
            salary=data.salary
        )

        db.add(new_record)
        db.commit()
        db.refresh(new_record)

        return {
            "success": True,
            "message": "Manager assigned successfully",
            "branch_employee_id": new_record.branch_employee_id,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
# add_manager_to_branch(session,"rayyan@gmail.com",2,100000)


# Generate Report
@app.get("/reports/branches")
def get_branch_reports(db: Session = Depends(get_db)):
    BranchTracker = Base.classes.branch_tracker

    reports = (
        db.query(
            BranchTracker.branch_id,
            func.sum(BranchTracker.production_cost).label("total_production_cost"),
            func.sum(BranchTracker.operation_cost).label("total_operation_cost"),
            func.sum(BranchTracker.sales).label("total_sales"),
            (
                func.sum(BranchTracker.sales)
                - func.sum(BranchTracker.production_cost)
                - func.sum(BranchTracker.operation_cost)
            ).label("profit"),
            func.count(BranchTracker.tracker_id).label("num_reports"),
            func.min(BranchTracker.report_date).label("first_report"),
            func.max(BranchTracker.report_date).label("last_report"),
        )
        .group_by(BranchTracker.branch_id)
        .all()
    )

    return [
        {
            "branch_id": r.branch_id,
            "total_production_cost": r.total_production_cost,
            "total_operation_cost": r.total_operation_cost,
            "total_sales": r.total_sales,
            "profit": r.profit,
            "num_reports": r.num_reports,
            "first_report_date": r.first_report,
            "last_report_date": r.last_report,
        }
        for r in reports
    ]


# Detailed Per Branch Report 
@app.get("/reports/branch/{branch_id}")
def get_branch_report_manager(branch_id: int, db: Session = Depends(get_db)):
    BranchTracker = Base.classes.branch_tracker

    report = (
        db.query(
            BranchTracker.branch_id,
            func.sum(BranchTracker.production_cost).label("total_production_cost"),
            func.sum(BranchTracker.operation_cost).label("total_operation_cost"),
            func.sum(BranchTracker.sales).label("total_sales"),
            (func.sum(BranchTracker.sales)
             - func.sum(BranchTracker.production_cost)
             - func.sum(BranchTracker.operation_cost)).label("profit"),
            func.count(BranchTracker.tracker_id).label("num_reports"),
            func.min(BranchTracker.report_date).label("first_report"),
            func.max(BranchTracker.report_date).label("last_report")
        )
        .filter(BranchTracker.branch_id == branch_id)
        .group_by(BranchTracker.branch_id)
        .first()
    )

    if not report:
        return {"error": f"No reports found for branch {branch_id}"}

    return {
        "branch_id": report.branch_id,
        "total_production_cost": report.total_production_cost,
        "total_operation_cost": report.total_operation_cost,
        "total_sales": report.total_sales,
        "profit": report.profit,
        "num_reports": report.num_reports,
        "first_report_date": report.first_report,
        "last_report_date": report.last_report
    }

    
# Over All report
@app.get("/reports/combined")
def get_combined_report(db: Session = Depends(get_db)):
    BranchTracker = Base.classes.branch_tracker

    combined = (
        db.query(
            func.sum(BranchTracker.production_cost).label("total_production_cost"),
            func.sum(BranchTracker.operation_cost).label("total_operation_cost"),
            func.sum(BranchTracker.sales).label("total_sales"),
            (func.sum(BranchTracker.sales)
             - func.sum(BranchTracker.production_cost)
             - func.sum(BranchTracker.operation_cost)).label("total_profit"),
            ((func.sum(BranchTracker.sales)
             - func.sum(BranchTracker.production_cost)
             - func.sum(BranchTracker.operation_cost)
            ) / func.nullif(func.sum(BranchTracker.sales), 0) * 100).label("profit_margin_percent"),
            func.count(BranchTracker.tracker_id).label("num_reports"),
            func.min(BranchTracker.report_date).label("first_report_date"),
            func.max(BranchTracker.report_date).label("last_report_date")
        )
        .one()
    )

    return {
        "total_production_cost": combined.total_production_cost,
        "total_operation_cost": combined.total_operation_cost,
        "total_sales": combined.total_sales,
        "total_profit": combined.total_profit,
        "profit_margin_percent": combined.profit_margin_percent,
        "num_reports": combined.num_reports,
        "first_report_date": combined.first_report_date,
        "last_report_date": combined.last_report_date
    }


# **MANAGER**
# Add Employee to branch
class AddEmployeeBody(BaseModel):
    email: str
    first_name: str
    last_name: str
    role_id: int
    Salary: int
    Password: str

@app.post("/branch/add-employee")
def add_employee_to_branch(data: AddEmployeeBody, db: Session = Depends(get_db)):
    try:
        Employee = BC.employee
        BranchEmployee = BC.branch_employee

        current_branch_id = db.execute(
            text("SELECT current_setting('my.branch_id')::int")
        ).scalar()

        if not current_branch_id:
            return {"status": "error", "message": "Manager not logged in properly."}

        if data.role_id == 1:
            return {"status": "error", "message": "Manager cannot assign Central Admin role."}

        existing_emp = db.query(Employee).filter_by(email=data.email).first()

        if existing_emp:
            employee_id = existing_emp.employee_id
        else:
            new_emp = Employee(
                email=data.email,
                firstname=data.first_name,
                lastname=data.last_name,
                password=data.Password
            )
            db.add(new_emp)
            db.flush()
            employee_id = new_emp.employee_id

        assignment = BranchEmployee(
            employee_id=employee_id,
            branch_id=current_branch_id,
            employee_role=data.role_id,
            salary=data.Salary
        )

        db.add(assignment)
        db.commit()

        return {"status": "success", "employee_id": employee_id}

    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

# add_employee_to_branch(session,"3@gmail.com","3","3",3,50000,"3@1234")

# branch Report

@app.get("/branch/report")
def get_branch_report(db: Session = Depends(get_db)):
    branch_id = db.execute(text(
        "SELECT current_setting('my.branch_id')::int"
    )).scalar()

    BranchTracker = BC.branch_tracker

    report = (
        db.query(
            BranchTracker.branch_id,
            func.sum(BranchTracker.production_cost).label("total_production_cost"),
            func.sum(BranchTracker.operation_cost).label("total_operation_cost"),
            func.sum(BranchTracker.sales).label("total_sales"),
            (func.sum(BranchTracker.sales)
             - func.sum(BranchTracker.production_cost)
             - func.sum(BranchTracker.operation_cost)).label("profit"),
            func.count(BranchTracker.tracker_id).label("num_reports"),
            func.min(BranchTracker.report_date).label("first_report"),
            func.max(BranchTracker.report_date).label("last_report")
        )
        .filter(BranchTracker.branch_id == branch_id)
        .group_by(BranchTracker.branch_id)
        .first()
    )

    if not report:
        return {"error": f"No reports found for branch {branch_id}"}

    return {
        "branch_id": report.branch_id,
        "total_production_cost": report.total_production_cost,
        "total_operation_cost": report.total_operation_cost,
        "total_sales": report.total_sales,
        "profit": report.profit,
        "num_reports": report.num_reports,
        "first_report_date": report.first_report,
        "last_report_date": report.last_report
    }

# change employee positition
@app.post("/change-employee-position")
def change_employee_position(
    employee_id: int,
    new_role: int,
    salary: int = 0,
    db: Session = Depends(get_db)
):
    BranchEmployee = Base.classes.branch_employee

    try:
        # -----------------------------------------------------------
        # 1) Extract branch_id from PostgreSQL session variable
        # -----------------------------------------------------------
        branch_id = db.execute(
            text("SELECT cast(current_setting('my.branch_id') AS INTEGER)")
        ).scalar()

        if branch_id is None:
            return {"success": False, "error": "Branch session value not set"}

        # -----------------------------------------------------------
        # 2) Get the employee inside THIS branch
        # -----------------------------------------------------------
        record = (
            db.query(BranchEmployee)
            .filter(
                BranchEmployee.employee_id == employee_id,
                BranchEmployee.branch_id == branch_id
            )
            .first()
        )

        if not record:
            return {
                "success": False,
                "error": f"Employee {employee_id} not in your branch {branch_id}"
            }

        # -----------------------------------------------------------
        # 3) Update values
        # -----------------------------------------------------------
        record.employee_role = new_role
        record.salary = salary

        db.commit()
        db.refresh(record)

        return {
            "success": True,
            "message": "Employee position updated",
            "branch_employee_id": record.branch_employee_id,
            "branch_id": branch_id
        }

    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}

# **ADMIN**
# get every items from central inventory

@app.get("/central-inventory")
def get_central_inventory(db: Session = Depends(get_db)):
    CentralInventory = Base.classes.central_inventory

    # 1️⃣ Get branch_id from session variable
    branch_id = db.execute(
        text("SELECT cast(current_setting('my.branch_id') AS INTEGER)")
    ).scalar()

    if branch_id is None:
        return {"success": False, "error": "Branch not set in session"}

    # 2️⃣ Query central inventory for this branch
    stmt = (
        select(
            CentralInventory.post_id,
            CentralInventory.item_id,
            CentralInventory.quantity,
            CentralInventory.expiry,
            CentralInventory.weight,
            CentralInventory.price
        )
        .where(CentralInventory.branch_id == branch_id)
    )

    rows = db.execute(stmt).mappings().all()

    return {
        "success": True,
        "branch_id": branch_id,
        "central_inventory": rows
    }
    
    
# add into central inventory    
class AddCentralInventoryItem(BaseModel):
    item_id: int
    quantity: int
    price: float
    expiry: Optional[str] = None
    weight: Optional[int] = None
    
@app.post("/central-inventory/add")
def add_central_inventory_item(
    data: AddCentralInventoryItem,
    db: Session = Depends(get_db)
):
    CentralInventory = Base.classes.central_inventory

    # 1️⃣ Get branch_id from session
    branch_id = db.execute(
        text("SELECT cast(current_setting('my.branch_id') AS INTEGER)")
    ).scalar()

    if branch_id is None:
        return {"success": False, "error": "Branch not set in session"}

    # 2️⃣ Create new central_inventory record
    new_item = CentralInventory(
        branch_id=branch_id,
        item_id=data.item_id,
        quantity=data.quantity,
        price=data.price,
        expiry=data.expiry,
        weight=data.weight
    )

    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    return {
        "success": True,
        "message": f"Item {data.item_id} added to central inventory for branch {branch_id}",
        "post_id": new_item.post_id
    }



# get all customers
@app.get("/customers")
def get_customers(db: Session = Depends(get_db)):
    Customer = Base.classes.customer

    stmt = (
        select(
            Customer.customer_id,
            Customer.branch_id,
            Customer.name,
            Customer.email,
            Customer.phone_number,
        )
        .where(
            Customer.branch_id == cast(
                func.current_setting("my.branch_id"), Integer
            )
        )
    )

    rows = db.execute(stmt).mappings().all()

    return rows  # already list of dicts

# get_customers(session)
# get all requisition List

@app.get("/requisitions")
def get_requisition_list(session: Session = Depends(get_db)):
    Req = Base.classes.requisition_list

    stmt = (
        select(
            Req.id,
            Req.branch_id,
            Req.local_item_id,
            Req.sales_order_quantity,
            Req.source,
            Req.import_branch_id,
        )
        .where(
            Req.branch_id == cast(func.current_setting("my.branch_id"), Integer)
        )
    )

    rows = session.execute(stmt).mappings().all()
    return rows


# Edit Order
@app.put("/orders/{order_id}")
def update_order_value(
    order_id: int ,
    column_name: str ,
    new_value: str ,
    session: Session = Depends(get_db)
):
    # Fetch session branch_id
    branch_id_raw = session.execute(
        text("SELECT current_setting('my.branch_id')::int")
    ).scalar()

    if branch_id_raw is None:
        return {"success": False, "error": "Session has no branch_id"}

    user_branch_id = int(branch_id_raw)

    Orders = Base.classes.orders

    order = session.get(Orders, order_id)
    if order is None:
        return {"success": False, "error": "Order not found"}

    if order.branch_id != user_branch_id:
        return {
            "success": False,
            "error": f"You can only modify orders from your branch ({user_branch_id})."
        }

    valid_columns = Orders.__table__.columns.keys()
    if column_name not in valid_columns:
        return {
            "success": False,
            "error": f"Invalid column '{column_name}'. Valid: {list(valid_columns)}"
        }

    setattr(order, column_name, new_value)

    session.commit()
    session.refresh(order)

    return {
        "success": True,
        "message": f"Updated {column_name} to {new_value}",
        "order_id": order_id,
    }

# **Finance**
# Update Item Price
@app.put("/items/{local_item_id}/price")
def update_item_price(local_item_id: int, new_price: float, db: Session = Depends(get_db)):
    LocalItem = Base.classes.local_item

    updated_rows = db.query(LocalItem).filter(
        LocalItem.local_item_id == local_item_id
    ).update(
        {LocalItem.selling_price: new_price},
        synchronize_session=False
    )

    db.commit()

    if updated_rows == 0:
        return {"success": False, "message": "Item not found or no update made."}

    return {"success": True, "message": f"Updated item {local_item_id} price to {new_price}"}


# Update Production Cost of Local Item
@app.put("/items/{local_item_id}/production_cost")
def update_production_cost(local_item_id: int, new_cost: float, db: Session = Depends(get_db)):
    LocalItem = Base.classes.local_item

    updated_rows = db.query(LocalItem).filter(
        LocalItem.local_item_id == local_item_id
    ).update(
        {LocalItem.production_cost: new_cost},
        synchronize_session=False
    )

    db.commit()

    if updated_rows == 0:
        return {"success": False, "message": "Item not found or no update made."}

    return {"success": True, "message": f"Updated item {local_item_id} production cost to {new_cost}"}

# Generate Order Cost
@app.put("/orders/{order_id}/update-cost")
def update_order_cost(order_id: int, db: Session = Depends(get_db)):
    OrderDetail = Base.classes.order_detail
    LocalItem = Base.classes.local_item
    Orders = Base.classes.orders

    # Calculate total cost for this order
    total_cost = (
        db.query(func.sum(OrderDetail.quantity * LocalItem.selling_price))
        .join(LocalItem, LocalItem.local_item_id == OrderDetail.local_item_id)
        .filter(OrderDetail.order_id == order_id)
        .scalar()
    )

    if total_cost is None:
        total_cost = 0

    # Update the Orders table
    updated_rows = db.query(Orders).filter(Orders.order_id == order_id).update(
        {Orders.cost: total_cost}, synchronize_session=False
    )

    db.commit()

    if updated_rows == 0:
        return {"success": False, "message": "Order not found or no update made."}

    return {
        "success": True,
        "message": f"Order {order_id} cost updated to {total_cost}"
    }


# Add item
class AddLocalItemBody(BaseModel):
    branch_id: int
    global_item_id: int
    name: str
    category_name: str
    weight: int
    selling_price: float
    production_cost: float
    production_time: str   # adjust type if needed

@app.post("/local-items/add")
def add_local_item(data: AddLocalItemBody, db: Session = Depends(get_db)):
    GlobalItem = Base.classes.global_item
    LocalItem = Base.classes.local_item

    # 1. Check if global_item exists
    global_item = db.query(GlobalItem).filter(
        GlobalItem.global_item_id == data.global_item_id
    ).first()

    # 2. If not exists → create it
    if not global_item:
        global_item = GlobalItem(
            global_item_id=data.global_item_id,
            name=data.name,
            catogary_name=data.category_name
        )
        db.add(global_item)
        db.flush()  # ensures global_item_id is available

    # 3. Create local item
    new_local_item = LocalItem(
        global_item_id=global_item.global_item_id,
        branch_id=data.branch_id,
        name=data.name,
        catogary_name=data.category_name,
        weight=data.weight,
        selling_price=data.selling_price,
        production_cost=data.production_cost,
        production_time=data.production_time,
    )

    db.add(new_local_item)
    db.commit()

    return {
        "success": True,
        "message": f"Local item '{data.name}' added to branch {data.branch_id}",
        "local_item_id": new_local_item.local_item_id
    }
    
    
# **Worker**
# change inventory

class UpdateLocalItemRequest(BaseModel):
    local_item_id: int
    column_name: str
    new_value: float  # or str if you want to allow multiple types

@app.put("/local-items/update")
def update_local_item(data: UpdateLocalItemRequest, db: Session = Depends(get_db)):
    LocalItem = Base.classes.local_item

    # 1️⃣ Get user's branch from session variable
    branch_id = db.execute(
        text("SELECT cast(current_setting('my.branch_id') AS INTEGER)")
    ).scalar()

    if branch_id is None:
        return {"success": False, "error": "Branch not set in session"}

    # 2️⃣ Fetch the local item
    item = db.query(LocalItem).filter(
        LocalItem.local_item_id == data.local_item_id,
        LocalItem.branch_id == branch_id  # restrict to user's branch
    ).first()

    if not item:
        return {
            "success": False,
            "error": f"Item not found or does not belong to your branch (branch_id={branch_id})"
        }

    # 3️⃣ Validate column
    valid_columns = LocalItem.__table__.columns.keys()
    if data.column_name not in valid_columns:
        return {"success": False, "error": f"Invalid column '{data.column_name}'. Valid columns: {list(valid_columns)}"}

    # 4️⃣ Update value
    setattr(item, data.column_name, data.new_value)

    # 5️⃣ Commit
    db.commit()
    db.refresh(item)

    return {
        "success": True,
        "message": f"Updated column '{data.column_name}' to '{data.new_value}' for item {data.local_item_id}",
        "local_item_id": item.local_item_id,
        "branch_id": item.branch_id
    }
    
# get all items from inventory
@app.get("/inventory")
def get_inventory_items(db: Session = Depends(get_db)):
    Inventory = Base.classes.inventory
    LocalItem = Base.classes.local_item

    # 1️⃣ Get branch_id from session variable
    branch_id = db.execute(
        text("SELECT cast(current_setting('my.branch_id') AS INTEGER)")
    ).scalar()

    if branch_id is None:
        return {"success": False, "error": "Branch not set in session"}

    # 2️⃣ Query inventory for this branch, join with local_item for details
    stmt = (
        select(
            Inventory.inventory_id,
            Inventory.local_item_id,
            Inventory.quantity,
            LocalItem.name,
            LocalItem.selling_price,
            LocalItem.production_cost,
            LocalItem.weight
        )
        .join(LocalItem, LocalItem.local_item_id == Inventory.local_item_id)
        .where(Inventory.branch_id == branch_id)
    )

    rows = db.execute(stmt).mappings().all()

    return {
        "success": True,
        "branch_id": branch_id,
        "items": rows
    }
