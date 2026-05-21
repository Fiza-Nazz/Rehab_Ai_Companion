# -*- coding: utf-8 -*-
import sys
import asyncio
import urllib.parse
from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding='utf-8')

async def test_whatsapp():
    phone = "923123632197"
    message = "RehabAI Test: WhatsApp alerts are working!"

    async with async_playwright() as p:
        print("Launching browser with saved session...")
        ctx = await p.chromium.launch_persistent_context(
            "./playwright_session",
            headless=False,
            args=["--no-sandbox", "--start-maximized"]
        )
        page = await ctx.new_page()

        # STEP 1: Open WhatsApp home and wait for FULL network idle
        print("Step 1: Opening WhatsApp Web (waiting for full load)...")
        await page.goto(
            "https://web.whatsapp.com",
            wait_until="networkidle",
            timeout=90000
        )
        print("WhatsApp page networkidle reached.")

        # STEP 2: Wait for sidebar (chat list) to appear
        print("Step 2: Waiting for chat list sidebar...")
        sidebar_found = False
        for sel in ['#pane-side', 'div[data-testid="pane-side"]', 'div[data-testid="chat-list"]']:
            try:
                await page.wait_for_selector(sel, timeout=15000)
                print(f"Sidebar found: {sel}")
                sidebar_found = True
                break
            except Exception:
                continue

        if not sidebar_found:
            print("WARNING: Sidebar not found - WhatsApp may need QR scan. Waiting 15s...")
            await asyncio.sleep(15)

        # STEP 3: Extra stability wait
        print("Step 3: Stability wait (5 seconds)...")
        await asyncio.sleep(5)

        # STEP 4: Use JS navigation (softer than page.goto - keeps WA state intact)
        encoded_message = urllib.parse.quote(message)
        chat_url = f"https://web.whatsapp.com/send?phone={phone}&text={encoded_message}"
        print(f"Step 4: Navigating to chat via JS (keeps session alive)...")
        await page.evaluate(f'window.location.href = "{chat_url}"')

        # Wait for page to settle after JS navigation
        await asyncio.sleep(3)
        try:
            await page.wait_for_load_state("networkidle", timeout=30000)
            print("Chat page network idle.")
        except Exception:
            print("Network idle timeout - continuing anyway...")

        # STEP 5: Wait for compose box
        compose_box_selector = 'div[data-testid="conversation-compose-box-input"]'
        print("Step 5: Waiting for compose box (60s max)...")

        try:
            await page.wait_for_selector(compose_box_selector, timeout=60000)
            print("Compose box found!")
            await asyncio.sleep(2)

            # Check compose box text
            compose_box = page.locator(compose_box_selector)
            box_text = await compose_box.inner_text()
            print(f"Compose box text: '{box_text}'")

            if not box_text.strip():
                print("Compose box empty - typing manually...")
                await compose_box.click()
                await asyncio.sleep(1)
                await page.keyboard.type(message, delay=50)
                await asyncio.sleep(2)
            else:
                print("Text is ready in compose box!")
                await compose_box.click()
                await asyncio.sleep(1)

            # STEP 6: Click send button
            print("Step 6: Clicking send button...")
            send_selectors = [
                'button[data-testid="compose-btn-send"]',
                'button[aria-label="Send"]',
                '[data-testid="compose-btn-send"]',
            ]
            sent = False
            for sel in send_selectors:
                try:
                    el = page.locator(sel).first
                    if await el.is_visible(timeout=5000):
                        print(f"Send button found: {sel}")
                        await el.click()
                        sent = True
                        print("Send button CLICKED!")
                        break
                except Exception:
                    continue

            if not sent:
                print("Using Enter key fallback...")
                await page.keyboard.press("Enter")

            # STEP 7: Wait 10 seconds then take screenshot
            print("Step 7: Waiting 10s for delivery...")
            await asyncio.sleep(10)

            # Check delivery status
            try:
                error_icon = await page.locator('span[data-icon="msg-dtime"]').last.is_visible()
                tick_icon  = await page.locator('span[data-icon="msg-check"], span[data-icon="msg-dblcheck"]').last.is_visible()
                clock_icon = await page.locator('span[data-icon="msg-time"]').last.is_visible()

                if tick_icon:
                    print("RESULT: DELIVERED! Tick visible.")
                elif clock_icon:
                    print("RESULT: Still PENDING (clock). Phone may be offline.")
                elif error_icon:
                    print("RESULT: FAILED (red clock). Check WhatsApp connection.")
                else:
                    print("RESULT: Unknown status.")
            except Exception as e:
                print(f"Could not check status: {e}")

        except Exception as e:
            print(f"FAILED to open chat compose box: {e}")

        # Screenshot before closing
        await page.screenshot(path="whatsapp_debug_new.png")
        print("Screenshot saved.")

        # Keep browser open 5s so user can see it
        print("Keeping browser open 5 seconds so you can see result...")
        await asyncio.sleep(5)
        await ctx.close()
        print("Done!")

asyncio.run(test_whatsapp())
