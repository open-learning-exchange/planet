"""
GitHub Repository CRUD Operations Tool
=====================================

This script provides command-line interface for GitHub Issues and Pull Requests operations.

USAGE EXAMPLES:
==============

ISSUES:
-------
# Create a new issue
python github-mcp.py create_issue "Bug in login system" "The login button is not working properly on mobile devices."

# Read an existing issue
python github-mcp.py read_issue 123

# Update an issue (provide only the fields you want to update)
python github-mcp.py update_issue 123 "Updated: Bug in login system" "Fixed description with more details" "open"

# Close an issue
python github-mcp.py delete_issue 123

PULL REQUESTS:
--------------
# Create a new pull request
python github-mcp.py create_pr "Fix login bug" "feature/fix-login" "main" "This PR fixes the login issue on mobile devices"

# Read an existing pull request
python github-mcp.py read_pr 45

# Update a pull request
python github-mcp.py update_pr 45 "Updated: Fix login bug" "Updated description with test results" "open"

# Close a pull request
python github-mcp.py delete_pr 45

COMMAND SYNTAX:
==============
create_issue <title> <body>
    - title: String (required) - The issue title
    - body: String (required) - The issue description

read_issue <issue_number>
    - issue_number: Integer (required) - The GitHub issue number

update_issue <issue_number> [title] [body] [state]
    - issue_number: Integer (required) - The GitHub issue number
    - title: String (optional) - New title for the issue
    - body: String (optional) - New body/description for the issue
    - state: String (optional) - "open" or "closed"

delete_issue <issue_number>
    - issue_number: Integer (required) - The GitHub issue number to close

create_pr <title> <head> <base> [body]
    - title: String (required) - The pull request title
    - head: String (required) - The branch containing your changes
    - base: String (required) - The branch you want to merge into (usually "main")
    - body: String (optional) - The pull request description

read_pr <pr_number>
    - pr_number: Integer (required) - The GitHub pull request number

update_pr <pr_number> [title] [body] [state]
    - pr_number: Integer (required) - The GitHub pull request number
    - title: String (optional) - New title for the PR
    - body: String (optional) - New body/description for the PR
    - state: String (optional) - "open" or "closed"

delete_pr <pr_number>
    - pr_number: Integer (required) - The GitHub pull request number to close

NOTES:
======
- Arguments with spaces should be enclosed in quotes
- Optional arguments can be skipped by passing empty strings or omitting them
- The script uses DEBUG logging level, so you'll see detailed API request/response information
- Make sure your GitHub Personal Access Token has the necessary permissions for the repository
"""

import requests
import json
import logging
import sys

# --------------------------
# CONFIGURATION (Adjust These Variables)
# --------------------------

logging.basicConfig(level=logging.DEBUG, format="%(asctime)s - %(levelname)s - %(message)s")

# Your GitHub Personal Access Token
GITHUB_PAT = "YOUR_GITHUB_PAT_HERE"

# Repository details
OWNER = "open-learning-exchange"
REPO = "planet"

# API base URL
API_URL = f"https://api.github.com/repos/{OWNER}/{REPO}"

# Authentication header for GitHub API
HEADERS = {
    "Authorization": f"Bearer {GITHUB_PAT}",
    "Content-Type": "application/json"
}

# --------------------------
# CREATE Issue
# --------------------------

def create_issue_api(title, body):
    """Create an issue in the GitHub repository."""
    url = f"{API_URL}/issues"
    payload = {
        "title": title,
        "body": body
    }
    logging.info(f"Creating issue: {title}")
    
    # Log the payload to ensure it's correct
    logging.debug(f"Payload: {json.dumps(payload)}")

    try:
        logging.debug(f"Making POST request to {url} with data: {json.dumps(payload)}")
        response = requests.post(url, headers=HEADERS, data=json.dumps(payload))
        
        # Log status and response text
        logging.debug(f"Response Status Code: {response.status_code}")
        logging.debug(f"Response Text: {response.text}")
        
        if response.status_code == 201:
            logging.info(f"Issue created successfully! View at: {response.json()['html_url']}")
            return response.json()
        else:
            logging.error(f"Failed to create issue: {response.status_code}")
            logging.error(response.text)
    except Exception as e:
        logging.error(f"Error during API request: {str(e)}")

# --------------------------
# CLI Command to Create Issue
# --------------------------

def create_issue_cli(title, body):
    logging.info("Attempting to create issue...")
    issue = create_issue_api(title, body)
    if issue:
        logging.info(f"Created Issue: {issue['html_url']}")
    else:
        logging.error("Issue creation failed.")

# --------------------------
# READ Issue
# --------------------------

def read_issue_api(issue_number):
    """Read an existing issue from the GitHub repository."""
    url = f"{API_URL}/issues/{issue_number}"
    logging.info(f"Reading issue number: {issue_number}")
    response = requests.get(url, headers=HEADERS)
    if response.status_code == 200:
        logging.info(f"Issue details: {response.json()}")
        return response.json()
    else:
        logging.error(f"Failed to fetch issue: {response.status_code}")
        logging.error(response.text)

# --------------------------
# UPDATE Issue
# --------------------------

def update_issue_api(issue_number, title=None, body=None, state=None):
    """Update an existing issue (title, body, or state)."""
    url = f"{API_URL}/issues/{issue_number}"
    payload = {}
    if title:
        payload["title"] = title
    if body:
        payload["body"] = body
    if state:
        payload["state"] = state  # 'open' or 'closed'

    logging.info(f"Updating issue {issue_number}")
    response = requests.patch(url, headers=HEADERS, data=json.dumps(payload))
    if response.status_code == 200:
        logging.info(f"Issue {issue_number} updated successfully!")
        return response.json()
    else:
        logging.error(f"Failed to update issue: {response.status_code}")
        logging.error(response.text)

# --------------------------
# DELETE Issue (Close Issue)
# --------------------------

def delete_issue_api(issue_number):
    """Close an issue by setting its state to 'closed'."""
    logging.info(f"Closing issue {issue_number}")
    return update_issue_api(issue_number, state='closed')

# --------------------------
# CREATE Pull Request (PR)
# --------------------------

def create_pr_api(title, head, base, body=None):
    """Create a pull request in the GitHub repository."""
    url = f"{API_URL}/pulls"
    payload = {
        "title": title,
        "head": head,  # The name of the branch where changes are implemented
        "base": base,  # The branch you want to merge into (e.g., 'main')
        "body": body
    }
    logging.info(f"Creating pull request: {title}")
    response = requests.post(url, headers=HEADERS, data=json.dumps(payload))
    if response.status_code == 201:
        logging.info(f"Pull request created successfully! View at: {response.json()['html_url']}")
        return response.json()
    else:
        logging.error(f"Failed to create pull request: {response.status_code}")
        logging.error(response.text)

# --------------------------
# READ Pull Request (PR)
# --------------------------

def read_pr_api(pr_number):
    """Read a pull request from the GitHub repository."""
    url = f"{API_URL}/pulls/{pr_number}"
    logging.info(f"Reading pull request number: {pr_number}")
    response = requests.get(url, headers=HEADERS)
    if response.status_code == 200:
        logging.info(f"PR details: {response.json()}")
        return response.json()
    else:
        logging.error(f"Failed to fetch pull request: {response.status_code}")
        logging.error(response.text)

# --------------------------
# UPDATE Pull Request (PR)
# --------------------------

def update_pr_api(pr_number, title=None, body=None, state=None):
    """Update an existing pull request."""
    url = f"{API_URL}/pulls/{pr_number}"
    payload = {}
    if title:
        payload["title"] = title
    if body:
        payload["body"] = body
    if state:
        payload["state"] = state  # 'open' or 'closed'

    logging.info(f"Updating pull request {pr_number}")
    response = requests.patch(url, headers=HEADERS, data=json.dumps(payload))
    if response.status_code == 200:
        logging.info(f"Pull request {pr_number} updated successfully!")
        return response.json()
    else:
        logging.error(f"Failed to update pull request: {response.status_code}")
        logging.error(response.text)

# --------------------------
# DELETE Pull Request (PR) - Close a PR
# --------------------------

def delete_pr_api(pr_number):
    """Close a pull request by setting its state to 'closed'."""
    logging.info(f"Closing pull request {pr_number}")
    return update_pr_api(pr_number, state='closed')

# --------------------------
# CLI Commands

# Command: Create Issue
def create_issue(title, body):
    """CLI command to create an issue."""
    logging.info("Attempting to create issue...")
    issue = create_issue_api(title, body)
    if issue:
        logging.info(f"Created Issue: {issue['html_url']}")
    else:
        logging.error("Issue creation failed.")

# Command: Read Issue
def read_issue(issue_number):
    """CLI command to read an issue."""
    issue = read_issue_api(issue_number)
    if issue:
        logging.info(f"Issue details: {issue}")

# Command: Update Issue
def update_issue(issue_number, title=None, body=None, state=None):
    """CLI command to update an issue."""
    issue = update_issue_api(issue_number, title, body, state)
    if issue:
        logging.info(f"Updated Issue: {issue}")

# Command: Delete (Close) Issue
def delete_issue(issue_number):
    """CLI command to delete (close) an issue."""
    result = delete_issue_api(issue_number)
    if result:
        logging.info(f"Issue {issue_number} closed successfully.")

# Command: Create Pull Request
def create_pr(title, head, base, body=None):
    """CLI command to create a pull request."""
    pr = create_pr_api(title, head, base, body)
    if pr:
        logging.info(f"Created PR: {pr['html_url']}")

# Command: Read Pull Request
def read_pr(pr_number):
    """CLI command to read a pull request."""
    pr = read_pr_api(pr_number)
    if pr:
        logging.info(f"PR details: {pr}")

# Command: Update Pull Request
def update_pr(pr_number, title=None, body=None, state=None):
    """CLI command to update a pull request."""
    pr = update_pr_api(pr_number, title, body, state)
    if pr:
        logging.info(f"Updated PR: {pr}")

# Command: Delete (Close) Pull Request
def delete_pr(pr_number):
    """CLI command to delete (close) a pull request."""
    result = delete_pr_api(pr_number)
    if result:
        logging.info(f"PR {pr_number} closed successfully.")

# --------------------------
# MAIN EXECUTION
# --------------------------

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python github-mcp.py <command> [arguments...]")
        print("Commands:")
        print("  create_issue <title> <body>")
        print("  read_issue <issue_number>")
        print("  update_issue <issue_number> [title] [body] [state]")
        print("  delete_issue <issue_number>")
        print("  create_pr <title> <head> <base> [body]")
        print("  read_pr <pr_number>")
        print("  update_pr <pr_number> [title] [body] [state]")
        print("  delete_pr <pr_number>")
        sys.exit(1)
    
    command = sys.argv[1]
    
    try:
        if command == "create_issue":
            if len(sys.argv) < 4:
                print("Usage: python github-mcp.py create_issue <title> <body>")
                sys.exit(1)
            title = sys.argv[2]
            body = sys.argv[3]
            create_issue(title, body)
            
        elif command == "read_issue":
            if len(sys.argv) < 3:
                print("Usage: python github-mcp.py read_issue <issue_number>")
                sys.exit(1)
            issue_number = int(sys.argv[2])
            read_issue(issue_number)
            
        elif command == "update_issue":
            if len(sys.argv) < 3:
                print("Usage: python github-mcp.py update_issue <issue_number> [title] [body] [state]")
                sys.exit(1)
            issue_number = int(sys.argv[2])
            title = sys.argv[3] if len(sys.argv) > 3 else None
            body = sys.argv[4] if len(sys.argv) > 4 else None
            state = sys.argv[5] if len(sys.argv) > 5 else None
            update_issue(issue_number, title, body, state)
            
        elif command == "delete_issue":
            if len(sys.argv) < 3:
                print("Usage: python github-mcp.py delete_issue <issue_number>")
                sys.exit(1)
            issue_number = int(sys.argv[2])
            delete_issue(issue_number)
            
        elif command == "create_pr":
            if len(sys.argv) < 5:
                print("Usage: python github-mcp.py create_pr <title> <head> <base> [body]")
                sys.exit(1)
            title = sys.argv[2]
            head = sys.argv[3]
            base = sys.argv[4]
            body = sys.argv[5] if len(sys.argv) > 5 else None
            create_pr(title, head, base, body)
            
        elif command == "read_pr":
            if len(sys.argv) < 3:
                print("Usage: python github-mcp.py read_pr <pr_number>")
                sys.exit(1)
            pr_number = int(sys.argv[2])
            read_pr(pr_number)
            
        elif command == "update_pr":
            if len(sys.argv) < 3:
                print("Usage: python github-mcp.py update_pr <pr_number> [title] [body] [state]")
                sys.exit(1)
            pr_number = int(sys.argv[2])
            title = sys.argv[3] if len(sys.argv) > 3 else None
            body = sys.argv[4] if len(sys.argv) > 4 else None
            state = sys.argv[5] if len(sys.argv) > 5 else None
            update_pr(pr_number, title, body, state)
            
        elif command == "delete_pr":
            if len(sys.argv) < 3:
                print("Usage: python github-mcp.py delete_pr <pr_number>")
                sys.exit(1)
            pr_number = int(sys.argv[2])
            delete_pr(pr_number)
            
        else:
            print(f"Unknown command: {command}")
            sys.exit(1)
            
    except ValueError as e:
        print(f"Invalid argument: {e}")
        sys.exit(1)
    except Exception as e:
        logging.error(f"Error executing command: {e}")
        sys.exit(1)
