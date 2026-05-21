import datetime
import pandas as pd
from prophet import Prophet

def predict_setback(checkin_history: list) -> dict:
    if not checkin_history or len(checkin_history) < 3:
        # Not enough data for prediction
        return {
            "setback_probability": 0.0,
            "max_predicted_pain": 0.0,
            "forecast_dates": [
                (datetime.datetime.now() + datetime.timedelta(days=i)).strftime('%Y-%m-%d')
                for i in range(1, 8)
            ]
        }

    df = pd.DataFrame(checkin_history, columns=['ds', 'y'])  # ds=date, y=pain_score
    df['ds'] = pd.to_datetime(df['ds'])
    
    model = Prophet(
        changepoint_prior_scale=0.05,  # conservative — medical data is smooth
        seasonality_mode='additive',
        daily_seasonality=False,
        weekly_seasonality=True,
        yearly_seasonality=False
    )
    model.fit(df)
    
    future = model.make_future_dataframe(periods=7)
    forecast = model.predict(future)
    
    next_7_days = forecast.tail(7)
    max_predicted_pain = next_7_days['yhat'].max()
    setback_probability = min(max_predicted_pain / 10.0, 1.0)
    
    return {
        "setback_probability": round(setback_probability, 2),
        "max_predicted_pain": round(max_predicted_pain, 2),
        "forecast_dates": next_7_days['ds'].dt.strftime('%Y-%m-%d').tolist()
    }
