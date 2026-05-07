from fastapi import APIRouter, FastAPI, Depends, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer   
from pydantic import BaseModel
from sqlalchemy import create_engine, text, select, func, cast, Integer
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.automap import automap_base
from jose import jwt
from jose.exceptions import JWTError
from datetime import datetime, timedelta


SECRET_KEY = "CHANGE_THIS_TO_RANDOM_64_CHAR_STRING"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# -----------------------------
# DATABASE SETUP
# -----------------------------
DATABASE_URL = "postgresql+psycopg2://curr_user:hassan@localhost/company2"

engine = create_engine(DATABASE_URL)
Base = automap_base()
Base.prepare(autoload_with=engine)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
BC = Base.classes  # automapped classes

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------------
# Something to do with Tokens
# -----------------------------

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# -----------------------------
# Helper Functions
# -----------------------------


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def apply_rls_context(db: Session, user: dict):
    db.execute(
        text("SET LOCAL my.branch_id = :branch_id"),
        {"branch_id": user["branch_id"]}
    )

# -----------------------------
# Router Creation
# -----------------------------

router = APIRouter()

# -----------------------------
# Schemas
# -----------------------------

class UserLogin(BaseModel):
    email: str
    password: str




# -----------------------------
# Testing
# -----------------------------



def login(data: UserLogin, response: Response, db: Session = Depends(get_db)):
    
    result = db.execute(
        text("select * from login( :email, :password)"),{
            "email":data.email,
            "password":data.password
        }
    ).mappings().fetchone()
    
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
        max_age=3600
    )

    return {"response_code": result.response_code, "code_desc": result.code_desc,"role": result.role}


result=UserLogin(email="hassan@gmail.com",password="Hassan@1234")
db = SessionLocal()
resp=Response()
print(login(result,resp,db))