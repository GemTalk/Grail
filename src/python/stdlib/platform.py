# Minimal ``platform'' stub for Grail.
#
# CPython's platform probes uname / OS version / Python build
# details.  Flask uses only ``platform.python_version()'' for a CLI
# banner — return a stable string so the banner renders.


_GRAIL_PYTHON_VERSION = '3.14.0+grail'


def python_version():
    return _GRAIL_PYTHON_VERSION


def python_version_tuple():
    parts = _GRAIL_PYTHON_VERSION.split('+')[0].split('.')
    return tuple(parts)


def python_implementation():
    return 'Grail'


def system():
    """OS family — Grail runs inside a GemStone gem; report
    the underlying host system if probe-able, else 'Darwin' since
    the only supported host today is macOS."""
    return 'Darwin'


def release():
    return ''


def version():
    return ''


def machine():
    return ''


def node():
    return ''


def platform():
    return system() + '-' + release() + '-' + machine()


def uname():
    """Return a 6-tuple (system, node, release, version, machine,
    processor) per CPython's ``platform.uname()'' shape."""
    return (system(), node(), release(), version(), machine(), '')


def mac_ver(release='', versioninfo=('', '', ''), machine=''):
    """Return a 3-tuple (release, versioninfo, machine) describing the
    macOS version, per CPython's ``platform.mac_ver()'' shape.  Grail
    runs inside a GemStone gem and does not probe the host OS version;
    callers (e.g. test.test_math) parse ``mac_ver()[0]'' and fall back
    gracefully when it is empty, so an empty release is safe."""
    return (release, versioninfo, machine)
