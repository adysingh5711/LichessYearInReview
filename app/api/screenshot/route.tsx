import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export const config = {
    runtime: 'edge',
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const title = searchParams.get('title') || 'Lichess Review';
    const description = searchParams.get('description') || 'Analyze your chess games and track your progress!';

    // Launch Puppeteer
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to your landing page
    await page.goto('https://lichess-review.vercel.app/', {
        waitUntil: 'networkidle2', // Wait for the page to fully load
    });

    // Take a screenshot
    const screenshot = await page.screenshot({
        type: 'png',
        fullPage: true, // Capture the full page
    });

    await browser.close();

    // Return the screenshot as a response
    return new Response(screenshot, {
        headers: {
            'Content-Type': 'image/png',
        },
    });
}
