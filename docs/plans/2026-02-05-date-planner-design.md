# Date Planner Agent — Design

## What
Personal web app. Paste an Instagram or TikTok link, get a full date itinerary in SF.

## Core Flow
Paste link → Firecrawl scrapes post → Claude extracts venue → Agent plans 3-stop itinerary using Google Places → Streams back as timeline

## Stack
- Next.js 15, Vercel AI SDK, Claude Sonnet 4, Firecrawl, Google Places API, Tailwind, Vercel

## No-Build List
No auth, no database, no accounts, no sharing, no saved history.
