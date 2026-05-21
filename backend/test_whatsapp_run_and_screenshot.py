import asyncio
from playwright.async_api import async_playwright

async def run_test():
    async with async_playwright() as p:
        print("Opening WhatsApp Web in visible mode...")
        ctx = await p.chromium.launch_persistent_context(
            "./playwright_session",
            headless=False,
            args=["--no-sandbox"]
        )
        page = await ctx.new_page()
        await page.goto("https://web.whatsapp.com")
        
        print("Waiting 40 seconds to let WhatsApp Web load/sync...")
        await asyncio.sleep(40)
        
        screenshot_path = "whatsapp_test_result.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")
        
        await ctx.close()

if __name__ == "__main__":
    asyncio.run(run_test())
