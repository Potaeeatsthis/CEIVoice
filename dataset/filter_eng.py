import pandas as pd
from langdetect import detect
from langdetect.lang_detect_exception import LangDetectException

INPUT_FILES = [
    "./dataset/dataset-tickets-multi-lang3-4k.csv",
    "./dataset/dataset-tickets-multi-lang-4-20k.csv",
    "./dataset/aa_dataset-tickets-multi-lang-5-2-50-version.csv",
]

TEXT_COLUMN = "body"
OUTPUT_FILE = "english_tickets_merged.csv"

def is_english(text):
    try:
        return detect(str(text)) == "en"
    except LangDetectException:
        return False

dfs = []

for file in INPUT_FILES:
    df = pd.read_csv(file)
    print(f"Processing {file}")

    df = df[df[TEXT_COLUMN].notna()]

    df = df[df[TEXT_COLUMN].apply(is_english)]

    dfs.append(df)

merged_df = pd.concat(dfs, ignore_index=True)

merged_df["__clean_body__"] = (
    merged_df[TEXT_COLUMN]
    .str.lower()
    .str.strip()
)

merged_df = merged_df.drop_duplicates(subset="__clean_body__")
merged_df = merged_df.drop(columns="__clean_body__")

merged_df.to_csv(OUTPUT_FILE, index=False)

print(f"\n✅ DONE: {len(merged_df)} English unique tickets saved to {OUTPUT_FILE}")
