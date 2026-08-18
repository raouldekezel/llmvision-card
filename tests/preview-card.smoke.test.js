import { describe, expect, it } from 'vitest';
import '../src/llmvision-preview-card.js';
import { cannedEvent, fakeHass, flush } from './harness.js';

function makePreviewCard() {
    const el = document.createElement('llmvision-preview-card');
    el.setConfig({
        entity: 'calendar.llm_vision_timeline',
        language: 'en',
        time_format: '24h',
        filter_false_positives: true,
    });
    document.body.appendChild(el);
    return el;
}

describe('preview card — smoke', () => {
    it('renders a nominal canned event with its title and camera name in the DOM', async () => {
        const el = makePreviewCard();
        el.hass = fakeHass([cannedEvent()]);
        await flush();

        const titleEl = el.querySelector('.preview-event-title');
        const detailsEl = el.querySelector('.preview-event-details');

        // Anti-hollow-green: with callApi mocked, prove the render path actually ran
        // by finding the event's own content in the DOM, not merely the lack of a crash.
        expect(titleEl, 'preview title element should be rendered').not.toBeNull();
        expect(titleEl.textContent).toContain('Person at the front door');
        expect(detailsEl, 'preview details element should be rendered').not.toBeNull();
        expect(detailsEl.textContent).toContain('Front Door');
    });
});
