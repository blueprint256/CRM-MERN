import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Alert from '../components/common/Alert';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();
      const response = await api.get(`/projects/calendar?month=${month}&year=${year}`);
      setEvents(response.data.events);
    } catch (err) {
      setError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Get the day of week (0=Sunday, 1=Monday, etc.)
    let firstDayOfWeek = firstDay.getDay();
    // Convert to Monday-first format (0=Monday, 6=Sunday)
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const days = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const getDateKey = (day) => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const isToday = (day) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const days = getDaysInMonth(currentDate);

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          <i className="bi bi-calendar3 me-2"></i>
          Calendar
        </h1>
        <Link to="/create-project" className="btn btn-primary">
          <i className="bi bi-plus-circle me-2"></i>
          New Project
        </Link>
      </div>

      {error && <Alert type="danger" message={error} onClose={() => setError('')} />}

      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <button className="btn btn-outline-primary" onClick={prevMonth}>
              <i className="bi bi-chevron-left"></i>
            </button>
            <div>
              <h4 className="mb-0">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h4>
            </div>
            <div>
              <button className="btn btn-outline-secondary me-2" onClick={goToToday}>
                Today
              </button>
              <button className="btn btn-outline-primary" onClick={nextMonth}>
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered mb-0">
                <thead className="table-light">
                  <tr>
                    {dayNames.map((day) => (
                      <th key={day} className="text-center" style={{ width: '14.28%' }}>
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIndex) => (
                    <tr key={weekIndex}>
                      {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                        const dateKey = day ? getDateKey(day) : null;
                        const dayEvents = dateKey ? events[dateKey] || [] : [];

                        return (
                          <td
                            key={dayIndex}
                            className={`calendar-day ${!day ? 'empty' : ''} ${day && isToday(day) ? 'today' : ''}`}
                            style={{ verticalAlign: 'top' }}
                          >
                            {day && (
                              <>
                                <div className={`fw-bold mb-2 ${isToday(day) ? 'text-primary' : ''}`}>
                                  {day}
                                </div>
                                <div>
                                  {dayEvents.slice(0, 3).map((event) => (
                                    <Link
                                      key={event.id}
                                      to={`/project/${event.id}`}
                                      className="calendar-event d-block text-decoration-none"
                                      title={event.name}
                                    >
                                      {event.name.length > 15
                                        ? event.name.substring(0, 15) + '...'
                                        : event.name}
                                    </Link>
                                  ))}
                                  {dayEvents.length > 3 && (
                                    <small className="text-muted">
                                      +{dayEvents.length - 3} more
                                    </small>
                                  )}
                                </div>
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
