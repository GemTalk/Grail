# CPython's _multibytecodec, in Python: the incremental and stream classes
# the CJK codecs in ``encodings`` are built from.  Each concrete class sets
# ``codec`` to an engine from _cjk (see _codecs_tw and friends), which owns
# the tables and the shift state; these classes own buffering.
#
# The state a getstate() answers is CPython's, byte for byte, as
# Modules/cjkcodecs/multibytecodec.c builds it: an int for the encoder --
# little-endian, a byte giving the pending text's UTF-8 length, that UTF-8,
# then the codec's eight bytes of MultibyteCodec_State -- and a (pending
# bytes, int of those eight bytes) pair for the decoder.  test_multibytecodec
# checks the values themselves, not only the round trip.


# CPython's MAXDECPENDING: an incremental decoder may hold at most this many
# bytes of an unfinished sequence between calls.  More is not buffered; it is
# a UnicodeDecodeError over the whole buffer, whatever the error policy --
# an ISO-2022 escape that never terminates reaches it.
_MAXDECPENDING = 8

# CPython's MAXENCPENDING: the characters an incremental encoder may hold.
_MAXENCPENDING = 2

# sizeof(MultibyteCodec_State.c), the codec's own state.
_STATE_SIZE = 8


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


# ``errors'' is a getset in CPython, shared by all four classes below: it can
# be reassigned, only to a str, and never deleted (multibytecodec_support's
# test_incrementalencoder_del_segfault).  Each class spells the property out
# rather than inheriting it from a mixin, so that their __mro__ stays
# CPython's (the class, then object).
def _errors_value(value):
    if not isinstance(value, str):
        raise TypeError('errors must be a string')
    return value


def _refuse_errors_delete():
    raise AttributeError('cannot delete attribute')


def _state_bytes(codec, state, carried, encoder):
    """The eight state bytes CPython keeps: the codec's for a stateful one,
    otherwise the ones setstate() last gave, which nothing reads."""
    c = codec.state_to_c(state, encoder)
    return carried if c is None else c


class MultibyteIncrementalEncoder:
    codec = None

    @property
    def errors(self):
        return self._errors

    @errors.setter
    def errors(self, value):
        self._errors = _errors_value(value)

    @errors.deleter
    def errors(self):
        _refuse_errors_delete()

    def __init__(self, errors='strict'):
        self.errors = _check_errors(self, errors)
        self._pending = ''
        self._state = self.codec.initial_state()
        self._carried = bytes(_STATE_SIZE)

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
        pending = self._pending.encode('utf-8')
        if len(pending) > _MAXENCPENDING * 4:
            raise UnicodeError('pending buffer too large')
        c = _state_bytes(self.codec, self._state, self._carried, True)
        return int.from_bytes(bytes((len(pending),)) + pending + c, 'little')

    def setstate(self, state):
        if not isinstance(state, int):
            raise TypeError('setstate() argument must be int, not %s'
                            % type(state).__name__)
        statebytes = state.to_bytes(1 + _MAXENCPENDING * 4 + _STATE_SIZE, 'little')
        size = statebytes[0]
        if size > _MAXENCPENDING * 4:
            raise UnicodeError('pending buffer too large')
        pending = statebytes[1:1 + size].decode('utf-8')
        c = statebytes[1 + size:1 + size + _STATE_SIZE]
        self._pending = pending
        self._carried = c
        self._state = self.codec.state_from_c(c, True)


class MultibyteIncrementalDecoder:
    codec = None

    @property
    def errors(self):
        return self._errors

    @errors.setter
    def errors(self, value):
        self._errors = _errors_value(value)

    @errors.deleter
    def errors(self):
        _refuse_errors_delete()

    def __init__(self, errors='strict'):
        self.errors = _check_errors(self, errors)
        self._pending = b''
        self._state = self.codec.initial_state()
        self._carried = bytes(_STATE_SIZE)

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
        c = _state_bytes(self.codec, self._state, self._carried, False)
        return (self._pending, int.from_bytes(c, 'little'))

    def setstate(self, state):
        if not isinstance(state, tuple):
            raise TypeError('setstate() argument must be tuple, not %s'
                            % type(state).__name__)
        # PyArg_ParseTuple(state, "SO!;setstate(): illegal state argument").
        if not (len(state) == 2 and isinstance(state[0], bytes)
                and isinstance(state[1], int)):
            raise TypeError('setstate(): illegal state argument')
        pending, bits = state
        c = bits.to_bytes(_STATE_SIZE, 'little')
        if len(pending) > _MAXDECPENDING:
            raise UnicodeDecodeError(self.codec.name, bytes(pending), 0, len(pending),
                                     'pending buffer too large')
        self._pending = pending
        self._carried = c
        self._state = self.codec.state_from_c(c, False)


class MultibyteStreamReader:
    codec = None

    @property
    def errors(self):
        return self._errors

    @errors.setter
    def errors(self, value):
        self._errors = _errors_value(value)

    @errors.deleter
    def errors(self):
        _refuse_errors_delete()

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

    @property
    def errors(self):
        return self._errors

    @errors.setter
    def errors(self, value):
        self._errors = _errors_value(value)

    @errors.deleter
    def errors(self):
        _refuse_errors_delete()

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
