/**
 * Used for creating lambda http responses.
 * When you call .dump(), will return a
 * lambda 'returnable' json string that will translate
 * into an http response recognizable by our services
 *
 * @class HttpResponse
 */
class HttpResponse {
  statusCode: number = 500;
  message: string = "";
  data: object = {};

  /**
   *Creates an instance of HttpResponse.
   * @param {number} [statusCode=200]
   * @param {string} [message=""]
   * @param {object} [data={}]
   * @memberof HttpResponse
   */
  constructor(
    statusCode: number = 200,
    message: string = "",
    data: object = {}
  ) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  /**
   * Dumps a JSON string
   *
   * @returns
   * @memberof HttpResponse
   */
  dump() {
    return JSON.stringify({
      statusCode: this.statusCode,
      body: {
        message: this.message,
        data: this.data
      }
    });
  }
}

export { HttpResponse };
