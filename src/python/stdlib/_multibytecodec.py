# CPython's _multibytecodec, in Python: the incremental and stream classes
# the CJK codecs in ``encodings`` are built from.  Each concrete class sets
# ``codec`` to an engine from _cjk (see _codecs_tw and friends), which owns
# the tables and the shift state; these classes own buffering.
#
# The state a getstate() answers is OPAQUE, as CPython documents it: an int
# for the encoder, a (pending bytes, int) pair for the decoder.  Its bits are
# not CPython's -- nothing may read them but setstate() on the same codec --
# and test_codecs' MixInCheckStateHandling checks exactly that round trip.


# CPython's MAXDECPENDING: an incremental decoder may hold at most this many
# bytes of an unfinished sequence between calls.  More is not buffered; it is
# a UnicodeDecodeError over the whole buffer, whatever the error policy --
# an ISO-2022 escape that never terminates reaches it.
_MAXDECPENDING = 8


def _check_pending(codec, data, pending):
    if len(pending) > _MAXDECPENDING:
        raise UnicodeDecodeError(codec.name, bytes(data), 0, len(data),
                                 'pending buffer overflow')


def _check_errors(owner, errors):
    if errors is None:
        return 'strict'
    if not isinstance(errors, str):
        raise TypeError('%s() argument 1 must be str, not %s'
                        % (type(owner).__name__, type(errors).__name__))
    return errors


def _pack_encoder_state(pending, state):
    """pending text (at most a few characters) and the engine's int state as
    one non-negative int: state in the low 32 bits, then 21 bits a character
    and the character count."""
    value = len(pending)
    for ch in pending:
        value = (value << 21) | ord(ch)
    return (value << 32) | (state or 0)


def _unpack_encoder_state(value):
    state = value & 0xFFFFFFFF
    value >>= 32
    chars = []
    while value >= (1 << 21):
        chars.append(value & 0x1FFFFF)
        value >>= 21
    count = value
    chars.reverse()
    return ''.join(chr(c) for c in chars[:count]), state


class MultibyteIncrementalEncoder:
    codec = None

    def __init__(self, errors='strict'):
        self.errors = _check_errors(self, errors)
        self._pending = ''
        self._state = self.codec.initial_state()

    def encode(self, input, final=False):
        if not isinstance(input, str):
            raise TypeError("couldn't convert the object to unicode.")
        text = self._pending + input
        out, consumed, self._state = self.codec.encode_chunk(
            text, self.errors, bool(final), self._state)
        self._pending = text[consumed:]
        if final:
            out += self.codec.encode_flush(self._state)
            self._state = self.codec.initial_state()
            self._pending = ''
        return out

    def reset(self):
        self._pending = ''
        self._state = self.codec.initial_state()

    def getstate(self):
        return _pack_encoder_state(self._pending, self.codec.state_to_int(self._state))

    def setstate(self, state):
        if not isinstance(state, int):
            raise TypeError('setstate() argument must be int, not %s'
                            % type(state).__name__)
        pending, bits = _unpack_encoder_state(state)
        self._pending = pending
        self._state = self.codec.state_from_int(bits)


class MultibyteIncrementalDecoder:
    codec = None

    def __init__(self, errors='strict'):
        self.errors = _check_errors(self, errors)
        self._pending = b''
        self._state = self.codec.initial_state()

    def decode(self, input, final=False):
        data = self._pending + bytes(input)
        text, consumed, state = self.codec.decode_chunk(
            data, self.errors, bool(final), self._state)
        pending = data[consumed:]
        _check_pending(self.codec, data, pending)
        self._state = state
        self._pending = pending
        return text

    def reset(self):
        self._pending = b''
        self._state = self.codec.initial_state()

    def getstate(self):
        return (self._pending, self.codec.state_to_int(self._state))

    def setstate(self, state):
        if not (isinstance(state, tuple) and len(state) == 2):
            raise TypeError('setstate() argument must be tuple')
        pending, bits = state
        if not isinstance(pending, bytes):
            raise TypeError('state[0] must be bytes')
        self._pending = pending
        self._state = self.codec.state_from_int(bits)


class MultibyteStreamReader:
    codec = None

    def __init__(self, stream, errors='strict'):
        self.stream = stream
        self.errors = _check_errors(self, errors)
        self._pending = b''
        self._state = self.codec.initial_state()

    def _iread(self, method, size):
        # CPython's mbstreamreader_iread: read raw bytes with ``method``, decode
        # with the pending tail, and -- for a sized read -- keep going until
        # the decode produces something or the stream ends.
        if size == 0:
            return ''
        out = []
        while True:
            reader = getattr(self.stream, method)
            raw = reader() if size is None or size < 0 else reader(size)
            if not isinstance(raw, (bytes, bytearray)):
                raise TypeError('stream function returned a non-bytes object (%s)'
                                % type(raw).__name__)
            end_of_file = len(raw) == 0
            data = self._pending + bytes(raw)
            text, consumed, state = self.codec.decode_chunk(
                data, self.errors, end_of_file, self._state)
            pending = data[consumed:]
            _check_pending(self.codec, data, pending)
            self._state = state
            self._pending = pending
            out.append(text)
            if end_of_file or size is None or size < 0 or text:
                break
        return ''.join(out)

    def read(self, sizeobj=None):
        return self._iread('read', sizeobj)

    def readline(self, sizeobj=None):
        return self._iread('readline', sizeobj)

    def readlines(self, sizehintobj=None):
        return self._iread('read', sizehintobj).splitlines(True)

    def reset(self):
        self._pending = b''
        self._state = self.codec.initial_state()


class MultibyteStreamWriter:
    codec = None

    def __init__(self, stream, errors='strict'):
        self.stream = stream
        self.errors = _check_errors(self, errors)
        self._pending = ''
        self._state = self.codec.initial_state()

    def write(self, strobj):
        if not isinstance(strobj, str):
            raise TypeError("couldn't convert the object to unicode.")
        text = self._pending + strobj
        out, consumed, self._state = self.codec.encode_chunk(
            text, self.errors, False, self._state)
        self._pending = text[consumed:]
        self.stream.write(out)

    def writelines(self, lines):
        for line in lines:
            self.write(line)

    def reset(self):
        out, consumed, self._state = self.codec.encode_chunk(
            self._pending, self.errors, True, self._state)
        out += self.codec.encode_flush(self._state)
        self._pending = ''
        self._state = self.codec.initial_state()
        if out:
            self.stream.write(out)
