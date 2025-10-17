from playwright.sync_api import Page, expect, sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Verify the resources page
    page.goto("http://localhost:3000/resources", timeout=60000)
    page.set_viewport_size({"width": 375, "height": 812})
    page.wait_for_timeout(5000)
    page.screenshot(path="jules-scratch/verification/resources.png")

    # Verify the courses page
    page.goto("http://localhost:3000/courses", timeout=60000)
    page.set_viewport_size({"width": 375, "height": 812})
    page.wait_for_timeout(5000)
    page.screenshot(path="jules-scratch/verification/courses.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)