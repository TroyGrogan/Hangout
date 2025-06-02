import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axiosInstance from '../../services/axios';
import EventEdit from './EventEdit';

jest.mock('../../services/axios');

describe('EventEdit Component', () => {
    const mockNavigate = jest.fn();
    const mockUseParams = jest.fn(() => ({ id: '1' }));

    jest.mock('react-router-dom', () => ({
        ...jest.requireActual('react-router-dom'),
        useNavigate: () => mockNavigate,
        useParams: mockUseParams,
    }));

    const mockEventData = {
        name: 'Test Event',
        description: 'Test Description',
        location_name: 'Test Location',
        start_time: '2023-10-01T10:00:00Z',
        end_time: '2023-10-01T12:00:00Z',
        is_recurring: false,
        price: 20.0,
        max_attendees: 50,
        category: '1',
        latitude: 40.7128,
        longitude: -74.006,
        image_url: 'https://example.com/image.jpg',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders loading spinner initially', () => {
        render(
            <MemoryRouter>
                <EventEdit />
            </MemoryRouter>
        );
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    test('fetches and displays event data', async () => {
        axiosInstance.get.mockResolvedValueOnce({ data: mockEventData });

        render(
            <MemoryRouter>
                <EventEdit />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue(mockEventData.name)).toBeInTheDocument();
            expect(screen.getByDisplayValue(mockEventData.description)).toBeInTheDocument();
            expect(screen.getByDisplayValue(mockEventData.location_name)).toBeInTheDocument();
            expect(screen.getByDisplayValue('2023-10-01T10:00')).toBeInTheDocument();
            expect(screen.getByDisplayValue('2023-10-01T12:00')).toBeInTheDocument();
            expect(screen.getByDisplayValue(mockEventData.price.toString())).toBeInTheDocument();
            expect(screen.getByDisplayValue(mockEventData.max_attendees.toString())).toBeInTheDocument();
        });
    });

    test('handles form submission successfully', async () => {
        axiosInstance.get.mockResolvedValueOnce({ data: mockEventData });
        axiosInstance.patch.mockResolvedValueOnce({ data: { id: '1' } });

        render(
            <MemoryRouter initialEntries={['/events/1']}>
                <Routes>
                    <Route path="/events/:id" element={<EventEdit />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue(mockEventData.name)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByLabelText(/event name/i), {
            target: { value: 'Updated Event Name' },
        });

        fireEvent.click(screen.getByText(/update event/i));

        await waitFor(() => {
            expect(axiosInstance.patch).toHaveBeenCalledWith(
                '/events/1/',
                expect.any(FormData),
                expect.objectContaining({
                    headers: { 'Content-Type': 'multipart/form-data' },
                })
            );
            expect(mockNavigate).toHaveBeenCalledWith('/events/1');
        });
    });

    test('displays error message on fetch failure', async () => {
        axiosInstance.get.mockRejectedValueOnce(new Error('Fetch error'));

        render(
            <MemoryRouter>
                <EventEdit />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/failed to load event data/i)).toBeInTheDocument();
        });
    });

    test('displays error message on submission failure', async () => {
        axiosInstance.get.mockResolvedValueOnce({ data: mockEventData });
        axiosInstance.patch.mockRejectedValueOnce({
            response: { data: { error: 'Submission error' } },
        });

        render(
            <MemoryRouter>
                <EventEdit />
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByDisplayValue(mockEventData.name)).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText(/update event/i));

        await waitFor(() => {
            expect(screen.getByText(/submission error/i)).toBeInTheDocument();
        });
    });
});