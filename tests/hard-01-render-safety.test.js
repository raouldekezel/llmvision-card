import { beforeEach, describe, expect, it } from 'vitest';
import '../src/llmvision-card.js';
import '../src/llmvision-preview-card.js';
import { LLMVisionHorizontalCard } from '../src/llmvision-horizontal-card.js';
import { cannedEvent, fakeHass, flush, horizontalHass } from './harness.js';

// The horizontal card class is exported but never registered by the module; register
// it here so it can be instantiated exactly as the dashboard would.
if (!customElements.get('timeline-horizontal-card')) {
    customElements.define('timeline-horizontal-card', LLMVisionHorizontalCard);
}

// Crafted event data: if any render site parsed it as HTML, an <img> with an
// onerror handler would be created and would fire. Rendered as text, no such
// element exists.
const XSS_TITLE = `Portail <img src=x onerror="console.error('xss')"> ouvert`;
const XSS_SUMMARY = `Alerte <img src=y onerror="console.error('xss')"> détail`;
const LT_TITLE = 'Température < 5 degrés';
const APOS_TITLE = "Voiture d'un voisin";
const NOMINAL = 'Person at the front door';

function timelineCard() {
    const el = document.createElement('llmvision-card');
    el.setConfig({ number_of_events: 5, number_of_days: 7, language: 'en', time_format: '24h', filter_false_positives: true });
    document.body.appendChild(el);
    return el;
}

function previewCard() {
    const el = document.createElement('llmvision-preview-card');
    el.setConfig({ entity: 'calendar.llm_vision_timeline', language: 'en', time_format: '24h', filter_false_positives: true });
    document.body.appendChild(el);
    return el;
}

function horizontalCard() {
    const el = document.createElement('timeline-horizontal-card');
    el.setConfig({ entity: 'calendar.llm_vision_timeline', number_of_events: 5, number_of_hours: 24, language: 'en' });
    document.body.appendChild(el);
    return el;
}

// Popups append to document.body; clear it between tests so stale popups can't leak.
beforeEach(() => { document.body.innerHTML = ''; });

describe('HARD-01 — event data renders as inert text at every site', () => {
    it('timeline list: a crafted title is literal text, no injected element', async () => {
        const el = timelineCard();
        el.hass = fakeHass([cannedEvent({ title: NOMINAL, uid: 'n' }), cannedEvent({ title: XSS_TITLE, uid: 'x' })]);
        await flush();

        const titles = [...el.querySelectorAll('.event-container h3')].map((h) => h.textContent);
        expect(titles).toContain(NOMINAL);      // anti-hollow-green: the render path executed
        expect(titles).toContain(XSS_TITLE);    // the crafted title survives verbatim as text
        expect(el.querySelector('img[src="x"]')).toBeNull();  // nothing was parsed out of it
    });

    it('shared popup: a crafted title is literal text, no injected element (opened via click)', async () => {
        const el = timelineCard();
        el.hass = fakeHass([cannedEvent({ title: NOMINAL, uid: 'n' }), cannedEvent({ title: XSS_TITLE, uid: 'x' })]);
        await flush();

        const containers = [...el.querySelectorAll('.event-container')];
        expect(containers.length).toBe(2);      // anti-hollow-green: both events rendered
        const crafted = containers.find((c) => c.querySelector('h3').textContent === XSS_TITLE);
        crafted.dispatchEvent(new Event('click'));
        await flush();

        const popup = document.querySelector('.popup-overlay');
        expect(popup, 'shared popup should mount').not.toBeNull();
        expect(popup.querySelector('.popup-title-main h2').textContent).toBe(XSS_TITLE);
        expect(document.querySelector('.popup-overlay img[src="x"]')).toBeNull();
    });

    it('shared popup: a crafted summary is literal text, no injected element', async () => {
        const el = timelineCard();
        el.hass = fakeHass([cannedEvent({ title: NOMINAL, description: XSS_SUMMARY })]);
        await flush();

        el.querySelector('.event-container').dispatchEvent(new Event('click'));
        await flush();

        const popup = document.querySelector('.popup-overlay');
        expect(popup, 'shared popup should mount').not.toBeNull();
        expect(popup.querySelector('.summary').textContent).toBe(XSS_SUMMARY);
        expect(document.querySelector('.popup-overlay img[src="y"]')).toBeNull();
    });

    it('preview tile: a crafted title is literal text, no injected element', async () => {
        // nominal first proves the render path runs...
        const nominal = previewCard();
        nominal.hass = fakeHass([cannedEvent({ title: NOMINAL })]);
        await flush();
        expect(nominal.querySelector('.preview-event-title').textContent).toBe(NOMINAL);
        // ...then a fresh instance (its own fetch window, no throttle collision) stays inert
        const el = previewCard();
        el.hass = fakeHass([cannedEvent({ title: XSS_TITLE })]);
        await flush();
        expect(el.querySelector('.preview-event-title').textContent).toBe(XSS_TITLE);
        expect(el.querySelector('img[src="x"]')).toBeNull();
    });

    it('horizontal popup: a crafted title is literal text, no injected element (opened via click)', async () => {
        const el = horizontalCard();
        el.hass = horizontalHass(
            [{ title: XSS_TITLE, summary: 'nominal summary', keyFrame: '', camera: 'camera.gate', start: '2026-08-18T11:03:00' }],
            { states: { 'camera.gate': { attributes: { friendly_name: 'Gate' } } } }
        );

        const titleSpan = el.querySelector('.most-recent-event-title');
        expect(titleSpan, 'most-recent title should render').not.toBeNull();   // path executed
        expect(titleSpan.textContent).toBe(XSS_TITLE);
        titleSpan.dispatchEvent(new Event('click'));

        const popup = document.querySelector('.popup-overlay');
        expect(popup, 'horizontal popup should mount').not.toBeNull();
        expect(popup.querySelector('.title-container h2').textContent).toBe(XSS_TITLE);
        expect(document.querySelector('.popup-overlay img[src="x"]')).toBeNull();
    });

    it('a title containing "<" renders whole, not swallowed as a tag', async () => {
        const el = timelineCard();
        el.hass = fakeHass([cannedEvent({ title: LT_TITLE })]);
        await flush();
        expect(el.querySelector('.event-container h3').textContent).toBe(LT_TITLE);
    });

    it('a French title with an apostrophe renders verbatim', async () => {
        const el = timelineCard();
        el.hass = fakeHass([cannedEvent({ title: APOS_TITLE })]);
        await flush();
        expect(el.querySelector('.event-container h3').textContent).toBe(APOS_TITLE);
    });
});
