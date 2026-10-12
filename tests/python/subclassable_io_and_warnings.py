# Regression fixture for #1459: two classes libraries subclass, made
# subclassable the way CPython's are.
#
#  * warnings.catch_warnings was a function (a method of Grail's Smalltalk
#    warnings module), so ``class W(warnings.catch_warnings)'' raised ``cannot
#    subclass a non-class base''.  pytest's WarningsRecorder -- under
#    pytest.warns and the recwarn fixture -- is such a subclass, and it reads
#    and resets the ``_entered'' flag CPython's class keeps.
#  * a subclass of io.TextIOWrapper over a BUFFER was never initialised:
#    ``write'' raised ``not writable'' and ``.buffer'' was missing.  pytest's
#    CaptureIO / TeeCaptureIO / EncodedFile are such subclasses.
#
# Expected values are what CPython 3.14 answers.

import io
import warnings

RESULTS = {}


def attempt(f):
    try:
        return f()
    except Exception as e:
        return '%s: %s' % (type(e).__name__, e)


# --- warnings.catch_warnings ------------------------------------------------

RESULTS['catch_warnings_is_a_class'] = isinstance(warnings.catch_warnings, type)
RESULTS['call_makes_an_instance'] = (
    isinstance(warnings.catch_warnings(), warnings.catch_warnings)
    and isinstance(warnings.catch_warnings(record=True), warnings.catch_warnings))
RESULTS['repr'] = (
    repr(warnings.catch_warnings()) == 'catch_warnings()'
    and repr(warnings.catch_warnings(record=True)) == 'catch_warnings(record=True)')


def _record():
    with warnings.catch_warnings(record=True) as log:
        warnings.simplefilter('always')
        warnings.warn('w1', UserWarning)
    return [str(m.message) for m in log]


RESULTS['record'] = _record() == ['w1']


def _action():
    with warnings.catch_warnings(action='error'):
        try:
            warnings.warn('boom', UserWarning)
        except UserWarning as e:
            return 'raised ' + str(e)
    return 'no raise'


RESULTS['action_shorthand'] = _action() == 'raised boom'


def _reenter():
    cw = warnings.catch_warnings()
    with cw:
        with cw:
            pass


RESULTS['reentry_errors'] = (
    attempt(_reenter) == 'RuntimeError: Cannot enter catch_warnings() twice'
    and attempt(lambda: warnings.catch_warnings().__exit__())
    == 'RuntimeError: Cannot exit catch_warnings() without entering first')


# pytest's WarningsRecorder, reduced to what it asks of its base.
class WarningsRecorder(warnings.catch_warnings):
    def __init__(self):
        super().__init__(record=True)
        self._entered = False
        self._list = []

    def __enter__(self):
        if self._entered:
            raise RuntimeError('Cannot enter twice')
        self._list = super().__enter__()
        warnings.simplefilter('always')
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if not self._entered:
            raise RuntimeError('Cannot exit without entering first')
        super().__exit__(exc_type, exc_val, exc_tb)
        self._entered = False


def _recorder():
    before = list(warnings.filters)
    recorder = WarningsRecorder()
    seen = []
    for i in range(2):
        with recorder:
            warnings.warn('x%d' % i, DeprecationWarning)
        seen.append([str(m.message) for m in recorder._list])
    return seen, recorder._entered, warnings.filters == before


RESULTS['pytest_recorder_reusable'] = _recorder() == ([['x0'], ['x1']], False, True)


# --- io.TextIOWrapper subclasses over a buffer ------------------------------

class CaptureIO(io.TextIOWrapper):
    def __init__(self):
        super().__init__(io.BytesIO(), encoding='UTF-8', newline='',
                         write_through=True)

    def getvalue(self):
        assert isinstance(self.buffer, io.BytesIO)
        return self.buffer.getvalue().decode('UTF-8')


class TeeCaptureIO(CaptureIO):
    def __init__(self, other):
        self._other = other
        super().__init__()

    def write(self, s):
        super().write(s)
        return self._other.write(s)


class EncodedFile(io.TextIOWrapper):
    __slots__ = ()

    @property
    def name(self):
        return repr(self.buffer)


def _capture():
    c = CaptureIO()
    c.write('hi\n')
    c.write('there\n')
    return c.getvalue()


RESULTS['capture_io_writes_to_its_buffer'] = _capture() == 'hi\nthere\n'


def _tee():
    other = io.StringIO()
    t = TeeCaptureIO(other)
    t.write('x')
    return t.getvalue(), other.getvalue()


RESULTS['tee_capture_super_write'] = _tee() == ('x', 'x')


def _encoded():
    b = io.BytesIO()
    e = EncodedFile(b, encoding='utf-8', errors='replace', newline='',
                    write_through=True)
    e.write('é')
    return b.getvalue(), e.name.startswith('<'), e.encoding


RESULTS['encoded_file'] = _encoded() == (b'\xc3\xa9', True, 'utf-8')


def _readback():
    c = CaptureIO()
    c.write('a\nb\n')
    c.seek(0)
    return c.readlines()


RESULTS['read_back'] = _readback() == ['a\n', 'b\n']
RESULTS['subclass_is_a_textiowrapper'] = (
    isinstance(CaptureIO(), io.TextIOWrapper)
    and issubclass(CaptureIO, io.TextIOWrapper)
    and issubclass(CaptureIO, io.TextIOBase))

if __name__ == '__main__':
    for _name, _ok in RESULTS.items():
        print('%-4s %s' % ('OK' if _ok is True else 'FAIL', _name))
