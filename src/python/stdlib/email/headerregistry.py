# GRAIL minimal email.headerregistry.
#
# The real module builds structured header classes on top of
# email._header_value_parser (~3300 lines of RFC 5322 grammar).
# Django imports ``Address`` and ``parser`` at module level
# (django.core.mail.message) but only exercises them when actually
# sending mail with non-ASCII addresses.  Address is a faithful,
# simple value object; the parser hook raises at call time.


class _ParserStub:
    def __getattr__(self, name):
        raise NotImplementedError(
            "email.headerregistry.parser (RFC 5322 grammar) is not available in Grail")


parser = _ParserStub()


class Address:
    def __init__(self, display_name="", username="", domain="", addr_spec=None):
        if addr_spec is not None:
            if username or domain:
                raise TypeError("addrspec specified when username and/or "
                                "domain also specified")
            username, _, domain = addr_spec.rpartition("@")
        self._display_name = display_name
        self._username = username
        self._domain = domain

    @property
    def display_name(self):
        return self._display_name

    @property
    def username(self):
        return self._username

    @property
    def domain(self):
        return self._domain

    @property
    def addr_spec(self):
        if self._username and self._domain:
            return self._username + "@" + self._domain
        return self._username or "<>"

    def __repr__(self):
        return "%s(display_name=%r, username=%r, domain=%r)" % (
            self.__class__.__name__, self._display_name,
            self._username, self._domain)

    def __str__(self):
        addr = self.addr_spec
        if self._display_name:
            return '%s <%s>' % (self._display_name, addr)
        return addr

    def __eq__(self, other):
        if not isinstance(other, Address):
            return NotImplemented
        return (self._display_name == other._display_name and
                self._username == other._username and
                self._domain == other._domain)


class Group:
    def __init__(self, display_name=None, addresses=None):
        self._display_name = display_name
        self._addresses = tuple(addresses) if addresses else ()

    @property
    def display_name(self):
        return self._display_name

    @property
    def addresses(self):
        return self._addresses
