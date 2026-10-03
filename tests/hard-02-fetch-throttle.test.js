import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../src/llmvision-card.js';
import { cannedEvent, fakeHass, flush } from './harness.js';

// A fakeHass whose callApi is a spy that still returns the canned payload, so the
// number of real timeline requests is observable.
function spyHass(events) {
    const base = fakeHass(events);
    return { ...base, callApi: vi.fn(base.callApi) };
}

function timelineCard(config = {}) {
    const el = document.createElement('llmvision-card');
    el.setConfig({ number_of_events: 5, number_of_days: 7, language: 'en', time_format: '24h', filter_false_positives: true, ...config });
    document.body.appendChild(el);
    return el;
}

// Only the clock is faked (via a Date.now spy); the harness flush() keeps using real
// setTimeout, so the async render path still settles.
let now;
const advance = (ms) => { now += ms; };
beforeEach(() => {
    now = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    document.body.innerHTML = '';
});
afterEach(() => { vi.restoreAllMocks(); });

// Semantics are upstream's (llmvision-card v1.7.2): default window 15 s, floor 1 s,
// in-flight requests shared, cached events served inside the window.
describe('HARD-02 — timeline fetch throttled to a per-instance window', () => {
    it('first hass update fetches once and renders', async () => {
        const el = timelineCard();
        const hass = spyHass([cannedEvent({ title: 'Person at the door' })]);
        el.hass = hass;
        await flush();
        expect(hass.callApi).toHaveBeenCalledTimes(1);
        // anti-hollow-green: the fetch path executed -> the event is in the DOM
        expect(el.querySelector('.event-container h3').textContent).toBe('Person at the door');
    });

    it('rapid hass updates inside the window do not refetch', async () => {
        const el = timelineCard();
        const hass = spyHass([cannedEvent()]);
        el.hass = hass;
        await flush();
        expect(hass.callApi).toHaveBeenCalledTimes(1);
        for (let i = 0; i < 10; i++) el.hass = hass;
        await flush();
        expect(hass.callApi).toHaveBeenCalledTimes(1);
    });

    it('a tick during an in-flight request does not start a second one', async () => {
        // callApi stays pending, so the first request is still in flight during the
        // next ticks: they must share it instead of starting their own.
        const el = timelineCard();
        let resolveFetch;
        const hass = { ...fakeHass([]), callApi: vi.fn(() => new Promise((r) => { resolveFetch = r; })) };
        el.hass = hass;   // request starts, remains in flight (no flush yet)
        el.hass = hass;   // ticks arriving during the in-flight await...
        el.hass = hass;
        expect(hass.callApi).toHaveBeenCalledTimes(1);   // ...are gated
        resolveFetch({ events: [cannedEvent()] });
        await flush();
        expect(el.querySelector('.event-container h3').textContent).toBe('Person at the front door');
    });

    it('the default window is 15 s; a hass update past it fetches again', async () => {
        const el = timelineCard();
        const hass = spyHass([cannedEvent()]);
        el.hass = hass;
        await flush();
        expect(hass.callApi).toHaveBeenCalledTimes(1);
        advance(14_999);   // inside 15 s
        el.hass = hass;
        await flush();
        expect(hass.callApi).toHaveBeenCalledTimes(1);
        advance(1);        // now at 15 s
        el.hass = hass;
        await flush();
        // a throttle stuck closed would still read 1 here
        expect(hass.callApi).toHaveBeenCalledTimes(2);
    });

    it('refresh_interval config sets the window', async () => {
        const el = timelineCard({ refresh_interval: 5 });
        const hass = spyHass([cannedEvent()]);
        el.hass = hass;
        await flush();
        expect(hass.callApi).toHaveBeenCalledTimes(1);
        advance(4_000);   // inside 5 s
        el.hass = hass;
        await flush();
        expect(hass.callApi).toHaveBeenCalledTimes(1);
        advance(1_000);   // now at 5 s
        el.hass = hass;
        await flush();
        expect(hass.callApi).toHaveBeenCalledTimes(2);
    });

    it('refresh_interval below the floor (0.2) behaves as 1 s', async () => {
        const el = timelineCard({ refresh_interval: 0.2 });
        const hass = spyHass([cannedEvent()]);
        el.hass = hass;
        await flush();
        expect(hass.callApi).toHaveBeenCalledTimes(1);
        advance(999);     // 0.2 s configured, but floor is 1 s -> still gated
        el.hass = hass;
        await flush();
        expect(hass.callApi).toHaveBeenCalledTimes(1);
        advance(1);       // 1 s
        el.hass = hass;
        await flush();
        expect(hass.callApi).toHaveBeenCalledTimes(2);
    });

    it('the gate is per instance: two cards each fetch once inside the window', async () => {
        const a = timelineCard();
        const b = timelineCard();
        const hass = spyHass([cannedEvent()]);
        a.hass = hass;
        b.hass = hass;
        await flush();
        // one request per instance; cross-card coalescing is out of scope
        expect(hass.callApi).toHaveBeenCalledTimes(2);
    });
});
