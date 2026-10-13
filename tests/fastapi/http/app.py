"""The probe app for drive.py: async and sync endpoints and dependencies, a
pydantic body and its 422s, errors, streaming, lifespan state, background
tasks, /openapi.json and /docs (docs/Support_FastAPI.md, Phase 5)."""
import contextlib, sys, time
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks, Request
from fastapi.responses import PlainTextResponse, StreamingResponse, JSONResponse
from pydantic import BaseModel

events = []

@contextlib.asynccontextmanager
async def lifespan(app):
    events.append("startup")
    yield {"started": True}
    events.append("shutdown")

app = FastAPI(lifespan=lifespan)

class Item(BaseModel):
    name: str
    price: float

async def get_db():
    return "DB"

def sync_dep():
    return "S"

@app.get("/")
async def root():
    return {"hello": "world"}

@app.get("/sync")
def sync_ep(d=Depends(sync_dep)):
    return {"sync": d}

@app.get("/dep")
async def dep(q: int = Query(3), db=Depends(get_db)):
    return {"q": q, "db": db}

@app.post("/items")
def make(item: Item):
    return {"name": item.name, "double": item.price * 2}

@app.get("/boom")
def boom():
    raise HTTPException(status_code=418, detail="teapot")

@app.get("/crash")
def crash():
    raise RuntimeError("oops")

@app.get("/text", response_class=PlainTextResponse)
def text():
    return "plain"

@app.get("/stream")
def stream():
    def gen():
        for i in range(3):
            yield f"chunk{i}\n"
    return StreamingResponse(gen(), media_type="text/plain")

@app.get("/state")
def state(request: Request):
    return {"started": request.state.started}

@app.get("/events")
def get_events():
    return events

@app.get("/bg")
def bg(tasks: BackgroundTasks):
    tasks.add_task(events.append, "bg")
    return {"queued": True}
