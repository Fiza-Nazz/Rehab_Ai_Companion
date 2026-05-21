import asyncio
from playwright.async_api import async_playwright

SESSION_DIR = "./playwright_session"

async def setup_whatsapp_session():
    print("=" * 60)
    print("  WhatsApp Web - Automated Lifetime QR Code Setup")
    print("=" * 60)
    print("\n[INFO] Opening WhatsApp Web in a browser window...")
    print("[INFO] Please SCAN the QR code with your mobile app.")
    print("[INFO] The window will stay open for up to 3 minutes.")
    print("[INFO] Once you scan and chats load, it will automatically save and close!\n")

    async with async_playwright() as p:
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=SESSION_DIR,
            headless=False,              # Keep visible so user can scan
            ignore_default_args=["--enable-automation"],
            args=["--no-sandbox", "--start-maximized", "--disable-blink-features=AutomationControlled"]
        )

        page = await browser.new_page()
        await page.goto("https://web.whatsapp.com")

        print("[INFO] WhatsApp Web is open. SCAN the QR code now...")
        
        # Periodically check if logged in (for up to 180 seconds)
        logged_in = False
        selectors = ['#pane-side', 'div[aria-label="Chat list"]', 'div[data-testid="chat-list"]']
        
        for i in range(90):  # 90 iterations * 2 seconds = 180 seconds max
            await asyncio.sleep(2)
            
            # Check if any sidebar selector is loaded
            for selector in selectors:
                try:
                    el = await page.query_selector(selector)
                    if el:
                        logged_in = True
                        break
                except Exception:
                    pass
            
            if logged_in:
                print("\n[SUCCESS] Chat list detected! Logged in successfully!")
                print("[INFO] Saving session database to disk... Please wait 15 seconds.")
                await asyncio.sleep(15)  # Let WhatsApp Web sync and write storage files
                break
            
            if i % 5 == 0 and i > 0:
                print(f"[WAITING] Still waiting for QR scan/login ({180 - i*2} seconds remaining)...")

        if logged_in:
            print("\n[SUCCESS] Session has been saved for lifetime use!")
            print("[INFO] Closing browser now. You won't need to scan the QR code again!\n")
        else:
            print("\n[TIMEOUT] 3 minutes expired without detecting login. Please try again.")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(setup_whatsapp_session())
