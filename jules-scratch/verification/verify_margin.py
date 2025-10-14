from playwright.sync_api import sync_playwright, expect

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:4200")

    # Navigate to the community page
    page.get_by_role("button", name="Communities").click()

    # Click on the "Services" tab
    page.get_by_role("tab", name="Services").click()

    # Ensure the buttons are visible before taking a screenshot
    add_button = page.get_by_role("button", name="Add Community Description")
    remove_button = page.get_by_role("button", name="Remove Description")

    expect(add_button).to_be_visible()
    expect(remove_button).to_be_visible()

    page.set_viewport_size({"width": 375, "height": 812})

    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()