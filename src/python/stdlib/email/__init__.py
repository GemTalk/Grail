# Grail email package — minimal stub.  Real CPython email is a
# large subsystem (RFC 5322 parser / MIME / encoders / headers);
# Grail provides only enough surface for werkzeug.http to import
# and for HTTP date parsing.  See email.utils for the bulk.


def message_from_string(s):
    """Parse a string into an email.message.Message."""
    from email.parser import Parser
    return Parser().parsestr(s)


def message_from_bytes(data):
    """Parse bytes into an email.message.Message."""
    from email.parser import BytesParser
    return BytesParser().parsebytes(data)
