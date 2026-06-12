# GRAIL email.parser - RFC 5322-shaped parsing: folded headers, blank
# line, body; multipart bodies split on the Content-Type boundary and
# parsed recursively.  Deviations from CPython, kept deliberately
# small for V1: no policies, no header-defect tracking, no streaming
# feedparser (the whole text is parsed at once), \r\n normalized
# to \n.

from email.message import Message

__all__ = ["Parser", "BytesParser"]


class Parser:
    def parsestr(self, text, headersonly=False):
        return _parse_message(text.replace("\r\n", "\n"), headersonly)

    def parse(self, fp, headersonly=False):
        return self.parsestr(fp.read(), headersonly)


class BytesParser:
    def parsebytes(self, data, headersonly=False):
        return Parser().parsestr(data.decode("utf-8"), headersonly)

    def parse(self, fp, headersonly=False):
        return self.parsebytes(fp.read(), headersonly)


def _parse_message(text, headersonly=False):
    msg = Message()
    lines = text.split("\n")
    n = len(lines)
    i = 0
    current_name = None
    current_value = None
    while i < n:
        line = lines[i]
        if line == "":
            i = i + 1
            break
        first = line[0]
        if (first == " " or first == "\t") and current_name is not None:
            # Folded continuation of the previous header.
            current_value = current_value + " " + line.strip()
        else:
            if current_name is not None:
                msg[current_name] = current_value
            colon = line.find(":")
            if colon < 0:
                # Not a header - treat this line as the start of the
                # body (tolerant parse, like CPython's defect handling).
                if current_name is not None:
                    msg[current_name] = current_value
                    current_name = None
                break
            current_name = line[:colon]
            current_value = line[colon + 1:].strip()
        i = i + 1
    if current_name is not None:
        msg[current_name] = current_value
    if headersonly:
        msg.set_payload("\n".join(lines[i:]))
        return msg
    body = "\n".join(lines[i:])
    boundary = None
    if msg.get_content_maintype() == "multipart":
        boundary = msg.get_boundary()
    if boundary is None:
        msg.set_payload(body)
        return msg
    _parse_multipart(msg, body, boundary)
    return msg


def _parse_multipart(msg, body, boundary):
    marker = "--" + boundary
    closer = marker + "--"
    lines = body.split("\n")
    sections = []
    current = []
    state = "preamble"
    preamble_lines = []
    epilogue_lines = []
    for line in lines:
        stripped = line.rstrip()
        if stripped == closer and state == "parts":
            sections.append(current)
            current = []
            state = "epilogue"
        elif stripped == marker:
            if state == "preamble":
                state = "parts"
            elif state == "parts":
                sections.append(current)
                current = []
        else:
            if state == "preamble":
                preamble_lines.append(line)
            elif state == "parts":
                current.append(line)
            else:
                epilogue_lines.append(line)
    if state == "parts" and current:
        # Unterminated multipart - tolerate it.
        sections.append(current)
    if preamble_lines and "\n".join(preamble_lines).strip() != "":
        msg.preamble = "\n".join(preamble_lines)
    if epilogue_lines and "\n".join(epilogue_lines).strip() != "":
        msg.epilogue = "\n".join(epilogue_lines)
    parts = []
    for section in sections:
        parts.append(_parse_message("\n".join(section)))
    msg.set_payload(parts)
    return None
