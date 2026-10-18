# Mindspace

Predicts **Mental_Health_Score** (regression; 3.6–9.4 in the training data) from 12 inputs using your tuned XGBoost pipeline. `Stress_Level` is an input feature, not the target (verified in the notebook: `X` is every column except `Mental_Health_Score`).

Plain HTML/CSS/JS frontend served by FastAPI from the same origin. No build step.

```
main.py                  FastAPI: /predict, /health, /docs, serves the site
xgb_tuned_model.joblib   your saved pipeline (keep in the repo root)
static/index.html        page
static/style.css         styles
static/script.js         form wizard, API call, charts
requirements.txt  render.yaml  .gitignore  .env.example
```

## Run locally
```bash
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
Open http://localhost:8000 (API docs at /docs).

## Push to GitHub
```bash
git init && git add . && git commit -m "Mindspace"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```
The model is about 2 MB, so Git LFS isn't needed.

## Deploy on Render
1. Render dashboard → **New → Blueprint** → connect the GitHub repo → **Apply**. `render.yaml` configures everything.
   Manual alternative: New → Web Service, build command `pip install -r requirements.txt`, start command `uvicorn main:app --host 0.0.0.0 --port $PORT`, health check path `/health`.
2. No environment variables are required. `PYTHON_VERSION` is set in `render.yaml`, and Render supplies `PORT`.

## Test the live site
```bash
curl https://<app>.onrender.com/health
curl -X POST https://<app>.onrender.com/predict -H 'Content-Type: application/json' -d '{"Age":21,"Gender":"Male","Country":"Other","Academic_Level":"Undergraduate","Most_Used_Platform":"Facebook","Purpose_Of_Use":"Networking","Avg_Daily_Usage_Hours":4.0,"Daily_Unlocks":134,"Study_Hours":4.5,"Physical_Activity_Hours":2.2,"Sleep_Hours_Per_Night":6.7,"Stress_Level":"Medium"}'
```
Expected: `{"prediction":6.77...,"target":"Mental_Health_Score",...}` (the dataset's actual value for that row is 6.8). Then open the site and complete the form. The free plan sleeps when idle, so the first request can take about a minute.

## Notes
- The model was saved with scikit-learn 1.8.0. `requirements.txt` pins that plus xgboost 3.4.1, which load it and give sensible predictions. If you retrain with other versions, update the pins.
- Inputs are limited to the min/max seen in training. Countries outside the 10 most common in the data are "Other", as in your notebook.
