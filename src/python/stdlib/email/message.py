# GRAIL email.message - the Message class: an ordered, case-
# insensitive multi-header mapping plus a payload that is either a
# string (simple messages) or a list of sub-Messages (multipart).
# Deviations from CPython, kept deliberately small for V1:
#   * no Header objects / RFC 2047 encoded-word decoding - header
#     values are plain strings;
#   * get_payload(decode=True) handles base64 and the identity
#     transfer encodings (7bit/8bit/binary), not quoted-printable;
#   * as_string() does no line folding or charset negotiation;
#   * policies are not supported.

__all__ = ["Message", "EmailMessage"]


def _split_params(value):
    """Split 'text/plain; charset=utf-8; name="x"' into the base value
    and a list of (key, value) parameter pairs."""
    parts = value.split(";")
    base = parts[0].strip()
    params = []
    i = 1
    while i < len(parts):
        chunk = parts[i].strip()
        if chunk != "":
            eq = chunk.find("=")
            if eq < 0:
                params.append((chunk.lower(), ""))
            else:
                key = chunk[:eq].strip().lower()
                val = chunk[eq + 1:].strip()
                if len(val) >= 2 and val.startswith('"') and val.endswith('"'):
                    val = val[1:-1]
                params.append((key, val))
        i = i + 1
    return base, params


class Message:
    def __init__(self):
        self._headers = []
        self._payload = None
        self.preamble = None
        self.epilogue = None
        self._default_type = "text/plain"

    # -- mapping interface (case-insensitive; duplicates preserved) --

    def __len__(self):
        return len(self._headers)

    def __contains__(self, name):
        return self.get(name) is not None

    def __getitem__(self, name):
        """The FIRST value for name, or None (email contract)."""
        return self.get(name)

    def __setitem__(self, name, val):
        """APPEND a header - email semantics, unlike dict stores."""
        self._headers.append((name, val))

    def __delitem__(self, name):
        key = name.lower()
        kept = []
        for pair in self._headers:
            if pair[0].lower() != key:
                kept.append(pair)
        self._headers = kept

    def get(self, name, failobj=None):
        key = name.lower()
        for pair in self._headers:
            if pair[0].lower() == key:
                return pair[1]
        return failobj

    def get_all(self, name, failobj=None):
        key = name.lower()
        out = []
        for pair in self._headers:
            if pair[0].lower() == key:
                out.append(pair[1])
        if len(out) == 0:
            return failobj
        return out

    def keys(self):
        out = []
        for pair in self._headers:
            out.append(pair[0])
        return out

    def values(self):
        out = []
        for pair in self._headers:
            out.append(pair[1])
        return out

    def items(self):
        return list(self._headers)

    def add_header(self, name, value, **params):
        parts = []
        if value is not None:
            parts.append(value)
        for key in params:
            pv = params[key]
            attr = key.replace("_", "-")
            if pv is None:
                parts.append(attr)
            else:
                parts.append(attr + '="' + str(pv) + '"')
        self._headers.append((name, "; ".join(parts)))

    def replace_header(self, name, value):
        key = name.lower()
        i = 0
        n = len(self._headers)
        while i < n:
            if self._headers[i][0].lower() == key:
                self._headers[i] = (self._headers[i][0], value)
                return None
            i = i + 1
        raise KeyError(name)

    # -- content type --

    def get_content_type(self):
        value = self.get("content-type")
        if value is None:
            return self._default_type
        base, params = _split_params(value)
        base = base.lower()
        if base.find("/") < 0:
            return self._default_type
        return base

    def get_content_maintype(self):
        return self.get_content_type().split("/")[0]

    def get_content_subtype(self):
        return self.get_content_type().split("/")[1]

    def get_default_type(self):
        return self._default_type

    def set_default_type(self, ctype):
        self._default_type = ctype

    def set_type(self, ctype):
        value = self.get("content-type")
        if value is None:
            self._headers.append(("Content-Type", ctype))
            return None
        base, params = _split_params(value)
        out = ctype
        for pair in params:
            if pair[1] == "":
                out = out + "; " + pair[0]
            else:
                out = out + "; " + pair[0] + '="' + pair[1] + '"'
        self.replace_header("content-type", out)

    def get_param(self, param, failobj=None, header="content-type"):
        value = self.get(header)
        if value is None:
            return failobj
        base, params = _split_params(value)
        want = param.lower()
        for pair in params:
            if pair[0] == want:
                return pair[1]
        return failobj

    def get_boundary(self, failobj=None):
        return self.get_param("boundary", failobj)

    def get_filename(self, failobj=None):
        name = self.get_param("filename", None, "content-disposition")
        if name is None:
            name = self.get_param("name", None, "content-type")
        if name is None:
            return failobj
        return name

    def get_content_charset(self, failobj=None):
        charset = self.get_param("charset", None)
        if charset is None:
            return failobj
        return charset.lower()

    # -- payload --

    def is_multipart(self):
        return isinstance(self._payload, list)

    def get_payload(self, i=None, decode=False):
        if i is not None:
            return self._payload[i]
        if decode:
            if self.is_multipart():
                return None
            cte = self.get("content-transfer-encoding", "7bit").lower()
            text = self._payload
            if text is None:
                text = ""
            if cte == "base64":
                import base64
                return base64.b64decode(text)
            return text.encode("utf-8")
        return self._payload

    def set_payload(self, payload, charset=None):
        self._payload = payload
        if charset is not None:
            self.set_param_charset(charset)

    def set_param_charset(self, charset):
        value = self.get("content-type")
        if value is None:
            self._headers.append(("Content-Type",
                                  'text/plain; charset="' + charset + '"'))
        else:
            base, params = _split_params(value)
            out = base
            replaced = False
            for pair in params:
                key = pair[0]
                pv = pair[1]
                if key == "charset":
                    pv = charset
                    replaced = True
                out = out + "; " + key + '="' + pv + '"'
            if not replaced:
                out = out + '; charset="' + charset + '"'
            self.replace_header("content-type", out)

    def attach(self, submessage):
        if self._payload is None:
            self._payload = []
        if not isinstance(self._payload, list):
            raise TypeError("Attach is not valid on a message with a"
                            " non-multipart payload")
        self._payload.append(submessage)

    def walk(self):
        """Iterate this message and every nested part, depth-first."""
        out = [self]
        if self.is_multipart():
            for part in self._payload:
                for sub in part.walk():
                    out.append(sub)
        return iter(out)

    # -- serialization --

    def as_string(self):
        lines = []
        for pair in self._headers:
            lines.append(pair[0] + ": " + pair[1])
        head = "\n".join(lines)
        if self.is_multipart():
            boundary = self.get_boundary()
            if boundary is None:
                boundary = "===grail-boundary==="
            body_parts = []
            if self.preamble is not None:
                body_parts.append(self.preamble)
            for part in self._payload:
                body_parts.append("--" + boundary)
                body_parts.append(part.as_string())
            body_parts.append("--" + boundary + "--")
            if self.epilogue is not None:
                body_parts.append(self.epilogue)
            return head + "\n\n" + "\n".join(body_parts) + "\n"
        body = self._payload
        if body is None:
            body = ""
        return head + "\n\n" + body

    def __str__(self):
        return self.as_string()


class EmailMessage(Message):
    """The modern API subset: set_content/get_content for simple text
    messages."""

    def set_content(self, text, subtype="plain", charset="utf-8"):
        self._headers = [pair for pair in self._headers
                         if pair[0].lower() != "content-type"]
        self._headers.append(("Content-Type",
                              "text/" + subtype + '; charset="' + charset + '"'))
        self.set_payload(text)

    def get_content(self):
        if self.is_multipart():
            raise KeyError("multipart message has no single content")
        return self.get_payload()
