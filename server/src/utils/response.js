function success(res, data = null, message = 'Success', statusCode = 200, meta = null) {
  const responseBody = {
    success: true,
    message,
    data
  };
  if (meta) {
    responseBody.meta = meta;
  }
  return res.status(statusCode).json(responseBody);
}

function error(res, message = 'An error occurred', statusCode = 500, errors = null) {
  const responseBody = {
    success: false,
    message
  };
  if (errors) {
    responseBody.errors = errors;
  }
  return res.status(statusCode).json(responseBody);
}

module.exports = {
  success,
  error
};
