import React from 'react';

const Pagination = ({ pagination, onPageChange }) => {
  const { page, pages, total } = pagination;

  if (pages <= 1) return null;

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(pages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <li key={i} className={`page-item ${page === i ? 'active' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(i)}
          >
            {i}
          </button>
        </li>
      );
    }

    return pageNumbers;
  };

  return (
    <nav aria-label="Page navigation">
      <div className="d-flex justify-content-between align-items-center">
        <small className="text-muted">
          Showing page {page} of {pages} ({total} items)
        </small>
        <ul className="pagination mb-0">
          <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              Previous
            </button>
          </li>
          {renderPageNumbers()}
          <li className={`page-item ${page === pages ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => onPageChange(page + 1)}
              disabled={page === pages}
            >
              Next
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Pagination;
