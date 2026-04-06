"""
Train a yield failure prediction model using the SECOM dataset.

This script:
1. Loads SECOM data and labels
2. Preprocesses features (imputation, variance filtering)
3. Handles class imbalance with SMOTE
4. Trains a calibrated GradientBoostingClassifier
5. Evaluates performance (ROC-AUC, PR-AUC)
6. Saves the model, selected features, and metrics
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import VarianceThreshold
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score, average_precision_score, roc_curve, precision_recall_curve
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline
import joblib
import json
from pathlib import Path

# Configuration
RANDOM_STATE = 42
TEST_SIZE = 0.2
VARIANCE_THRESHOLD = 0.01

def load_secom_data():
    """Load SECOM dataset from space-separated files."""
    print("Loading SECOM dataset...")
    
    # Load features (590 columns, space-separated, contains NaN)
    X = pd.read_csv('secom.data', sep=r'\s+', header=None)
    
    # Load labels (-1 = pass, 1 = fail)
    y = pd.read_csv('secom_labels.data', sep=r'\s+', header=None, usecols=[0])
    y = y.iloc[:, 0]
    
    # Convert labels: -1 -> 0 (pass), 1 -> 1 (fail)
    y = (y == 1).astype(int)
    
    print(f"Dataset shape: {X.shape}")
    print(f"Labels shape: {y.shape}")
    print(f"Failure rate: {y.mean():.2%}")
    print(f"Missing values: {X.isnull().sum().sum()} ({X.isnull().sum().sum() / X.size:.2%})")
    
    return X, y

def create_preprocessing_pipeline():
    """Create preprocessing pipeline with imputation and variance filtering."""
    from sklearn.impute import SimpleImputer
    return SimpleImputer(strategy='median')

def train_model(X, y):
    """Train the yield prediction model with SMOTE and calibration."""
    print("\nSplitting data...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    
    print(f"Training set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples")
    print(f"Training failure rate: {y_train.mean():.2%}")
    
    # Step 1: Impute missing values
    print("\nImputing missing values...")
    imputer = create_preprocessing_pipeline()
    X_train_imputed = imputer.fit_transform(X_train.values)
    X_test_imputed = imputer.transform(X_test.values)
    
    # Step 2: Remove low-variance features
    print("Removing low-variance features...")
    var_selector = VarianceThreshold(threshold=VARIANCE_THRESHOLD)
    X_train_selected = var_selector.fit_transform(X_train_imputed)
    X_test_selected = var_selector.transform(X_test_imputed)
    
    selected_features = np.where(var_selector.get_support())[0].tolist()
    print(f"Features after variance filtering: {len(selected_features)} (removed {X.shape[1] - len(selected_features)})")
    
    # Step 3: Scale features
    print("Scaling features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_selected)
    X_test_scaled = scaler.transform(X_test_selected)
    
    # Step 4: Handle class imbalance with SMOTE
    print("\nApplying SMOTE for class balancing...")
    smote = SMOTE(random_state=RANDOM_STATE)
    X_train_resampled, y_train_resampled = smote.fit_resample(X_train_scaled, y_train)
    print(f"After SMOTE: {X_train_resampled.shape[0]} samples")
    print(f"Resampled failure rate: {y_train_resampled.mean():.2%}")
    
    # Step 5: Train GradientBoostingClassifier
    print("\nTraining GradientBoostingClassifier...")
    base_model = GradientBoostingClassifier(
        n_estimators=100,
        learning_rate=0.1,
        max_depth=5,
        min_samples_split=20,
        min_samples_leaf=10,
        subsample=0.8,
        random_state=RANDOM_STATE,
        verbose=1
    )
    base_model.fit(X_train_resampled, y_train_resampled)
    
    # Step 6: Calibrate probabilities with Platt scaling
    print("\nCalibrating model with Platt scaling...")
    calibrated_model = CalibratedClassifierCV(base_model, method='sigmoid', cv='prefit')
    calibrated_model.fit(X_train_scaled, y_train)
    
    # Step 7: Evaluate on test set
    print("\n" + "="*60)
    print("MODEL EVALUATION")
    print("="*60)
    
    y_pred_proba = calibrated_model.predict_proba(X_test_scaled)[:, 1]
    y_pred = (y_pred_proba >= 0.5).astype(int)
    
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    pr_auc = average_precision_score(y_test, y_pred_proba)
    
    print(f"ROC-AUC Score: {roc_auc:.4f}")
    print(f"PR-AUC Score: {pr_auc:.4f}")
    
    # Calculate ROC curve
    fpr, tpr, _ = roc_curve(y_test, y_pred_proba)
    
    # Calculate PR curve
    precision, recall, _ = precision_recall_curve(y_test, y_pred_proba)
    
    # Create full pipeline for deployment
    pipeline = {
        'imputer': imputer,
        'var_selector': var_selector,
        'scaler': scaler,
        'model': calibrated_model,
        'feature_importances': base_model.feature_importances_
    }
    
    metrics = {
        'roc_auc': float(roc_auc),
        'pr_auc': float(pr_auc),
        'roc_curve': {
            'fpr': fpr.tolist(),
            'tpr': tpr.tolist()
        },
        'pr_curve': {
            'precision': precision.tolist(),
            'recall': recall.tolist()
        },
        'n_features': len(selected_features),
        'n_train_samples': int(X_train.shape[0]),
        'failure_rate': float(y_train.mean())
    }
    
    return pipeline, selected_features, metrics

def main():
    """Main training pipeline."""
    print("="*60)
    print("SECOM Yield Failure Prediction Model Training")
    print("="*60)
    
    # Load data
    X, y = load_secom_data()
    
    # Train model
    pipeline, selected_features, metrics = train_model(X, y)
    
    # Save model
    print("\nSaving model and artifacts...")
    joblib.dump(pipeline, 'yield_model.pkl')
    print("✓ Saved: yield_model.pkl")
    
    # Save selected features
    with open('selected_features.json', 'w') as f:
        json.dump(selected_features, f)
    print("✓ Saved: selected_features.json")
    
    # Save metrics
    with open('model_metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)
    print("✓ Saved: model_metrics.json")
    
    print("\n" + "="*60)
    print("TRAINING COMPLETE!")
    print("="*60)
    print(f"ROC-AUC: {metrics['roc_auc']:.4f}")
    print(f"PR-AUC: {metrics['pr_auc']:.4f}")
    print(f"Features used: {metrics['n_features']}")
    print(f"Training samples: {metrics['n_train_samples']}")
    print("\nNext steps:")
    print("1. Restart the FastAPI server")
    print("2. Test the /api/predict-sample endpoint")
    print("="*60)

if __name__ == "__main__":
    main()
