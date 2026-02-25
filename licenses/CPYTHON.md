# CPython License

Several C source files in `c/shim/` are derived from CPython
(https://github.com/python/cpython). These files are redistributed
under the Python Software Foundation License Version 2.

## Derived Files

| File | CPython Source | Notes |
|------|---------------|-------|
| `_statisticsmodule.c` | `Modules/_statisticsmodule.c` | Accelerator for the `statistics` module |
| `_bisectmodule.c` | `Modules/_bisectmodule.c` | Bisection algorithms |
| `_crc32cmodule.c` | (original) | CRC32C implementation |
| `_heapqmodule.c` | `Modules/_heapqmodule.c` | Heap queue algorithm |
| `_sre/sre.c` | `Modules/_sre/sre.c` | Regular expression engine |
| `_sre/sre.h` | `Modules/_sre/sre.h` | SRE type definitions |
| `_sre/sre_lib.h` | `Modules/_sre/sre_lib.h` | SRE matching engine (unmodified) |
| `_sre/sre_constants.h` | `Modules/_sre/sre_constants.h` | SRE opcode constants (unmodified) |
| `_sre/sre_targets.h` | `Modules/_sre/sre_targets.h` | SRE computed goto targets (unmodified) |

All files were taken from CPython 3.14 (tag `v3.14.0a4`) and modified
to compile against Grail's `cpython.h` shim instead of `Python.h`.
Modifications include: replacing internal `pycore_*` API calls with
public API equivalents, replacing Argument Clinic generated wrappers
with hand-written argument parsing, and adapting string handling for
GemStone's UTF-8 representation.

## Python Software Foundation License Version 2

```
1. This LICENSE AGREEMENT is between the Python Software Foundation ("PSF"),
   and the Individual or Organization ("Licensee") accessing and otherwise
   using Python 3.14.0 software in source or binary form and its associated
   documentation.

2. Subject to the terms and conditions of this License Agreement, PSF hereby
   grants Licensee a nonexclusive, royalty-free, world-wide license to
   reproduce, analyze, test, perform and/or display publicly, prepare
   derivative works, distribute, and otherwise use Python 3.14.0 alone or
   in any derivative version, provided, however, that PSF's License Agreement
   and PSF's notice of copyright, i.e., "Copyright (c) 2001-2024 Python
   Software Foundation; All Rights Reserved" are retained in Python 3.14.0
   alone or in any derivative version prepared by Licensee.

3. In the event Licensee prepares a derivative work that is based on or
   incorporates Python 3.14.0 or any part thereof, and wants to make the
   derivative work available to others as provided herein, then Licensee
   hereby agrees to include in any such work a brief summary of the changes
   made to Python 3.14.0.

4. PSF is making Python 3.14.0 available to Licensee on an "AS IS" basis.
   PSF MAKES NO REPRESENTATIONS OR WARRANTIES, EXPRESS OR IMPLIED. BY WAY
   OF EXAMPLE, BUT NOT LIMITATION, PSF MAKES NO AND DISCLAIMS ANY
   REPRESENTATION OR WARRANTY OF MERCHANTABILITY OR FITNESS FOR ANY
   PARTICULAR PURPOSE OR THAT THE USE OF PYTHON 3.14.0 WILL NOT INFRINGE
   ANY THIRD PARTY RIGHTS.

5. PSF SHALL NOT BE LIABLE TO LICENSEE OR ANY OTHER USERS OF PYTHON 3.14.0
   FOR ANY INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES OR LOSS AS A RESULT
   OF MODIFYING, DISTRIBUTING, OR OTHERWISE USING PYTHON 3.14.0, OR ANY
   DERIVATIVE THEREOF, EVEN IF ADVISED OF THE POSSIBILITY THEREOF.

6. This License Agreement will automatically terminate upon a material breach
   of its terms and conditions.

7. Nothing in this License Agreement shall be deemed to create any
   relationship of agency, partnership, or joint venture between PSF and
   Licensee. This License Agreement does not grant permission to use PSF
   trademarks or trade name in a trademark sense to endorse or promote
   products or services of Licensee, or any third party.

8. By copying, installing or otherwise using Python 3.14.0, Licensee agrees
   to be bound by the terms and conditions of this License Agreement.
```

## SRE (Secret Labs' Regular Expression Engine)

The `_sre` files additionally carry the following copyright:

```
Copyright (c) 1997-2001 by Secret Labs AB.  All rights reserved.

This version of the SRE library can be redistributed under CNRI's
Python 1.6 license.  For any other use, please contact Secret Labs
AB (info@pythonware.com).
```

The CNRI Python 1.6 license permits redistribution of derivative works
provided copyright notices are retained. See the full CNRI license in
the CPython LICENSE file at https://github.com/python/cpython/blob/main/LICENSE
