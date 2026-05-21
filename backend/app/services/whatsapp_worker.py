import sys
import os
import argparse
import asyncio
import urllib.parse
from playwright.async_api import async_playwright

# Enforce Windows Proactor event loop to fully support subprocesses
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

async def run_worker(phone: str, message: str):
    try:
        async with async_playwright() as p:
            # We use the persistent session saved inside the backend directory
            session_dir = "./playwright_session"
            
            browser = await p.chromium.launch_persistent_context(
                user_data_dir=session_dir,
                headless=False,
                ignore_default_args=["--enable-automation"],
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                args=["--no-sandbox", "--start-maximized", "--disable-blink-features=AutomationControlled"]
            )
            page = await browser.new_page()

            # STEP 1: Open WhatsApp Web
            print("Opening WhatsApp Web...")
            await page.goto("https://web.whatsapp.com", wait_until="networkidle", timeout=90000)

            # STEP 2: Check for sidebar
            sidebar_found = False
            for sel in ['#pane-side', 'div[aria-label="Chat list"]', 'div[data-testid="chat-list"]']:
                try:
                    await page.wait_for_selector(sel, timeout=15000)
                    sidebar_found = True
                    break
                except Exception:
                    pass

            if not sidebar_found:
                print("Sidebar not found - waiting 15s...")
                await asyncio.sleep(15)

            # STEP 3: Navigate to chat and compose message
            encoded_message = urllib.parse.quote(message)
            chat_url = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_message}"
            print("Navigating to chat via JS...")
            await page.evaluate(f'window.location.href = "{chat_url}"')

            # Wait for page to settle
            await asyncio.sleep(3)
            try:
                await page.wait_for_load_state("networkidle", timeout=30000)
            except Exception:
                pass

            # STEP 4: Wait for compose box and send
            compose_box_selector = 'div[data-testid="conversation-compose-box-input"]'
            await page.wait_for_selector(compose_box_selector, timeout=60000)
            
            # Focus and hit Enter to transmit
            await page.focus(compose_box_selector)
            await page.keyboard.press("Enter")
            print("Message sent! Waiting 35s for server transmission sync...")
            await asyncio.sleep(35)

            await browser.close()
            print("SUCCESS: WhatsApp sent successfully!")
            return True
            
    except Exception as e:
        print(f"FAILED: {e}")
        return False

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--phone", required=True)
    parser.add_argument("--message", required=True)
    args = parser.parse_args()
    
    asyncio.run(run_worker(args.phone, args.message))
