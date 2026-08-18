// Black-box test harness for the LLM Vision cards.
//
// Cards are driven exactly as the Home Assistant dashboard drives them:
// document.createElement(tag), setConfig(...), then assignment of a `hass` object
// whose callApi returns canned events. That is the real public boundary the cards
// consume — no private methods are called, no internal state is read.

const DEFAULT_CAMERA = 'camera.front_door';

// One event in the shape the timeline API returns. The card fetches
// `GET llmvision/timeline/events` and reads `{ events: [ item ] }`; fetchEvents()
// then maps each item (camera_name, key_frame, start, uid, ...) to its internal
// event object. This factory produces that wire-level item.
export function cannedEvent(overrides = {}) {
    return {
        title: 'Person at the front door',
        description: 'A person is standing at the front door.',
        category: 'person',
        label: 'person',
        key_frame: '',
        camera_name: DEFAULT_CAMERA,
        start: '2026-08-18T10:15:00',
        end: '2026-08-18T10:15:05',
        uid: 'evt-0',
        ...overrides,
    };
}

// N distinct canned events (distinct titles and uids), same day so they group under
// one date header in the timeline card.
export function cannedEvents(n) {
    return Array.from({ length: n }, (_, i) =>
        cannedEvent({
            title: `Event number ${i + 1}`,
            uid: `evt-${i}`,
            start: `2026-08-18T10:${(15 - i).toString().padStart(2, '0')}:00`,
        })
    );
}

// A fake hass exposing the public boundary the cards consume:
//  - callApi('GET', 'llmvision/timeline/events?...') -> { events }
//  - callWS({ type: 'media_source/resolve_media', ... }) -> { url }  (key-frame resolve)
//  - states: entity registry, used to resolve a camera's friendly name
export function fakeHass(events = [], { states, resolvedUrl = '/resolved/key-frame.jpg' } = {}) {
    const resolvedStates = states || {
        [DEFAULT_CAMERA]: { attributes: { friendly_name: 'Front Door' } },
    };
    return {
        states: resolvedStates,
        callApi(method, path) {
            if (method === 'GET' && path.startsWith('llmvision/timeline/events')) {
                return Promise.resolve({ events });
            }
            return Promise.resolve(null);
        },
        callWS() {
            return Promise.resolve({ url: resolvedUrl });
        },
    };
}

// The render path is asynchronous: the `hass` setter starts fetchEvents() -> render()
// without returning the promise, so tests cannot await it directly. Let the queued
// microtasks and one macrotask turn settle before asserting on the DOM.
export async function flush() {
    for (let i = 0; i < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
}
