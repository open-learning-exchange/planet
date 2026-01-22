import requests
import time
import json
import argparse
import sys

# Default configuration
DEFAULT_COUCH_URL = 'http://localhost:5984'
DEFAULT_USER = 'admin'
DEFAULT_PASS = 'password'

# Queries to test and measure
QUERIES = [
    {
        'db': 'resources',
        'name': 'Resources by date',
        'query': {
            'selector': { 'createdDate': { '$gt': 0 } },
            'sort': [{'createdDate': 'desc'}],
            'limit': 20
        }
    },
    {
        'db': 'resources',
        'name': 'Resources by author',
        'query': {
            'selector': { 'author': 'Ghanaian Folktale' },
            'limit': 20
        }
    },
    {
        'db': 'courses',
        'name': 'Courses by title',
        'query': {
            'selector': { 'courseTitle': { '$gte': 'A' } },
            'sort': [{'courseTitle': 'asc'}],
            'limit': 20
        }
    },
    {
        'db': 'notifications',
        'name': 'Unread notifications',
        'query': {
            'selector': { 'status': 'unread', 'type': 'newResource', 'link': '/resources' },
            'limit': 20
        }
    }
]

def run_query(base_url, auth, db, query):
    url = f"{base_url}/{db}/_find"
    start_time = time.time()
    response = requests.post(url, json=query, auth=auth)
    end_time = time.time()
    duration = (end_time - start_time) * 1000 # ms

    if response.status_code != 200:
        print(f"Error running query on {db}: {response.text}")
        return None, duration

    return response.json(), duration

def explain_query(base_url, auth, db, query):
    url = f"{base_url}/{db}/_explain"
    response = requests.post(url, json=query, auth=auth)

    if response.status_code != 200:
        print(f"Error explaining query on {db}: {response.text}")
        return None

    return response.json()

def main():
    parser = argparse.ArgumentParser(description='Measure CouchDB query performance and verify index usage.')
    parser.add_argument('--url', default=DEFAULT_COUCH_URL, help='CouchDB URL')
    parser.add_argument('--user', default=DEFAULT_USER, help='CouchDB Username')
    parser.add_argument('--password', default=DEFAULT_PASS, help='CouchDB Password')
    args = parser.parse_args()

    auth = (args.user, args.password)
    base_url = args.url

    print(f"Connecting to {base_url}...")
    try:
        requests.get(base_url, auth=auth, timeout=5)
    except requests.exceptions.ConnectionError:
        print("Could not connect to CouchDB. Please check the URL and ensure it is running.")
        sys.exit(1)

    print("\n--- Performance Measurement & Index Verification ---\n")

    for item in QUERIES:
        db = item['db']
        name = item['name']
        query = item['query']

        print(f"Test: {name} (DB: {db})")

        # Explain
        explanation = explain_query(base_url, auth, db, query)
        if explanation:
            index = explanation.get('index', {})
            index_name = index.get('name', 'Unknown')
            index_type = index.get('type', 'Unknown')
            print(f"  Index Used: {index_name} ({index_type})")
            if index_type == 'special': # _all_docs, not efficient for complex queries
                print("  WARNING: Using default index (scan). Performance might be poor.")
            else:
                print("  SUCCESS: Using optimized index.")

        # Measure
        result, duration = run_query(base_url, auth, db, query)
        if result:
            doc_count = len(result.get('docs', []))
            print(f"  Result: {doc_count} docs returned in {duration:.2f} ms")

        print("-" * 40)

if __name__ == "__main__":
    main()
