import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axiosInstance from '../src/services/axios';
import EventCreate from '../src/Components/events/EventCreate';
import { HARDCODED_MAIN_CATEGORIES } from '../src/utils/categoryUtils';

jest.mock('../../services/axios');

describe('EventCreate Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders the form with all fields', () => {
        render(
            <MemoryRouter>
                <EventCreate />
            </MemoryRouter>
        );

        expect(screen.getByText('Create New Event')).toBeInTheDocument();
        expect(screen.getByLabelText('Event Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Description')).toBeInTheDocument();
        expect(screen.getByLabelText('Life Category')).toBeInTheDocument();
        expect(screen.getByLabelText('Start Time')).toBeInTheDocument();
        expect(screen.getByLabelText('End Time')).toBeInTheDocument();
        expect(screen.getByLabelText('Location Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Price ($)')).toBeInTheDocument();
        expect(screen.getByLabelText('Maximum Attendees')).toBeInTheDocument();
        expect(screen.getByLabelText('This is a recurring event')).toBeInTheDocument();
        expect(screen.getByLabelText('Event Image')).toBeInTheDocument();
    });

    test('displays error message when form submission fails', async () => {
        axiosInstance.post.mockRejectedValueOnce({
            response: { data: { message: 'Failed to create event' } },
        });

        render(
            <MemoryRouter>
                <EventCreate />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Event Name'), { target: { value: 'Test Event' } });
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test Description' } });
        fireEvent.change(screen.getByLabelText('Life Category'), { target: { value: HARDCODED_MAIN_CATEGORIES[0].id } });
        fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '2023-12-01T10:00' } });
        fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '2023-12-01T12:00' } });
        fireEvent.change(screen.getByLabelText('Location Name'), { target: { value: 'Test Location' } });

        fireEvent.click(screen.getByText('Create Event'));

        await waitFor(() => {
            expect(screen.getByText('Failed to create event')).toBeInTheDocument();
        });
    });

    test('submits the form successfully', async () => {
        axiosInstance.post.mockResolvedValueOnce({
            data: { id: 1 },
        });

        const mockNavigate = jest.fn();
        jest.mock('react-router-dom', () => ({
            ...jest.requireActual('react-router-dom'),
            useNavigate: () => mockNavigate,
        }));

        render(
            <MemoryRouter>
                <EventCreate />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Event Name'), { target: { value: 'Test Event' } });
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test Description' } });
        fireEvent.change(screen.getByLabelText('Life Category'), { target: { value: HARDCODED_MAIN_CATEGORIES[0].id } });
        fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '2023-12-01T10:00' } });
        fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '2023-12-01T12:00' } });
        fireEvent.change(screen.getByLabelText('Location Name'), { target: { value: 'Test Location' } });

        fireEvent.click(screen.getByText('Create Event'));

        await waitFor(() => {
            expect(mockNavigate).toHaveBeenCalledWith('/events/1');
        });
    });

    test('displays loading state during form submission', async () => {
        axiosInstance.post.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ data: { id: 1 } }), 1000)));

        render(
            <MemoryRouter>
                <EventCreate />
            </MemoryRouter>
        );

        fireEvent.change(screen.getByLabelText('Event Name'), { target: { value: 'Test Event' } });
        fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test Description' } });
        fireEvent.change(screen.getByLabelText('Life Category'), { target: { value: HARDCODED_MAIN_CATEGORIES[0].id } });
        fireEvent.change(screen.getByLabelText('Start Time'), { target: { value: '2023-12-01T10:00' } });
        fireEvent.change(screen.getByLabelText('End Time'), { target: { value: '2023-12-01T12:00' } });
        fireEvent.change(screen.getByLabelText('Location Name'), { target: { value: 'Test Location' } });

        fireEvent.click(screen.getByText('Create Event'));

        expect(screen.getByText('Creating Event...')).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByText('Creating Event...')).not.toBeInTheDocument();
        });
    });
});