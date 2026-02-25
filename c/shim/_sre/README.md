# _sre — Regular Expression Engine

These files are forked from CPython 3.14 (`v3.14.0a4`) and modified to
compile against Grail's `cpython.h` shim instead of `Python.h`.

Source: https://github.com/python/cpython/tree/v3.14.0a4/Modules/_sre/

## Modifications to `sre.c`

- Replaced `#include "Python.h"` with `#include "../cpython.h"` (under `#ifdef GRAIL_SHIM`)
- Removed `pycore_critical_section.h`, `pycore_dict.h`, `pycore_long.h`, `pycore_moduleobject.h`
- Replaced `_PyModule_GetState()` with `PyModule_GetState()`
- Replaced `_PyLong_GetZero()` with `PyLong_FromLong(0)`
- Replaced `_PyDict_Next()` with `PyDict_Next()` and `_PyDict_SetItem_KnownHash()` with `PyDict_SetItem()`
- Removed `Py_BEGIN_CRITICAL_SECTION` / `Py_END_CRITICAL_SECTION` (no-ops in Grail)
- Replaced `#include "clinic/sre.c.h"` with hand-written argument parsing wrappers

## Unmodified Files

- `sre.h` — type definitions
- `sre_lib.h` — core matching engine (pure algorithmic C, no CPython API calls)
- `sre_constants.h` — auto-generated opcode constants
- `sre_targets.h` — computed goto targets

## License

Copyright (c) 1997-2001 by Secret Labs AB. All rights reserved.
Redistributed under CNRI's Python 1.6 license.
See `../../licenses/CPYTHON.md` for full license text.
