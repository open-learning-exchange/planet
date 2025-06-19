import openai
import requests
import json
import os
import sys
import subprocess

# GitHub Configuration
GITHUB_PAT = os.getenv("GITHUB_PAT")  # GitHub token from environment variable
OWNER = "your-username"  # Replace with your GitHub username
REPO = "your-repo"  # Replace with your GitHub repository name
API_URL = f"https://api.github.com/repos/{OWNER}/{REPO}"
HEADERS = {
    "Authorization": f"Bearer {GITHUB_PAT}",
    "Content-Type": "application/json"
}

# OpenAI API Configuration
openai.api_key = os.getenv("OPENAI_API_KEY")

# Available GitHub Actions (commands)
ACTIONS = {
    'create_issue': 'Creates a GitHub issue',
    'update_issue': 'Updates an existing GitHub issue',
    'create_pr': 'Creates a GitHub pull request',
    'merge_pr': 'Merges a GitHub pull request',
    'list_prs': 'Lists GitHub pull requests',
    'list_issues': 'Lists GitHub issues',
    'comment_on_issue': 'Comments on a GitHub issue',
    'list_branches': 'Lists branches in a repository'
}

# Function to generate GitHub command via OpenAI
def generate_command(prompt):
    """Generates a GitHub command using OpenAI API."""
    response = openai.ChatCompletion.create(
        model="gpt-4",  # Or use "gpt-3.5-turbo" for faster/cheaper responses
        messages=[
            {"role": "system", "content": "You are a helpful assistant that generates GitHub commands."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=100
    )
    return response.choices[0].message['content'].strip()

# GitHub API Functions

def create_github_issue(title, body):
    """Create a GitHub issue using GitHub API."""
    url = f"{API_URL}/issues"
    payload = {"title": title, "body": body}
    response = requests.post(url, headers=HEADERS, data=json.dumps(payload))
    if response.status_code == 201:
        print(f"Issue created: {response.json()['html_url']}")
    else:
        print(f"Failed to create issue: {response.status_code}")
        print(response.text)

def create_pull_request(title, body, head, base):
    """Create a GitHub pull request using GitHub API."""
    url = f"{API_URL}/pulls"
    payload = {
        "title": title,
        "body": body,
        "head": head,
        "base": base
    }
    response = requests.post(url, headers=HEADERS, data=json.dumps(payload))
    if response.status_code == 201:
        print(f"Pull request created: {response.json()['html_url']}")
    else:
        print(f"Failed to create pull request: {response.status_code}")
        print(response.text)

def list_issues():
    """List GitHub issues using GitHub API."""
    url = f"{API_URL}/issues"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code == 200:
        issues = response.json()
        if issues:
            print("Issues:")
            for issue in issues:
                print(f"- {issue['title']} (#{issue['number']}) - {issue['state']}")
        else:
            print("No issues found.")
    else:
        print(f"Failed to fetch issues: {response.status_code}")
        print(response.text)

# Function to execute an action
def run_action(action, *args):
    """Execute an action from the available list of actions."""
    if action == 'create_issue':
        title = args[0]
        body = args[1]
        create_github_issue(title, body)
    elif action == 'create_pr':
        title = args[0]
        body = args[1]
        head = args[2]
        base = args[3]
        create_pull_request(title, body, head, base)
    elif action == 'list_issues':
        list_issues()

# Main execution
def main():
    if len(sys.argv) < 2:
        print("Usage: python mcp_integration.py <action> [arguments...]")
        sys.exit(1)

    action = sys.argv[1]
    
    if action == 'generate_command':
        prompt = sys.argv[2] if len(sys.argv) > 2 else "Create a GitHub issue."
        generated_command = generate_command(prompt)
        print("Generated Command:", generated_command)
    elif action in ACTIONS:
        args = sys.argv[2:]
        run_action(action, *args)
    else:
        print(f"Unknown command: {action}")
        sys.exit(1)

if __name__ == "__main__":
    main()
