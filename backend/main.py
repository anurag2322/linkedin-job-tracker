from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import motor.motor_asyncio
from bson import ObjectId
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Job Tracker API", version="1.0.0")

# CORS middleware to allow Chrome extension requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your extension ID
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
database = client.job_tracker
jobs_collection = database.jobs

# Pydantic models
class JobBase(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    url: Optional[str] = None
    platform: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    status: str = "saved"
    notes: Optional[str] = None
    date_saved: Optional[datetime] = Field(default_factory=datetime.now)


class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    company: Optional[str] = Field(None, min_length=1, max_length=100)
    location: Optional[str] = Field(None, max_length=100)
    status: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=500)

class JobResponse(JobBase):
    id: str

    class Config:
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }

# Helper functions
def job_helper(job) -> dict:
    """Helper function to format job document"""
    return {
        "id": str(job["_id"]),
        "title": job["title"],
        "company": job["company"],
        "location": job.get("location"),
        "url": job["url"],
        "platform": job["platform"],
        "description": job.get("description"),
        "status": job["status"],
        "notes": job.get("notes"),
        "date_saved": job["date_saved"].isoformat() if job.get("date_saved") else None
    }

# API Routes

@app.get("/")
async def root():
    return {"message": "Job Tracker API is running!"}

@app.post("/api/jobs/", response_model=JobResponse)
async def create_job(job: JobCreate):
    """Create a new job entry"""
    try:
        # Check if job already exists (same URL)
        existing_job = await jobs_collection.find_one({"url": job.url})
        if existing_job:
            raise HTTPException(status_code=400, detail="Job already exists")
        
        # Insert job
        job_dict = job.dict()
        job_dict["date_saved"] = datetime.now()
        
        result = await jobs_collection.insert_one(job_dict)
        new_job = await jobs_collection.find_one({"_id": result.inserted_id})
        
        return job_helper(new_job)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs/", response_model=List[JobResponse])
async def get_jobs(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get all jobs with optional filtering"""
    try:
        # Build filter query
        filter_query = {}
        if status:
            filter_query["status"] = status
        if platform:
            filter_query["platform"] = platform
        
        # Get jobs with pagination
        cursor = jobs_collection.find(filter_query).sort("date_saved", -1).skip(skip).limit(limit)
        jobs = await cursor.to_list(length=limit)
        
        return [job_helper(job) for job in jobs]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    """Get a specific job by ID"""
    try:
        if not ObjectId.is_valid(job_id):
            raise HTTPException(status_code=400, detail="Invalid job ID format")
        
        job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return job_helper(job)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/jobs/{job_id}", response_model=JobResponse)
async def update_job(job_id: str, job_update: JobUpdate):
    """Update a job entry"""
    try:
        if not ObjectId.is_valid(job_id):
            raise HTTPException(status_code=400, detail="Invalid job ID format")
        
        # Remove None values from update data
        update_data = {k: v for k, v in job_update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        result = await jobs_collection.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        
        updated_job = await jobs_collection.find_one({"_id": ObjectId(job_id)})
        return job_helper(updated_job)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job entry"""
    try:
        if not ObjectId.is_valid(job_id):
            raise HTTPException(status_code=400, detail="Invalid job ID format")
        
        result = await jobs_collection.delete_one({"_id": ObjectId(job_id)})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Job not found")
        
        return {"message": "Job deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/jobs/stats/summary")
async def get_jobs_summary():
    """Get job statistics summary"""
    try:
        pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        stats_cursor = jobs_collection.aggregate(pipeline)
        stats = await stats_cursor.to_list(length=None)
        
        # Get total count
        total_jobs = await jobs_collection.count_documents({})
        
        # Format response
        status_counts = {stat["_id"]: stat["count"] for stat in stats}
        
        return {
            "total_jobs": total_jobs,
            "status_breakdown": status_counts,
            "platforms": await get_platform_stats()
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def get_platform_stats():
    """Helper function to get platform statistics"""
    pipeline = [
        {
            "$group": {
                "_id": "$platform",
                "count": {"$sum": 1}
            }
        }
    ]
    
    cursor = jobs_collection.aggregate(pipeline)
    platform_stats = await cursor.to_list(length=None)
    
    return {stat["_id"]: stat["count"] for stat in platform_stats}

@app.get("/api/jobs/search/{query}")
async def search_jobs(query: str, limit: int = 20):
    """Search jobs by title or company"""
    try:
        search_filter = {
            "$or": [
                {"title": {"$regex": query, "$options": "i"}},
                {"company": {"$regex": query, "$options": "i"}}
            ]
        }
        
        cursor = jobs_collection.find(search_filter).sort("date_saved", -1).limit(limit)
        jobs = await cursor.to_list(length=limit)
        
        return [job_helper(job) for job in jobs]
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@app.get("/health")
async def health_check():
    try:
        # Test database connection
        await database.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )