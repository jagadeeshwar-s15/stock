You are an expert machine-learning engineer and data scientist specializing in financial time-series modeling, reproducible research, and production-quality Python projects.

I need you to BUILD THE COMPLETE PROJECT described below, not merely explain it or give me a plan.

You are working as my implementation engineer. Inspect the current workspace first, then create or modify the project files as necessary. Implement the project completely, execute and validate the code, fix errors, and leave the workspace in a clean, submission-ready state.

IMPORTANT:
- Do not stop after creating a plan.
- Do not give me pseudo-code.
- Do not leave TODOs or placeholder sections.
- Do not fabricate any results, metrics, dates, or conclusions.
- Actually run the code/notebook and use the real generated results.
- If a dependency or tool is unavailable, find a reasonable implementation using maintained packages or standard Python libraries.
- Prefer simple, rigorous, explainable methodology over unnecessary complexity.
- The final project must look like a serious university/ML-club project rather than an AI-generated demo.
- Every important methodological decision must be documented clearly.
- Never introduce temporal data leakage.

============================================================
PROJECT
============================================================

Project title:

STOCK PRICE MOVEMENT PREDICTOR

Track:
Time-Series Machine Learning

Core stack:
Python, pandas, scikit-learn, matplotlib

Primary objective:
Predict the NEXT TRADING DAY direction of a liquid equity or index as a binary classification problem:

1 = UP
0 = DOWN

The project must demonstrate:
1. Leak-free temporal feature engineering.
2. Leak-free next-day target construction.
3. Rigorous naive baselines.
4. Forward/chronological time-series evaluation.
5. Comparison between raw OHLCV features and engineered technical features.
6. Class-balance analysis.
7. Honest classification evaluation.
8. Actual-vs-predicted directional visualization.
9. Reproducible code and documentation suitable for a public GitHub repository.

============================================================
ASSIGNMENT REQUIREMENTS
============================================================

The club's assignment explicitly requires:

"Predict next-day direction (Up or Down binary classification) using daily historical OHLCV data for any liquid equity or index."

"Calculate at least 3 technical indicators directly in pandas or via the ta library."

"Focus on directional accuracy, class imbalance, and leak-free target construction."

"Leak-Free Target Construction:
Formulate next-day directional labels.
Print feature rows alongside target labels in the notebook to explicitly verify zero forward leakage."

"Dual Baselines:
Compare against both Persistence (tomorrow matches today) and Majority Class (always predict the dominant class)."

"Feature Sets:
Train a model using raw price/volume, then retrain with engineered technical indicators."

"Time-Based Split:
Train strictly on earlier time ranges; test on later ranges.
Fit scalers on training partitions only."

"Visualization:
Plot predicted vs. actual directional movement across the test window."

Required deliverables:
- Jupyter Notebook
- Four-way comparison table:
  Persistence vs Majority vs Raw vs Engineered
- Class balance report
- Prediction plot
- README.md

Overall submission rules:
- Avoid temporal data leakage.
- Verify generalization under real-world time constraints.
- Submit a public GitHub repository containing reproducible code and documentation.

You MUST satisfy every one of these requirements.

============================================================
DATASET
============================================================

Use a liquid Indian market index unless there is a strong technical reason not to.

Preferred dataset:
NIFTY 50 index
Yahoo Finance ticker:
^NSEI

Use DAILY historical OHLCV data.

Use a sufficiently long historical range to make the experiment meaningful. Prefer approximately 2015 through the latest complete historical period available at implementation time.

For reproducibility:
- Record the exact start date and end date used.
- Record the data source.
- Record the retrieval date/time if appropriate.
- Do not silently use a continuously changing date range without documenting it.
- Do not invent or manually type fake data.

Preferred approach:
Use a maintained data-access mechanism such as yfinance only for DATA ACQUISITION if necessary. The core modeling stack must remain centered on pandas, scikit-learn, and matplotlib.

Do NOT use:
- pandas-ta
- pandas_ta
- any unmaintained technical-analysis package

Technical indicators must be implemented directly using pandas whenever practical.

If using an external data-access package, include it explicitly in requirements.txt and explain its purpose.

Do not commit secrets or API keys.

============================================================
DATA INGESTION AND CLEANING
============================================================

Build a robust data-loading pipeline.

Required steps:
1. Download/load daily OHLCV data.
2. Convert the date column/index to a proper datetime representation.
3. Sort strictly by date ascending.
4. Remove duplicate dates if present, documenting this.
5. Inspect missing values.
6. Handle missing values appropriately.
7. Verify chronological ordering.
8. Verify that Open, High, Low, Close, and Volume are numeric.
9. Print:
   - dataset shape
   - date range
   - column names
   - first rows
   - last rows
   - missing-value summary
10. Perform basic sanity checks on OHLCV relationships where reasonable.

Do not perform arbitrary transformations that could distort the financial data.

Keep the raw downloaded dataset separate from processed features.

============================================================
TARGET CONSTRUCTION — CRITICAL
============================================================

The target is NEXT-DAY direction.

Use a clear definition such as:

Target_t = 1 if Close_(t+1) > Close_t
Target_t = 0 otherwise

Implement this with a forward target construction such as:

df["Target"] = (df["Close"].shift(-1) > df["Close"]).astype(int)

BUT understand the following distinction:

Using tomorrow's price to create the LABEL is correct.

Using tomorrow's price to create any INPUT FEATURE is forbidden.

The final observation, which has no next-day target, must not be used for supervised training/testing.

Document this carefully.

============================================================
LEAKAGE PREVENTION — ABSOLUTELY CRITICAL
============================================================

Treat temporal leakage prevention as one of the central goals of the project.

For every feature at date t:
- Only information available at or before date t may be used.
- No feature may use Close_(t+1), Volume_(t+1), High_(t+1), Low_(t+1), etc.
- Do not use negative shifts for feature creation.
- Do not calculate future returns and accidentally include them as features.
- Do not center rolling windows.
- Do not use future-filled values.
- Do not fit preprocessing on the complete dataset.
- Do not allow test-period information to influence training.
- Do not perform random train_test_split.
- Do not tune hyperparameters using the final test set.

Technical indicators such as rolling means, RSI, MACD, volatility, etc. must be computed using current and historical data only.

For example:

SMA_t = mean(Close_t, Close_(t-1), ...)

This is valid.

Anything incorporating Close_(t+1) is invalid.

============================================================
EXPLICIT LEAKAGE VERIFICATION IN NOTEBOOK
============================================================

The assignment explicitly requires:

"Print feature rows alongside target labels in the notebook to explicitly verify zero forward leakage."

Therefore, create a dedicated notebook section called something like:

LEAKAGE VERIFICATION

Display a representative table with:

Date
Open
High
Low
Close
Volume
technical indicators
Target

Clearly explain:
- features are known by date t
- target is determined from date t+1
- target is not included among model features
- no feature contains future observations

Also implement programmatic checks/assertions wherever practical.

For example:
- verify dates are sorted
- verify no duplicate dates
- verify feature columns do not include target
- verify train dates are strictly before test dates
- verify no feature-generation logic uses future shifts
- verify there are no NaNs after final feature preparation

Do not merely write a sentence claiming there is no leakage. Demonstrate it.

============================================================
TECHNICAL INDICATORS
============================================================

The assignment requires at least 3 technical indicators.

Use at least FIVE meaningful engineered indicators/features if practical, while keeping the feature set understandable.

Prefer implementing them directly with pandas.

Recommended indicators:

1. SMA 10 or SMA 20
2. EMA 20
3. RSI 14
4. MACD
5. Rolling volatility

You may also include:
- MACD signal
- MACD histogram
- Bollinger Band width
- short-term return
- volume percentage change
- momentum

Be careful to distinguish technical indicators from ordinary derived features.

At least three must clearly qualify as technical indicators.

Recommended engineered feature set:

Raw:
Open
High
Low
Close
Volume

Engineered additions:
SMA_20
EMA_20
RSI_14
MACD
MACD_Signal
MACD_Hist
Rolling_Volatility_20
Return_5D
Volume_Change

Do not blindly add dozens of indicators.

The goal is a clean and interpretable engineered feature set.

============================================================
FEATURE SETS
============================================================

There must be TWO main ML experiments using the SAME primary classification algorithm so the comparison is fair.

FEATURE SET A — RAW

Use only:
Open
High
Low
Close
Volume

Train the classifier using these raw OHLCV features.

FEATURE SET B — ENGINEERED

Use:
Raw OHLCV
+
Technical indicators / engineered temporal features

Train the SAME classifier again.

The four-way final comparison MUST contain:

1. Persistence
2. Majority Class
3. Raw OHLCV Model
4. Engineered Feature Model

The main question to answer:

"Do the engineered features actually improve next-day directional classification compared with raw OHLCV features and naive baselines?"

============================================================
PRIMARY ML MODEL
============================================================

Use a strong but explainable primary binary classifier.

Preferred:
Logistic Regression from scikit-learn.

Reason:
- appropriate for binary classification
- interpretable
- fast
- reproducible
- works well as a strong baseline for a structured experiment

Use StandardScaler where appropriate.

CRITICAL:
The scaler must be fitted ONLY on training data.

Prefer scikit-learn Pipeline so preprocessing cannot accidentally leak:

Pipeline([
    ("scaler", StandardScaler()),
    ("model", LogisticRegression(...))
])

Do NOT do:

scaler.fit(all_data)

Instead ensure the scaler is fitted within the training process only.

============================================================
OPTIONAL MODEL SELECTION / FORWARD VALIDATION
============================================================

To make the project more rigorous, use forward/chronological validation INSIDE THE TRAINING DATA if hyperparameter tuning is needed.

A good approach:

- Reserve the final chronological test window as a completely untouched holdout.
- Use TimeSeriesSplit on the training portion for model selection.
- Fit the scaler separately inside each training fold through a Pipeline.
- Tune a small number of meaningful Logistic Regression hyperparameters such as C.
- Select the best configuration using ONLY the training/validation process.
- After selection, refit on the complete training period.
- Evaluate ONCE on the untouched future test set.

Never use final-test performance for hyperparameter selection.

Keep the hyperparameter grid small and sensible.

Do not turn this into an over-engineered project.

============================================================
TIME-SERIES SPLIT — CRITICAL
============================================================

Do NOT use random splitting.

The final evaluation MUST be chronological.

For example:

OLD DATA ------------------------------------> NEW DATA

TRAIN ------------------------------ | TEST
                                     ↑
                              future holdout

Use a sensible chronological split, such as approximately:
80% training
20% final testing

OR another clearly justified chronological split.

The exact dates must be printed in the notebook.

For example:

Training:
2015-XX-XX → 2024-XX-XX

Testing:
2024-XX-XX → 2026-XX-XX

Use the actual dates resulting from the dataset.

The key invariant is:

max(train_date) < min(test_date)

Assert this programmatically.

============================================================
BASELINE 1 — PERSISTENCE
============================================================

Implement the required Persistence baseline correctly.

Definition:

"Tomorrow matches today."

Today's direction should be determined from information available by today.

A suitable formulation is:

Today's direction =
1 if Close_t > Close_(t-1)
0 otherwise

Persistence predicts tomorrow's direction as today's direction.

Be careful with alignment.

The Persistence baseline must:
- use only information available at prediction time
- never use tomorrow's actual movement
- be evaluated on the SAME final test window as the ML models
- use the same target definition

Document the formula clearly.

============================================================
BASELINE 2 — MAJORITY CLASS
============================================================

Implement the required Majority Class baseline.

Determine the dominant target class USING THE TRAINING DATA ONLY.

Example:
if training data contains:
Up = 53%
Down = 47%

then predict Up for every test observation.

IMPORTANT:
Do not determine the majority class using the full dataset or test set.

The Majority baseline must be evaluated on the same final test window.

Document:
- training class counts
- training class percentages
- which class is dominant
- what the baseline predicts

============================================================
CLASS BALANCE REPORT
============================================================

Create a dedicated class-balance analysis.

Report:

For the overall usable dataset:
- Up count
- Down count
- Up percentage
- Down percentage

For training:
- Up count
- Down count
- percentages

For test:
- Up count
- Down count
- percentages

Include a simple visualization if useful.

Explain whether the target is:
- balanced
- mildly imbalanced
- meaningfully imbalanced

Do not assume the assignment's "~53%" example applies to this dataset.

Use actual numbers.

Explain why class balance matters when interpreting accuracy.

============================================================
EVALUATION METRICS
============================================================

For all four approaches:

1. Persistence
2. Majority Class
3. Raw OHLCV model
4. Engineered model

calculate comparable test-set metrics.

At minimum report:

- Accuracy
- Precision
- Recall
- F1-score

Also consider:
- Balanced Accuracy
- ROC-AUC where meaningful
- Confusion Matrix

The central metric should be directional accuracy / accuracy because this is a next-day directional prediction problem.

Do NOT evaluate using regression metrics such as RMSE or MAE because this is NOT an exact price prediction task.

Use consistent positive-class conventions and document them.

Generate a classification report for the ML models.

============================================================
FOUR-WAY COMPARISON TABLE
============================================================

Create the explicitly required four-way comparison table.

It should contain at least:

| Approach | Accuracy | Precision | Recall | F1 |

Rows:

Persistence
Majority Class
Raw OHLCV
Engineered Features

Optionally include:
Balanced Accuracy
ROC-AUC

But keep the required four rows prominent.

The table must use ACTUAL results from the executed experiment.

Export the final table to something like:

results/four_way_comparison.csv

and display it beautifully in the notebook.

============================================================
VISUALIZATION
============================================================

The assignment explicitly requires:

"Plot predicted vs. actual directional movement across the test window."

Create a clean, professional matplotlib visualization.

Requirements:
- chronological x-axis
- actual direction
- predicted direction
- entire final test window
- readable date labels
- clear legend
- axis labels
- title
- y-axis should clearly communicate Up / Down
- do not randomly shuffle observations

A suitable encoding can be:
Down = 0
Up = 1

with labels/ticks making that obvious.

Create and save something like:

results/actual_vs_predicted_direction.png

The visualization must genuinely compare:
ACTUAL test direction
vs
PREDICTED test direction

Do not create an unrelated stock-price plot and call it the required prediction plot.

============================================================
OPTIONAL ADDITIONAL VISUALIZATIONS
============================================================

If useful, include:
- class distribution plot
- confusion matrices
- model coefficient/feature-effect plot for Logistic Regression
- feature distributions

But do not clutter the notebook.

The assignment's required visualization must remain obvious.

============================================================
HONEST ANALYSIS
============================================================

This is a financial time-series task.

Do NOT exaggerate performance.

The final notebook must explicitly answer:

1. Did the raw model beat Persistence?
2. Did the raw model beat Majority Class?
3. Did the engineered model beat the raw model?
4. Did the engineered model beat both naive baselines?
5. By how much?
6. Is the improvement practically meaningful or only marginal?
7. How does class imbalance affect interpretation?
8. Are there signs that the model is close to naive performance?
9. What limitations remain?

IMPORTANT:
If the model performs poorly, SAY SO.

For example, an outcome such as:
Majority = 53%
Raw = 52%
Engineered = 54%

must NOT be described as "highly accurate."

The conclusion should reflect the actual evidence.

Avoid claims such as:
- "This model can reliably predict the stock market."
- "The model is profitable."
- "The model guarantees investment success."

Unless actual trading strategy/profitability has been specifically implemented and rigorously evaluated, do not make financial-performance claims.

============================================================
FINANCIAL / REAL-WORLD LIMITATIONS
============================================================

Include an explicit limitations section.

Discuss relevant limitations such as:
- financial markets are noisy and non-stationary
- next-day direction is difficult to predict
- historical relationships can change
- technical indicators do not guarantee predictive power
- one index does not establish universal market generalization
- classification accuracy does not equal trading profitability
- transaction costs/slippage are not modeled
- regime changes can affect performance
- data-source revisions or availability may affect reproducibility

Keep this grounded and professional.

============================================================
NOTEBOOK STRUCTURE
============================================================

Create a polished Jupyter notebook.

Suggested structure:

1. Title
2. Executive Summary
3. Problem Statement
4. Objective
5. Dataset and Data Source
6. Imports and Reproducibility Setup
7. Data Loading
8. Initial Data Inspection
9. Data Cleaning
10. Target Construction
11. Explicit Leakage Verification
12. Class Balance Analysis
13. Feature Engineering
14. Chronological Train/Test Split
15. Persistence Baseline
16. Majority Class Baseline
17. Raw OHLCV Model
18. Engineered Feature Model
19. Time-Series Validation / Hyperparameter Selection
20. Final Test Evaluation
21. Four-Way Comparison Table
22. Classification Reports
23. Confusion Matrices
24. Actual vs Predicted Direction Plot
25. Interpretation of Results
26. Limitations
27. Final Conclusion

Use Markdown cells to explain what is happening.

Do not make it a wall of code.

Each major stage should have:
- a concise explanation
- code
- resulting output
- interpretation where useful

============================================================
NOTEBOOK QUALITY
============================================================

The notebook should look like a professional ML case study.

Use:
- clear Markdown headings
- concise explanations
- meaningful variable names
- comments only where useful
- reproducible random_state where applicable
- no unnecessary print spam
- readable DataFrames
- formatted percentages
- professional plots

Do not include:
- meaningless generated text
- giant dumps of data
- unnecessary model complexity
- dozens of irrelevant indicators
- copied tutorial material
- fake screenshots
- fake metrics

============================================================
REPOSITORY STRUCTURE
============================================================

Create a professional GitHub-ready structure.

Recommended:

stock-price-movement-predictor/
│
├── notebooks/
│   └── stock_price_movement_predictor.ipynb
│
├── src/
│   ├── data_loader.py
│   ├── features.py
│   ├── baselines.py
│   ├── models.py
│   └── evaluation.py
│
├── data/
│   └── README.md
│
├── results/
│   ├── four_way_comparison.csv
│   ├── class_balance.csv
│   ├── actual_vs_predicted_direction.png
│   └── other relevant figures
│
├── README.md
├── requirements.txt
├── .gitignore
└── LICENSE

You may simplify this structure if there is a strong reason, but maintain professional organization.

The notebook must remain the central deliverable.

Avoid unnecessary abstractions. The source modules should improve reproducibility rather than hide the analysis.

============================================================
CODE QUALITY
============================================================

Use:
- Python 3.x
- PEP 8 style
- clear function boundaries
- type hints where practical
- docstrings for important functions
- meaningful names
- deterministic random_state where applicable

Potential functions:

load_data()
clean_data()
create_target()
create_raw_features()
create_technical_features()
create_persistence_predictions()
create_majority_predictions()
build_model()
evaluate_classifier()
create_comparison_table()

You do not need to force these exact names.

============================================================
REPRODUCIBILITY
============================================================

The repository must be reproducible.

Create requirements.txt containing all required dependencies.

At minimum, include appropriate versions/ranges for:
- pandas
- numpy
- scikit-learn
- matplotlib
- jupyter / notebook as needed
- data acquisition dependency if used

Do not include unnecessary packages.

Include exact instructions in README.md for:

1. Cloning the repository
2. Creating a virtual environment
3. Installing dependencies
4. Downloading/loading the data
5. Running the notebook

Make sure the notebook can be executed from a clean environment.

If the data is downloaded dynamically:
- document the source
- document the ticker
- document the period
- document any assumptions

Do not commit huge generated caches.

============================================================
GITIGNORE
============================================================

Create a sensible .gitignore.

Ignore:
- virtual environments
- Python caches
- notebook checkpoints
- OS-specific junk
- temporary files
- secrets
- unnecessary downloaded caches

Do NOT blindly ignore the required result files.

============================================================
README.MD
============================================================

Create a polished README.md.

Suggested structure:

# Stock Price Movement Predictor

## Overview

## Objective

## Dataset

## Problem Formulation

## Target Definition

## Leakage Prevention

## Feature Engineering

## Baselines

## Modeling Approach

## Time-Based Evaluation

## Results

## Four-Way Comparison

## Class Balance

## Visualization

## Key Findings

## Limitations

## Project Structure

## Installation

## How to Run

## Reproducibility

## License

The README should explain the project in a way that a club evaluator can understand without opening every source file.

Do not invent results in README.

Use the ACTUAL generated metrics.

============================================================
RESULTS CONSISTENCY
============================================================

Ensure that:

- The numbers in the notebook match the exported CSV.
- The README results match the final executed experiment.
- The plotted predictions correspond to the exact final test set.
- The model described in README is the actual model used.
- The dataset dates in README match the actual dataset.
- The feature list matches the actual implementation.
- The baseline definitions match the implementation.

No contradictory information.

============================================================
TESTING / VALIDATION CHECKLIST
============================================================

Before declaring the project complete, run a systematic audit.

CHECK 1:
Dataset sorted chronologically.

CHECK 2:
No duplicate dates.

CHECK 3:
Target correctly represents next-day movement.

CHECK 4:
Last row with no future target is excluded.

CHECK 5:
All technical indicators use only current/past observations.

CHECK 6:
No feature directly or indirectly contains future target information.

CHECK 7:
Train period occurs entirely before test period.

CHECK 8:
No random train/test split is used.

CHECK 9:
Scaler is fitted only on training partitions.

CHECK 10:
Hyperparameter tuning, if used, does not access final test data.

CHECK 11:
Majority class is determined from training data only.

CHECK 12:
Persistence uses only information available by prediction time.

CHECK 13:
All four approaches are evaluated on the same final test window.

CHECK 14:
Comparison table is generated from actual results.

CHECK 15:
Prediction plot uses actual test predictions.

CHECK 16:
Notebook executes without errors from top to bottom.

CHECK 17:
README instructions are valid.

CHECK 18:
requirements.txt contains all required packages.

CHECK 19:
No API keys/secrets are present.

CHECK 20:
No fabricated data or results.

============================================================
IMPORTANT LEAKAGE AUDIT
============================================================

Perform a final manual review of the entire feature-engineering implementation.

Look specifically for:
- shift(-1)
- shift(-n)
- centered rolling windows
- future returns
- future labels accidentally included as features
- fitting transformations before splitting
- normalization of entire data
- imputation using full dataset statistics
- random shuffling
- test-set hyperparameter tuning

If any are found, fix them.

Do not merely say the project is leakage-free. Verify it.

============================================================
MODEL INTERPRETATION
============================================================

For Logistic Regression, optionally report model coefficients for the engineered features.

If included:
- clearly label them as model coefficients
- explain that positive/negative coefficients indicate direction of model association under the fitted feature scaling
- do not claim causal relationships

This is optional and should only be added if it improves the project.

============================================================
NO UNNECESSARY COMPLEXITY
============================================================

Do NOT turn this into:
- an LSTM project
- a Transformer project
- reinforcement learning
- a trading bot
- a portfolio optimizer
- a massive hyperparameter search

The assignment is specifically about:

TIME-SERIES CLASSIFICATION + LEAKAGE CONTROL + BASELINES + FEATURE ENGINEERING + FORWARD EVALUATION.

Keep the main project focused on those requirements.

A sophisticated but methodologically flawed project is worse than a simple rigorous one.

============================================================
OPTIONAL SECOND MODEL
============================================================

You may add a second classifier such as Random Forest ONLY if:
- the core assignment is already fully satisfied
- it does not make the four-way comparison confusing
- it improves the educational value

Do NOT let a second model replace the required Raw vs Engineered comparison.

The primary comparison must remain:

Persistence
vs
Majority
vs
Raw OHLCV
vs
Engineered Features

============================================================
FINAL CONCLUSION
============================================================

The notebook must finish with a concise but evidence-based conclusion answering:

1. What dataset was used?
2. What target was predicted?
3. How was leakage prevented?
4. What were the two naive baseline performances?
5. What was the raw-feature ML performance?
6. What was the engineered-feature ML performance?
7. Did technical indicators improve performance?
8. Was the improvement meaningful?
9. What does the result say about next-day directional predictability?
10. What are the major limitations?

Use actual results.

============================================================
GITHUB READINESS
============================================================

Prepare the repository for public GitHub submission.

Ensure:
- no secrets
- no absolute local paths
- no personal computer-specific paths
- no broken links
- no unnecessary generated files
- clear README
- requirements.txt
- reproducible notebook
- result artifacts
- sensible project structure

I

============================================================
EXECUTION REQUIREMENT
============================================================

After implementation:

1. Install dependencies if needed.
2. Run the data pipeline.
3. Run the notebook from top to bottom.
4. Confirm there are no execution errors.
5. Confirm actual metrics are generated.
6. Confirm result files exist.
7. Confirm plots open/load successfully.
8. Inspect the notebook outputs.
9. Fix any bugs.
10. Re-run after fixes.
11. Perform the leakage audit again.
12. Check git status.
13. Give me a final implementation report.

============================================================
FINAL RESPONSE TO ME
============================================================

After you finish the implementation, report:

1. What files you created/modified.
2. Dataset used.
3. Exact date range.
4. Number of usable observations.
5. Target definition.
6. Technical indicators implemented.
7. Primary model.
8. Train/test split dates.
9. Baselines used.
10. Actual four-way comparison results.
11. Whether engineered features improved performance.
12. Confirmation that the notebook executed successfully.
13. Confirmation of the leakage checks performed.
14. How to run the project locally.
15. Any remaining limitation or manual GitHub step.

Do not just say "done."

Give me a concise but complete engineering summary based on the REAL executed project.

============================================================
MOST IMPORTANT PRIORITIES
============================================================

Priority order:

1. ZERO TEMPORAL DATA LEAKAGE
2. CORRECT NEXT-DAY TARGET
3. CHRONOLOGICAL TRAIN/TEST EVALUATION
4. TRAINING-ONLY PREPROCESSING
5. CORRECT PERSISTENCE BASELINE
6. CORRECT MAJORITY-CLASS BASELINE
7. RAW VS ENGINEERED COMPARISON
8. AT LEAST 3 TECHNICAL INDICATORS
9. CLASS BALANCE ANALYSIS
10. ACTUAL VS PREDICTED TEST-WINDOW PLOT
11. REPRODUCIBLE NOTEBOOK
12. PROFESSIONAL README
13. PUBLIC-GITHUB READINESS

Do not sacrifice methodological correctness for higher-looking accuracy.

Do not fabricate or manipulate results.

Build the project completely and professionally.








Yes — **the dataset shown in your screenshot can technically be used by the application**, but there is an important distinction:

### If you mean `synthetic_ohlcv.csv`

It can power the application **if it contains**:

```text
Date
Open
High
Low
Close
Volume
```

and enough chronological observations.

However, for **your specific assignment**, I would **not use the synthetic dataset as the final submission dataset**.

Your assignment explicitly prefers:

> **NIFTY 50 (^NSEI) daily historical OHLCV data**

and asks you to document the actual data source and period. 

### Best approach

Use two datasets for two different purposes:

| Dataset                          | Purpose                  | Recommendation                     |
| -------------------------------- | ------------------------ | ---------------------------------- |
| `synthetic_ohlcv.csv`            | UI development / testing | ✅ Yes                              |
| Real NIFTY 50 `^NSEI`            | Final ML experiment      | ⭐ **Yes**                          |
| Synthetic data for final results | Assignment submission    | ⚠️ Only if real data is impossible |

The application architecture can therefore be:

```text
                    DATA SOURCE
                         │
              ┌──────────┴──────────┐
              │                     │
       synthetic_ohlcv.csv      NIFTY 50
          DEVELOPMENT             FINAL
              │                     │
              └──────────┬──────────┘
                         ↓
                 DATA VALIDATION
                         ↓
                 TARGET CREATION
                         ↓
              LEAK-FREE FEATURES
                         ↓
              ┌──────────┴──────────┐
              ↓                     ↓
          RAW OHLCV             ENGINEERED
              │                     │
              └──────────┬──────────┘
                         ↓
                 LOGISTIC REGRESSION
                         ↓
             ┌───────────┼───────────┐
             ↓           ↓           ↓
        Persistence  Majority     ML Models
             │           │           │
             └───────────┴───────────┘
                         ↓
                  FINAL RESULTS
                         ↓
                  DASHBOARD UI
```

### And importantly

The UI I designed for you **doesn't need to change** when switching from synthetic → real data.

The cards can dynamically display:

```text
Dataset
NIFTY 50 (^NSEI)

Source
Yahoo Finance

Period
2015-01-01 → [actual end date]

Records
[actual number]

Features
14

Train/Test
80 / 20
```

And the four-way comparison:

```text
Persistence          XX.X%
Majority Class       XX.X%
Raw OHLCV             XX.X%
Engineered            XX.X%
```

will be populated from the **actual execution results**.

### One thing I would NOT do

Don't use synthetic data and then present it in the UI as:

> **NIFTY 50 — Yahoo Finance**

That would undermine the project's credibility and violate the requirement against fabricated results. The specification explicitly says not to fabricate data/results and requires the actual dataset dates/source to be documented. 

**So my recommendation is:**

**Use the synthetic CSV now to build and test the entire UI → obtain real `^NSEI` data → run the complete pipeline on real data → populate the final desktop/mobile UI with those actual results.**

If you upload the actual **`synthetic_ohlcv.csv`**, I can also check its columns, date range, row count, missing values, and whether it is structurally compatible with this application before you proceed.

