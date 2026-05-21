import asyncio
from playwright.async_api import async_playwright

async def save_session():
    async with async_playwright() as p:
        print("Opening WhatsApp Web with saved session...")
        ctx = await p.chromium.launch_persistent_context(
            "./playwright_session",
            headless=False,
            args=["--start-maximized", "--no-sandbox"]
        )
        page = await ctx.new_page()
        await page.goto("https://web.whatsapp.com")
        print("Waiting for WhatsApp to load (60 seconds)...")
        # Wait for chats to load — this confirms the session is valid
        try:
            await page.wait_for_selector('div[aria-label="Chat list"]', timeout=60000)
            print("SUCCESS: WhatsApp session is valid and loaded!")
        except:
            print("Session may have expired. Please scan QR code in the browser window.")
            await asyncio.sleep(90)  # Give time to scan QR if needed

        print("Session saved. Closing browser...")
        await asyncio.sleep(3)
        await ctx.close()

asyncio.run(save_session())


