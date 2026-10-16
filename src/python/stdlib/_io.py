"""GRAIL _io: the C module's names, over the io classes Grail already has.

CPython's io re-exports _io; Grail's io is native and its classes come from
_pyio.  Extensions that import _io directly -- cffi's backend reads
``_io._IOBase`` at init to recognise file objects -- get the same objects
under the underscored names _io uses.  Names Grail's io does not have are
left out rather than faked.
"""

import io as _io_module

for _name in ('BufferedRandom', 'BufferedReader', 'BufferedRWPair',
              'BufferedWriter', 'BytesIO', 'DEFAULT_BUFFER_SIZE', 'FileIO',
              'IncrementalNewlineDecoder', 'StringIO', 'TextIOWrapper',
              'UnsupportedOperation', 'open', 'open_code', 'text_encoding'):
    if hasattr(_io_module, _name):
        globals()[_name] = getattr(_io_module, _name)
del _name

_IOBase = _io_module.IOBase
_RawIOBase = _io_module.RawIOBase
_BufferedIOBase = _io_module.BufferedIOBase
_TextIOBase = _io_module.TextIOBase
