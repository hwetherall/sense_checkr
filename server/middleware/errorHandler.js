const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error(`Error: ${err.message}`);
  console.error(err.stack);

  // Default error status and message
  let status = err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    status = 400;
    message = 'Invalid request data';
  } else if (err.name === 'UnauthorizedError') {
    status = 401;
    message = 'Unauthorized access';
  } else if (err.name === 'RateLimitError') {
    status = 429;
    message = 'Too many requests';
  } else if (err.isAxiosError) {
    // Handle OpenRouter API errors
    if (err.response) {
      status = err.response.status;
      message = err.response.data?.error?.message || 'External API error';
    } else if (err.request) {
      status = 503;
      message = 'External service unavailable';
    }
  }

  // Send error response
  res.status(status).json({
    error: {
      message,
      status,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = errorHandler; 