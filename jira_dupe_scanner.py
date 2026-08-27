import os
import json
import hashlib
from collections import defaultdict

def normalize_json(data):
    """Normalize JSON by sorting keys and removing metadata fields."""
    if isinstance(data, dict):
        return {k: normalize_json(v) for k, v in sorted(data.items()) if k not in ['filename', 'timestamp', 'metadata']}
    elif isinstance(data, list):
        return [normalize_json(item) for item in data]
    else:
        return data

def compute_hash(file_path):
    """Compute SHA-256 hash of normalized JSON content."""
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        normalized = normalize_json(data)
        json_str = json.dumps(normalized, sort_keys=True).encode('utf-8')
        return hashlib.sha256(json_str).hexdigest()
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

def scan_directory(directory):
    """Recursively scan directory for JSON files and detect duplicates."""
    hash_to_files = defaultdict(list)
    import logging
    logging.basicConfig(filename='jira_dupe_scan.log', level=logging.INFO, 
                       format='%(asctime)s - %(levelname)s - %(message)s')
    logging.info(f"Starting duplicate scan in directory: {directory}")
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.json'):
                file_path = os.path.join(root, file)
                file_hash = compute_hash(file_path)
                if file_hash:
                    hash_to_files[file_hash].append(file_path)
                    logging.debug(f"Processed file: {file_path} (hash: {file_hash})")
    
    duplicates = {k: v for k, v in hash_to_files.items() if len(v) > 1}
    if duplicates:
        logging.warning(f"Found {len(duplicates)} duplicate pairs")
    else:
        logging.info("No duplicates found (0% threshold).")
    return duplicates

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Scan Jira export data for duplicates (0% threshold).')
    parser.add_argument('directory', help='Directory containing Jira export JSON files')
    args = parser.parse_args()
    duplicates = scan_directory(args.directory)
    if duplicates:
        print(f"Found {len(duplicates)} duplicate pairs:")
        for hash_val, files in duplicates.items():
            print(f"SHA-256: {hash_val}")
            for file in files:
                print(f"  - {file}")
    else:
        print("No duplicates found (0% threshold).")
