"""
main.py — A-BOB Entry Point
Run: uvicorn main:app --reload --port 8000
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routes.routes import router
from models.store import seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("=" * 55)
    print("  A-BOB  |  Autonomous Business Operations Brain")
    print("=" * 55)
    seed_demo_data()
    print("[A-BOB] API ready at http://localhost:8000")
    print("[A-BOB] Docs    at http://localhost:8000/docs")
    print("=" * 55)
    yield
    print("[A-BOB] Shutting down. Goodbye.")


app = FastAPI(
    title="A-BOB — Autonomous Business Operations Brain",
    description="Multi-agent system for autonomous enterprise workflows.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"name": "A-BOB", "version": "2.0.0", "status": "online", "docs": "/docs"}

@app.get("/ping")
def ping():
    return {"ping": "pong"}
