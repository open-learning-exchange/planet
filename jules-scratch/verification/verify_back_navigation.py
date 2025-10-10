from playwright.sync_api import sync_playwright
import os

def test_manager_surveys_back_navigation():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        print("Starting verification script...")
        try:
            page.goto("http://localhost:4200/#/manager/surveys", timeout=60000)
            page.wait_for_load_state("networkidle")

            back_button = page.get_by_role("button", name="Back")
            back_button.click()

            page.wait_for_load_state("networkidle")

            # Assert that the URL is now the manager's dashboard
            assert page.url == "http://localhost:4200/#/manager"

            screenshot_path = "jules-scratch/verification/verification.png"
            page.screenshot(path=screenshot_path)
            print("Verification script finished.")

            if os.path.exists(screenshot_path):
                print("Screenshot created successfully.")
            else:
                print("Screenshot not found.")
        finally:
            browser.close()

if __name__ == "__main__":
    test_manager_surveys_back_navigation()