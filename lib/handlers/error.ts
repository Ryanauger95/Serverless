class CodeError extends Error {
  code: number;
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}
function handleError(req, res, err) {
  console.log(
    "Error in request to url: ",
    req.url,
    " with query: ",
    req.query,
    " with body:",
    req.body,
    "err: ",
    err
  );
  if (err instanceof CodeError) {
    res.status(err.code).send({ message: err.message });
  } else {
    res.status(500).send({ message: "Unknown Error Occured" });
  }
}

export { handleError, CodeError };
