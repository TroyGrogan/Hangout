import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventDashboard from '../src/Components/dashboard/EventDashboard';
import { useAuth } from '../src/contexts/AuthContext';
import axiosInstance from '../src/services/axios';

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../services/axios');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('EventDashboard', () => {
  const mockUser = { user_id: 1 };

  beforeEach(() => {
    useAuth.mockReturnValue({ user: mockUser });
  });

  it('shows loading spinner initially', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: [] });
    render(<EventDashboard />, { wrapper: MemoryRouter });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await waitFor(() => expect(axiosInstance.get).toHaveBeenCalled());
  });

  it('displays created and attending events', async () => {
    const mockEvents = [
      { id: 1, name: 'My Event', host: 1, start_time: '2025-04-17T14:00:00Z', location_name: 'Park', attendee_count: 10 },
      { id: 2, name: 'Other Event', host: 2, is_user_attending: true, start_time: '2025-04-18T14:00:00Z', location_name: 'Library' },
    ];

    axiosInstance.get.mockResolvedValueOnce({ data: mockEvents });

    render(<EventDashboard />, { wrapper: MemoryRouter });

    await screen.findByText(/Event Management Dashboard/i);

    expect(screen.getByText('My Event')).toBeInTheDocument();
    expect(screen.getByText('Other Event')).toBeInTheDocument();
  });

  it('shows empty states if no events', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: [] });

    render(<EventDashboard />, { wrapper: MemoryRouter });

    await screen.findByText(/You haven't created any events/i);
    expect(screen.getByText(/You're not attending any events/i)).toBeInTheDocument();
  });

  it('handles delete confirmation and deletes event', async () => {
    const mockEvent = { id: 1, name: 'My Event', host: 1, start_time: '2025-04-17T14:00:00Z', location_name: 'Park', attendee_count: 3 };
    axiosInstance.get.mockResolvedValueOnce({ data: [mockEvent] });
    axiosInstance.delete.mockResolvedValueOnce({});

    render(<EventDashboard />, { wrapper: MemoryRouter });

    await screen.findByText('My Event');
    const deleteBtn = screen.getByRole('button', { name: /trash/i });
    fireEvent.click(deleteBtn); 
    fireEvent.click(deleteBtn); 

    await waitFor(() => expect(axiosInstance.delete).toHaveBeenCalledWith('/events/1/'));
  });

  it('navigates to edit event', async () => {
    const mockEvent = { id: 1, name: 'My Event', host: 1, start_time: '2025-04-17T14:00:00Z', location_name: 'Park', attendee_count: 3 };
    axiosInstance.get.mockResolvedValueOnce({ data: [mockEvent] });

    render(<EventDashboard />, { wrapper: MemoryRouter });

    await screen.findByText('My Event');
    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);

    expect(mockNavigate).toHaveBeenCalledWith('/events/edit/1');
  });

  it('displays error if API call fails', async () => {
    axiosInstance.get.mockRejectedValueOnce(new Error('Failed request'));

    render(<EventDashboard />, { wrapper: MemoryRouter });

    await screen.findByText(/Failed to load your events/i);
  });
});
