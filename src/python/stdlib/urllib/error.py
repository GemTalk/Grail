# Grail urllib.error — URLError + HTTPError for the minimal
# urllib.request.urlopen.
#
# CPython's HTTPError multiple-inherits (URLError, http.client
# addinfourl response mixin); Grail has no multiple inheritance, so
# HTTPError subclasses URLError alone and carries the file-like
# response surface (read/headers/getcode) directly.


class URLError(OSError):
    def __init__(self, reason, filename=None):
        self.args = (reason,)
        self.reason = reason
        if filename is not None:
            self.filename = filename

    def __str__(self):
        return '<urlopen error %s>' % (self.reason,)


class HTTPError(URLError):
    def __init__(self, url, code, msg, hdrs, fp):
        self.code = code
        self.msg = msg
        self.hdrs = hdrs
        self.fp = fp
        self.filename = url
        self.url = url
        self.args = (url, code, msg, hdrs, fp)
        self.reason = msg
        self._body = None

    def __str__(self):
        return 'HTTP Error %s: %s' % (self.code, self.msg)

    @property
    def headers(self):
        return self.hdrs

    def read(self, amt=None):
        if self.fp is None:
            return b''
        return self.fp.read(amt)

    def getcode(self):
        return self.code

    def geturl(self):
        return self.url

    def info(self):
        return self.hdrs


class ContentTooShortError(URLError):
    def __init__(self, message, content):
        URLError.__init__(self, message)
        self.content = content
