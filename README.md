# Grail

Run [Python](https://docs.python.org/3/reference/index.html) on the GemStone/S 64 Bit.

## Installation

### Git Checkout

Checkout this [GitHub project](git@github.com:jgfoster/Grail.git) to `$HOME/code/GemStone/Grail` (or to some other place and be prepared to edit things to match your path).

### GemStone/S

[GemStone/S](https://gemtalksystems.com/products/gs64/) can be most easily run using the [GemStone Smalltalk IDE](https://marketplace.visualstudio.com/items?itemName=GemTalkSystems.gemstone-ide) (a Visual Studio Code Extension).

Copy the provided `topazini` to `~/.topazini` and edit `gs64stone` to show the name of your database if different. Copy the provided `setenv` to `.setenv` and edit the path to point to your GemStone install. Then open a terminal in this directory and run `./install.sh`. If this finishes without errors then you may proceed to the next step.

## Tests

To run the test suite, run `./scripts/run_tests.sh`.

## Running Python Code in Grail

### Hello World
Our first task is a "Hello World!" program (`python/hello.py`). From a command line execute:

```
./grail python/hello.py
```

### REPL

A REPL (read-eval-print loop) is a convenient way to experiment with a programming language. To run the Grail REPL, execute:

```
./grail
```

To exit the REPL, enter `exit()` or `quit()`. If you get an error and end up with a `topaz 1>` prompt, then enter `exit` to exit.

## Embedded CPython (Two-Object-Space)

Grail includes an optional embedded CPython integration that loads `libpython` as a dynamic library
via GemStone's CCallout/CLibrary FFI. This provides a "two-object-space" bridge where Python objects
live in CPython's heap and are manipulated through `CPythonLibrary` and `CPythonObject` wrappers.

This is separate from the main Grail approach (single object space with native Smalltalk types) and
from the CPythonShim (which loads C extension modules). If `python3` is available at install time,
`install.sh` will auto-detect and configure the library path.

**Note:** Both `CPythonLibrary` (embedded) and `CPythonShim` (extension shim) export CPython C API
symbols. Only one may be used per Gem session; a runtime guard prevents loading both.

## Other documentation

* [Programs](docs/Programs.md) that we could use to test our work.
* [Development](docs/Development.md) process and notes.
