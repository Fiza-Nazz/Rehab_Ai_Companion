import asyncio
from playwright.async_api import async_playwright

async def check_screen():
    async with async_playwright() as p:
        print("Opening WhatsApp Web to check session state...")
        ctx = await p.chromium.launch_persistent_context(
            "./playwright_session",
            headless=False,
            args=["--no-sandbox"]
        )
        page = await ctx.new_page()
        await page.goto("https://web.whatsapp.com")
        print("Page loaded. Waiting 15 seconds to settle...")
        await asyncio.sleep(15)
        
        # Take a screenshot to see if it shows the QR code or chats list
        screenshot_path = "whatsapp_check_state.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")
        
        await ctx.close()

if __name__ == "__main__":
    asyncio.run(check_screen())
