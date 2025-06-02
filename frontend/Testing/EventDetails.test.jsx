import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axiosInstance from '../src/services/axios';
import { useAuth } from '../src/contexts/AuthContext';
import EventDetails from '../src/Components/events/EventDetails';
import { getCategoryById } from '../src/utils/categoryUtils';

jest.mock('../../services/axios');
jest.mock('../../contexts/AuthContext');
jest.mock('../../utils/categoryUtils');

describe('EventDetails Component', () => {
    const mockUser = { user_id: 1, username: 'testuser' };
    const mockEvent = {
        id: 1,
        name: 'Test Event',
        host: { username: 'hostuser' },
        start_time: '2023-12-31T23:59:59Z',
        location_name: 'Test Location',
        category: 1,
        max_attendees: 100,
        price: 10.0,
        description: 'Test Description',
        image_url: 'https://example.com/image.jpg',
        latitude: 40.7128,
        longitude: -74.006,
    };
    const mockAttendees = [
        { id: 2, username: 'attendee1', rsvp_status: 'going' },
        { id: 3, username: 'attendee2', rsvp_status: 'maybe' },
        { id: 4, username: 'attendee3', rsvp_status: 'not_going' },
    ];
    const mockCategory = { id: 1, name: 'Test Category' };

    beforeEach(() => {
        useAuth.mockReturnValue({ user: mockUser });
        getCategoryById.mockReturnValue(mockCategory);

        axiosInstance.get.mockImplementation((url) => {
            if (url === '/users/friends/') {
                return Promise.resolve({ data: [] });
            }
            if (url === '/users/friend-requests/') {
                return Promise.resolve({ data: { outgoing: [] } });
            }
            if (url === `/events/${mockEvent.id}/`) {
                return Promise.resolve({ data: mockEvent });
            }
            if (url === '/event-attendees/') {
                return Promise.resolve({ data: mockAttendees });
            }
            return Promise.reject(new Error('Not Found'));
        });

        axiosInstance.post.mockResolvedValue({});
        axiosInstance.delete.mockResolvedValue({});
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders loading state initially', () => {
        render(
            <MemoryRouter initialEntries={[`/events/${mockEvent.id}`]}>
                <Routes>
                    <Route path="/events/:id" element={<EventDetails />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('renders event details after loading', async () => {
        render(
            <MemoryRouter initialEntries={[`/events/${mockEvent.id}`]}>
                <Routes>
                    <Route path="/events/:id" element={<EventDetails />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText(mockEvent.name)).toBeInTheDocument());
        expect(screen.getByText(`Hosted by ${mockEvent.host.username}`)).toBeInTheDocument();
        expect(screen.getByText(new Date(mockEvent.start_time).toLocaleString())).toBeInTheDocument();
        expect(screen.getByText(mockEvent.location_name)).toBeInTheDocument();
        expect(screen.getByText(mockCategory.name)).toBeInTheDocument();
        expect(screen.getByText(`${mockAttendees.filter(a => a.rsvp_status === 'going').length} attending`)).toBeInTheDocument();
        expect(screen.getByText(`$${mockEvent.price.toFixed(2)}`)).toBeInTheDocument();
        expect(screen.getByText(mockEvent.description)).toBeInTheDocument();
    });

    it('handles RSVP actions correctly', async () => {
        render(
            <MemoryRouter initialEntries={[`/events/${mockEvent.id}`]}>
                <Routes>
                    <Route path="/events/:id" element={<EventDetails />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText(mockEvent.name)).toBeInTheDocument());

        const goingButton = screen.getByText(/going/i);
        fireEvent.click(goingButton);

        await waitFor(() => expect(axiosInstance.post).toHaveBeenCalledWith('/event-attendees/', {
            event: mockEvent.id,
            rsvp_status: 'going',
        }));
    });

    it('renders attendees grouped by RSVP status', async () => {
        render(
            <MemoryRouter initialEntries={[`/events/${mockEvent.id}`]}>
                <Routes>
                    <Route path="/events/:id" element={<EventDetails />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText(mockEvent.name)).toBeInTheDocument());

        expect(screen.getByText(/going/i)).toBeInTheDocument();
        expect(screen.getByText(/maybe/i)).toBeInTheDocument();
        expect(screen.getByText(/not going/i)).toBeInTheDocument();
    });

    it('renders error state if event fails to load', async () => {
        axiosInstance.get.mockRejectedValueOnce(new Error('Failed to load'));

        render(
            <MemoryRouter initialEntries={[`/events/${mockEvent.id}`]}>
                <Routes>
                    <Route path="/events/:id" element={<EventDetails />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => expect(screen.getByText(/failed to load event details/i)).toBeInTheDocument());
    });
});