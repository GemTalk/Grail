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

    def close(self):
        """Close the underlying response.

        CPython's HTTPError IS a response -- it subclasses addinfourl -- so
        the file protocol comes with it, and callers use the error exactly
        as they would a successful response: ``data = f.read(); f.close()``
        (test_urllib2_localnet's test_404).  Grail's carries read/info/
        geturl but stopped short of close, so that ordinary pairing raised
        AttributeError on the second line, after the read had worked.

        The fp is CLOSED, not dropped: CPython leaves it in place, so a
        read after close raises ValueError from the file itself rather
        than quietly answering b''.  Setting self.fp to None instead --
        the first shape this took -- turns that error into empty data,
        which is the kind of divergence a caller never notices until it
        matters.

        Idempotent, and safe when there is no fp: an error constructed
        without a body (fp=None) still answers close()."""
        if self.fp is not None:
            self.fp.close()

    def __enter__(self):
        """A response is a context manager in CPython, and an HTTPError is
        a response -- ``with urlopen(...) as f'' has to keep working when
        the server answers 4xx and the caller catches the error."""
        return self

    def __exit__(self, exc_type, exc_value, tb):
        self.close()
        return False


class ContentTooShortError(URLError):
    def __init__(self, message, content):
        URLError.__init__(self, message)
        self.content = content
