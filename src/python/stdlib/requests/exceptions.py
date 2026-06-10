# Grail requests shim — exception hierarchy (single-inheritance only;
# upstream RequestException(IOError) keeps a richer mixin chain).


class RequestException(IOError):
    def __init__(self, *args, **kwargs):
        self.response = kwargs.get('response')
        self.request = kwargs.get('request')
        IOError.__init__(self, *args)


class ConnectionError(RequestException):
    pass


class HTTPError(RequestException):
    pass


class Timeout(RequestException):
    pass


class ConnectTimeout(Timeout):
    pass


class ReadTimeout(Timeout):
    pass


class TooManyRedirects(RequestException):
    pass


class InvalidURL(RequestException):
    pass


class MissingSchema(RequestException):
    pass


class JSONDecodeError(RequestException):
    pass
