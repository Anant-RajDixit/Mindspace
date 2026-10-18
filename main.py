import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = Path(os.getenv("MODEL_PATH", BASE_DIR / "xgb_tuned_model.joblib"))
STATIC_DIR = BASE_DIR / "static"

# Verified from Untitled.ipynb: the target is Mental_Health_Score and the
# pipeline was fitted on these 12 columns (Stress_Level is an INPUT feature).
FEATURES = [
    "Age", "Gender", "Country", "Academic_Level", "Most_Used_Platform",
    "Purpose_Of_Use", "Avg_Daily_Usage_Hours", "Daily_Unlocks", "Study_Hours",
    "Physical_Activity_Hours", "Sleep_Hours_Per_Night", "Stress_Level",
]

state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    model = joblib.load(MODEL_PATH)
    if list(model.feature_names_in_) != FEATURES:
        raise RuntimeError(f"Model expects {list(model.feature_names_in_)}, API expects {FEATURES}")
    state["model"] = model
    yield
    state.clear()


app = FastAPI(
    title="Mindspace API",
    description="Predicts Mental_Health_Score with a tuned XGBoost regression pipeline.",
    version="1.0.0",
    lifespan=lifespan,
)


class PredictionInput(BaseModel):
    # Categories are exactly those the pipeline's encoders were fitted on.
    # Country: the notebook grouped everything outside the top 10 into "Other".
    # Numeric ranges are the min/max seen in the training data.
    Age: int = Field(ge=18, le=24)
    Gender: Literal["Female", "Male"]
    Country: Literal["Australia", "Canada", "France", "Germany", "India", "Mexico", "Other", "Turkey", "UK", "USA"]
    Academic_Level: Literal["High School", "Undergraduate", "Graduate"]
    Most_Used_Platform: Literal[
        "Facebook", "Instagram", "KakaoTalk", "LINE", "LinkedIn", "Snapchat",
        "TikTok", "Twitter", "VKontakte", "WeChat", "WhatsApp", "YouTube",
    ]
    Purpose_Of_Use: Literal["Education", "Entertainment", "Networking", "News"]
    Avg_Daily_Usage_Hours: float = Field(ge=1.0, le=8.8)
    Daily_Unlocks: int = Field(ge=62, le=273)
    Study_Hours: float = Field(ge=0.3, le=8.3)
    Physical_Activity_Hours: float = Field(ge=0.0, le=4.1)
    Sleep_Hours_Per_Night: float = Field(ge=3.6, le=9.9)
    Stress_Level: Literal["Low", "Medium", "High", "Very High"]


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/predict")
def predict(data: PredictionInput):
    df = pd.DataFrame([data.model_dump()])[FEATURES]
    try:
        value = float(state["model"].predict(df)[0])
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {exc}")
    return {
        "prediction": value,
        "target": "Mental_Health_Score",
        "model": "Tuned XGBoost Regressor",
    }


# ---- Frontend (plain HTML/CSS/JS, same origin, no build step) ----
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(STATIC_DIR / "index.html")
