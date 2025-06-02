import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import Calendar from '../src/Components/calendar/Calendar';
import { useAuth } from '../src/contexts/AuthContext';
import { BrowserRouter } from 'react-router-dom';
import axios from 'axios';

jest.mock('axios');
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

const renderWithRouter = (ui) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>);
};

describe('Calendar component', () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      user: { id: 1, user_id: 1 }
    });

    axios.get = jest.fn().mockResolvedValue({
      data: [
        {
          id: 1,
          name: 'Event 1',
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString(),
          host: { id: 1 },
          attendees: [],
          is_user_attending: true,
        }
      ]
    });
  });

  it('renders loading message initially', async () => {
    renderWithRouter(<Calendar />);
    expect(screen.getByText(/Loading events.../i)).toBeInTheDocument();
  });

  it('renders event after fetch', async () => {
    renderWithRouter(<Calendar />);
    
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });
  });

  it('toggles between my events and all events', async () => {
    renderWithRouter(<Calendar />);
    
    await waitFor(() => {
      expect(screen.getByText('Event 1')).toBeInTheDocument();
    });

    const toggle = screen.getByRole('checkbox');
    fireEvent.click(toggle);
    expect(screen.getByText(/Showing all events/i)).toBeInTheDocument();
  });

  it('shows error message on fetch failure', async () => {
    axios.get.mockRejectedValueOnce(new Error('Failed'));
    
    renderWithRouter(<Calendar />);
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load events/i)).toBeInTheDocument();
    });
  });
});
