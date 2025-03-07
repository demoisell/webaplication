from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
from enum import Enum
import uuid
from datetime import datetime
import uvicorn

# Initialize FastAPI app
app = FastAPI(
    title="User Management API",
    description="A modern API for managing users with extended functionality",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, example="John Doe")
    
    @validator('name')
    def name_must_not_contain_numbers(cls, v):
        if any(char.isdigit() for char in v):
            raise ValueError('Name should not contain numbers')
        return v

class UserCreate(UserBase):
    email: Optional[str] = Field(None, example="john@example.com")
    role: str = Field("user", example="user")

class User(UserBase):
    id: str
    created_at: datetime
    role: str = "user"
    email: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "id": "f7e6d5c4-b3a2-1098-7654-321012345678",
                "name": "John Doe",
                "email": "john@example.com",
                "role": "user",
                "created_at": "2023-01-01T12:00:00"
            }
        }

class Message(BaseModel):
    message: str

class PaginatedResponse(BaseModel):
    items: List[User]
    total: int
    page: int
    page_size: int
    pages: int

class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"

class UserIdsRequest(BaseModel):
    user_ids: List[str]

# Mock database
class Database:
    def __init__(self):
        self.users = {
            "1": User(
                id="1",
                name="Alice Smith",
                email="alice@example.com",
                role="admin",
                created_at=datetime.now()
            ),
            "2": User(
                id="2",
                name="Bob Johnson",
                email="bob@example.com",
                role="user",
                created_at=datetime.now()
            ),
            "3": User(
                id="3",
                name="Carol Williams",
                email="carol@example.com",
                role="user",
                created_at=datetime.now()
            )
        }
    
    def get_all_users(self) -> List[User]:
        return list(self.users.values())
    
    def get_user(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)
    
    def create_user(self, user: UserCreate) -> User:
        user_id = str(uuid.uuid4())
        new_user = User(
            id=user_id,
            name=user.name,
            email=user.email,
            role=user.role,
            created_at=datetime.now()
        )
        self.users[user_id] = new_user
        return new_user
    
    def update_user(self, user_id: str, user_data: Dict) -> Optional[User]:
        if user_id not in self.users:
            return None
        
        user = self.users[user_id]
        updated_data = user.dict()
        
        for field, value in user_data.items():
            if field in updated_data and field != "id" and field != "created_at":
                updated_data[field] = value
        
        self.users[user_id] = User(**updated_data)
        return self.users[user_id]
    
    def delete_user(self, user_id: str) -> bool:
        if user_id in self.users:
            del self.users[user_id]
            return True
        return False
    
    def search_users(self, query: str) -> List[User]:
        query = query.lower()
        return [
            user for user in self.users.values()
            if query in user.name.lower() or 
               (user.email and query in user.email.lower())
        ]

    def bulk_delete_users(self, user_ids: List[str]) -> int:
        deleted_count = 0
        for user_id in user_ids:
            if self.delete_user(user_id):
                deleted_count += 1
        return deleted_count

# Initialize database
db = Database()

# Dependency
def get_db():
    return db

# Routes
@app.get("/", response_model=Message)
def read_root():
    return {"message": "Welcome to the User Management API!"}

@app.get("/users", response_model=PaginatedResponse, tags=["Users"])
def get_users(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    role: Optional[str] = Query(None, description="Filter by role"),
    search: Optional[str] = Query(None, description="Search in name and email"),
    sort_by: str = Query("name", description="Field to sort by"),
    sort_order: SortOrder = Query(SortOrder.asc, description="Sort order"),
    db: Database = Depends(get_db)
):
    # Get all users first
    all_users = db.get_all_users()
    
    # Apply filtering
    filtered_users = all_users
    
    if role:
        filtered_users = [user for user in filtered_users if user.role == role]
    
    if search:
        search = search.lower()
        filtered_users = [
            user for user in filtered_users 
            if search in user.name.lower() or 
               (user.email and search in user.email.lower())
        ]
    
    # Apply sorting
    reverse = sort_order == SortOrder.desc
    if sort_by == "name":
        filtered_users.sort(key=lambda user: user.name, reverse=reverse)
    elif sort_by == "role":
        filtered_users.sort(key=lambda user: user.role, reverse=reverse)
    elif sort_by == "created_at":
        filtered_users.sort(key=lambda user: user.created_at, reverse=reverse)
    
    # Calculate total after filtering
    total = len(filtered_users)
    
    # Apply pagination
    start = (page - 1) * page_size
    end = start + page_size
    paginated_users = filtered_users[start:end]
    
    return {
        "items": paginated_users,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size
    }

@app.get("/users/{user_id}", response_model=User, tags=["Users"])
def get_user(user_id: str, db: Database = Depends(get_db)):
    user = db.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    return user

@app.post("/users", response_model=User, status_code=status.HTTP_201_CREATED, tags=["Users"])
def create_user(user: UserCreate, db: Database = Depends(get_db)):
    return db.create_user(user)

@app.put("/users/{user_id}", response_model=User, tags=["Users"])
def update_user(user_id: str, user_data: UserCreate, db: Database = Depends(get_db)):
    updated_user = db.update_user(user_id, user_data.dict())
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    return updated_user

@app.delete("/users/{user_id}", response_model=Message, tags=["Users"])
def delete_user(user_id: str, db: Database = Depends(get_db)):
    success = db.delete_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    return {"message": f"User with ID {user_id} deleted successfully"}

@app.post("/users/bulk-delete", response_model=Message, tags=["Users"])
def bulk_delete_users(
    request: UserIdsRequest,
    db: Database = Depends(get_db)
):
    deleted_count = db.bulk_delete_users(request.user_ids)
    return {"message": f"Successfully deleted {deleted_count} users"}

@app.get("/users/search/{query}", response_model=List[User], tags=["Users"])
def search_users(query: str, db: Database = Depends(get_db)):
    return db.search_users(query)

@app.get("/health", tags=["System"])
def health_check():
    return {"status": "healthy", "timestamp": datetime.now()}

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail},
    )

# Run the app
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)