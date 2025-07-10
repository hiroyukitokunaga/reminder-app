import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import HomePage from './page';

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock Date to control time-based logic
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-07-01T10:00:00Z')); // Set a fixed time for consistent tests
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should display "やり残しはありません" when no unfinished todos', async () => {
    render(<HomePage />);
    await waitFor(() => {
      expect(screen.getByText('やり残しはありません')).toBeInTheDocument();
    });
  });

  it('should not display current situation todos in unfinished todos', async () => {
    const now = new Date('2025-07-01T10:00:00Z');
    const sampleSituations = [
      {
        id: "current-s",
        title: "現在の場面",
        detail: "",
        location: "",
        weather: "sunny",
        datetime: now,
        todos: [{ id: "current-t1", title: "現在のToDo", completed: false, backgroundColor: "#fff", subTodos: [], isPinned: false }],
        isPredicted: false,
      },
    ];
    localStorage.setItem('remindee_situations', JSON.stringify(sampleSituations));

    render(<HomePage />);
    await waitFor(() => {
      const unfinishedSection = screen.getByRole('heading', { name: 'やり残し' }).nextElementSibling; // Assuming the list is the next sibling
      expect(unfinishedSection).toBeInTheDocument();
      expect(within(unfinishedSection as HTMLElement).queryByText('現在のToDo')).not.toBeInTheDocument();
    });
  });

  it('should display past unfinished todos', async () => {
    const past = new Date('2025-07-01T09:00:00Z');
    const sampleSituations = [
      {
        id: "past-s",
        title: "過去の場面",
        detail: "",
        location: "",
        weather: "sunny",
        datetime: past,
        todos: [{ id: "past-t1", title: "過去のToDo", completed: false, backgroundColor: "#fff", subTodos: [], isPinned: false }],
        isPredicted: false,
      },
    ];
    localStorage.setItem('remindee_situations', JSON.stringify(sampleSituations));

    render(<HomePage />);
    await waitFor(() => {
      const unfinishedSection = screen.getByRole('heading', { name: 'やり残し' }).nextElementSibling;
      expect(within(unfinishedSection as HTMLElement).getByText('過去のToDo')).toBeInTheDocument();
    });
  });

  // Test for pin functionality (NewSituationPage)
  it('should restore only pinned todos when creating a new situation from past', async () => {
    const pastSituationWithPinned = {
      id: "past-s-pinned",
      title: "ピン留めテスト場面",
      detail: "",
      location: "",
      weather: "sunny",
      datetime: new Date('2025-06-30T10:00:00Z'),
      todos: [
        { id: "t1", title: "ピン留めToDo", completed: false, backgroundColor: "#fff", subTodos: [], isPinned: true },
        { id: "t2", title: "通常ToDo", completed: false, backgroundColor: "#fff", subTodos: [], isPinned: false },
        { id: "t3", title: "親ToDo", completed: false, backgroundColor: "#fff", subTodos: [
          { id: "st1", title: "ピン留めサブToDo", completed: false, isPinned: true },
          { id: "st2", title: "通常サブToDo", completed: false, isPinned: false },
        ], isPinned: false },
      ],
      isPredicted: false,
    };
    localStorage.setItem('reminderPastSituations', JSON.stringify([pastSituationWithPinned]));

    render(<HomePage />);
    fireEvent.click(screen.getByTestId('add-situation-button')); // Go to New Situation Page

    // Click on the past situation to restore
    await waitFor(() => {
      fireEvent.click(screen.getByText('ピン留めテスト場面'));
    });

    // Check if only pinned todos are restored
    await waitFor(() => {
      expect(screen.getByDisplayValue('ピン留めToDo')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('通常ToDo')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('ピン留めサブToDo')).toBeInTheDocument();
      expect(screen.queryByDisplayValue('通常サブToDo')).not.toBeInTheDocument();
      expect(screen.getByDisplayValue('親ToDo')).toBeInTheDocument(); // Parent should be restored if sub-todo is pinned
    });
  });
});