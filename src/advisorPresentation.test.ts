import { describe, expect, it } from "vitest";
import { applyAdvisorFallbackCadence, isAdvisorGreeting, revealAdvisorResponse, splitAdvisorResponse } from "./advisorPresentation";

describe("advisor response presentation", () => {
  it("reveals a response progressively without changing the stored wording", () => {
    const answer = "First, establish the record.\n\nThen assess the implication.";
    const chunks = splitAdvisorResponse(answer);

    expect(revealAdvisorResponse(chunks, 3)).toBe("First, establish the");
    expect(revealAdvisorResponse(chunks, chunks.length)).toBe(answer);
  });

  it("recognizes brief greetings without treating substantive questions as greetings", () => {
    expect(isAdvisorGreeting("Hello, Amara!")).toBe(true);
    expect(isAdvisorGreeting("Good morning, I'm Sam.")).toBe(true);
    expect(isAdvisorGreeting("Hello, what is usable liquidity?")).toBe(false);
  });

  it("keeps the scripted fallback in each advisor's cadence", () => {
    expect(applyAdvisorFallbackCadence("amara", "The record is incomplete.")).toMatch(/^Let's place this in context\./);
    expect(applyAdvisorFallbackCadence("daniel", "The record is incomplete.")).toMatch(/^The key distinction is this\./);
  });
});
