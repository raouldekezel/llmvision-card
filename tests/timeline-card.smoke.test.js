import { describe, expect, it } from 'vitest';
import '../src/llmvision-card.js';
import { cannedEvents, fakeHass, flush } from './harness.js';

function makeTimelineCard(config = {}) {
    const el = document.createElement('llmvision-card');
    el.setConfig({
        number_of_events: 5,
        number_of_days: 7,
        language: 'en',
        time_format: '24h',
        filter_false_positives: true,
        ...config,
    });
    document.body.appendChild(el);
    return el;
}

describe('timeline card — smoke', () => {
    it('renders N canned events as N entries carrying their titles', async () => {
        const el = makeTimelineCard();
        el.hass = fakeHass(cannedEvents(3));
        await flush();

        const entries = el.querySelectorAll('.event-container');
        expect(entries.length).toBe(3);

        // Anti-hollow-green: each canned event's own title text is present in the DOM,
        // proving the mocked render path executed rather than merely not crashing.
        const titles = Array.from(el.querySelectorAll('.event-container h3')).map((h) => h.textContent);
        expect(titles).toContain('Event number 1');
        expect(titles).toContain('Event number 2');
        expect(titles).toContain('Event number 3');
    });
});
