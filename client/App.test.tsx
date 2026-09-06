// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { mapKeys } from './queries/map';

const sampleMap = {
  map: {
    maxNeighborDistance: 1500,
    nodes: [
      { x: 1000, y: 1000, code: 10001000, directions: ['North'] },
      { x: 1800, y: 1000, code: 10201000, directions: ['South'], name: 'READY' },
    ],
  },
};

function jsonResponse(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  } as Response;
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
  return queryClient;
}

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads the map and exposes its core editing controls', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(sampleMap)));
    renderApp();

    expect(await screen.findByRole('heading', { name: 'Navigation network' })).toBeInTheDocument();
    expect(screen.getByLabelText('Map summary')).toHaveTextContent('2 nodes');
    expect(screen.getByRole('button', { name: 'Add node' })).toBeEnabled();
    expect(screen.getByRole('img', { name: /2 nodes and 2 directed connections/ })).toBeInTheDocument();
  });

  it('shows a load error and can retry the query', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: 'Service unavailable.' }, false))
      .mockResolvedValueOnce(jsonResponse(sampleMap));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByRole('heading', { name: 'We couldn’t open the map' })).toBeInTheDocument();
    expect(screen.getByText('Service unavailable.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Navigation network' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('selects a node and edits its draft properties', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(sampleMap)));
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('button', { name: /READY QR 10201000/ }));
    const nameInput = screen.getByLabelText(/Name optional/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'STAGING');

    expect(screen.getByRole('heading', { name: 'STAGING' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save map' })).toBeEnabled();
  });

  it('prevents saving a duplicate QR code', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(sampleMap)));
    const user = userEvent.setup();
    renderApp();

    await user.click(await screen.findByRole('button', { name: /READY QR 10201000/ }));
    fireEvent.change(screen.getByLabelText('QR code'), { target: { value: '10001000' } });

    expect(screen.getByText('This QR code is already in use.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save map' })).toBeDisabled();
  });

  it('can add and remove a node without leaving the draft dirty', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(sampleMap)));
    const user = userEvent.setup();
    renderApp();

    await screen.findByRole('heading', { name: 'Navigation network' });
    await user.click(screen.getByRole('button', { name: 'Add node' }));
    expect(screen.getByLabelText('Map summary')).toHaveTextContent('3 nodes');

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByLabelText('Map summary')).toHaveTextContent('2 nodes');
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled();
  });

  it('updates zoom and rotation through the bonus controls', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(sampleMap)));
    const user = userEvent.setup();
    renderApp();

    await screen.findByRole('heading', { name: 'Navigation network' });
    await user.click(screen.getByRole('button', { name: 'Zoom in' }));
    await user.click(screen.getByRole('button', { name: 'Rotate right' }));

    expect(screen.getByText('120%')).toBeInTheDocument();
    expect(screen.getByText('90°')).toBeInTheDocument();
  });

  it('edits map settings and saves through the API', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(sampleMap))
      .mockImplementationOnce(async (_url: string, options: RequestInit) =>
        jsonResponse(JSON.parse(String(options.body))),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    const queryClient = renderApp();

    const distance = await screen.findByLabelText(/Maximum neighbor distance/i);
    fireEvent.change(distance, { target: { value: '2200' } });
    await user.click(screen.getByRole('button', { name: 'Save map' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'PUT' });
    expect(await screen.findByText('Map saved to the server.')).toBeInTheDocument();
    expect(queryClient.getQueryData<typeof sampleMap>(mapKeys.detail())?.map.maxNeighborDistance).toBe(2200);
  });

  it('keeps the draft available when a save fails', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(sampleMap))
      .mockResolvedValueOnce(jsonResponse({ error: 'Could not persist the map.' }, false));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderApp();

    const distance = await screen.findByLabelText(/Maximum neighbor distance/i);
    fireEvent.change(distance, { target: { value: '2200' } });
    await user.click(screen.getByRole('button', { name: 'Save map' }));

    expect(await screen.findByText('Could not persist the map.')).toBeInTheDocument();
    expect(distance).toHaveValue(2200);
    expect(screen.getByRole('button', { name: 'Save map' })).toBeEnabled();
  });
});
