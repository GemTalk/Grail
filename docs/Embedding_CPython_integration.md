# Embed CPython inside GemStone

This branch embeds CPython 3.14 inside a Gem process so Python becomes peer of Smalltalk. We then have a long-lived Python interpreter that shares the object database, participates in commit/abort, and exposes a persistent REPL.

To do this, `libpython3.14.so` is `dlopen`'d directly into the Gem. As we're running in the same process, we have no IPC and a single address space.

<p align="center">
<img width="200"  src="https://github.com/user-attachments/assets/5a9180f8-cb42-476e-a6ec-e36edd77673e" />
</p>

## `CPythonLibrary`

An instance of this class, obtained by running `CPythonLibrary current`, serves as a connection with the Python interpreter (it owns the `Py_InitializeFromInitConfig` / `Py_FinalizeEx` lifecycle). It lazily builds and caches `CCallout` wrappers for the C API.
The single instance is stored in `SessionTemps` rather than committed, because `CLibrary` handles are process-local and would SIGSEGV on session reuse. 

<p align="center">
<img width="350" src="https://github.com/user-attachments/assets/f4c6fbc5-6651-47d1-8c9d-a1fe8355e372" />
</p>

## Python REPL

A Python REPL is implemented by `CPythonRepl`. The REPL orchestrates evaluation, persistence, and the GemStone/Python marshalling boundary. An instance of `PythonStore` is the root store, mapping Python names to native GemStone object graphs. `PythonReplicator` does the bidirectional conversion of dicts/lists/tuples/scalars, preserving their identity.

<p align="center">
<img width="450" src="https://github.com/user-attachments/assets/1a7ebe75-34a5-4cea-806f-57e11aba2b4c" />
</p>

## Wrapping `PyObject*`

Every `PyObject*` (C pointer to a `PyObject` struct) held by Smalltalk is wrapped in a `CPythonObject` instance, carrying an `isOwned` flag. `CPythonObject` also has explicit `#fromNewReference:` / `#fromBorrowedReference:` constructors that mirror CPython's borrow/own distinction. Reference counts are released explicitly via `#release` (typically through `#ensure:`).

<p align="center">
<img width="150" src="https://github.com/user-attachments/assets/9b0646b2-9fec-44a7-8200-031eb07df31d" />
</p>

## Async bridge

Python code calls back into GemStone (commit, read a line, write output, evaluate Smalltalk, evaluate Python) through an `asyncio` loop driven cooperatively from Smalltalk. Each call parks an `asyncio` future and stops the loop; Smalltalk steps the loop, services the parked request through a single dispatch table, and resolves the future. Top-level `await` is enabled so `await gemstone.commit()` works at the REPL prompt.

`CCallin` was ruled out because GemStone's nested-callbacks do not work. The async design sidesteps that constraint.

This is an example of an async interaction. `stop()` stops the processing of the loop, and returns the control to GemStone, so that we can evaluate the pending command from there:
<p align="center">
<img width="500" src="https://github.com/user-attachments/assets/fd1772f7-97d3-4c94-bfda-7c2e63f0dffa" />
</p>

## Demo

From a topaz session, after `./install.sh`:

```topaz
send CPythonRepl start
```

This drops you into a Python prompt with the `gemstone` module preloaded and top-level `await` enabled:

```python
>>> import gemstone
>>> gemstone.root["greeting"] = "hello"
>>> await gemstone.commit()
True
>>> gemstone.root
GemStoneRoot(['greeting'])
```

Reconnect in a fresh session and `gemstone.root["greeting"]` is still `"hello"` (the dict is replicated into native GemStone objects on commit and re-replicated back on session start).

Also, Python can call back into the host. `gemstone.smalltalk_eval` runs a Smalltalk expression in the active session:

```python
>>> await gemstone.smalltalk_eval('System myUserProfile userId')
'DataCurator'
```

And `gemstone.python_eval` runs Python source through the native Python interpreter (`ModuleAst`), so CPython can invoke the in-image Python implementation:

```python
>>> await gemstone.python_eval('[x * 2 for x in range(3)]') 
[0, 2, 4]
```

## Packaging

Production and test code are split into two `SymbolDictionaries`: `EmbeddedPython` and `EmbeddedPythonTests`.
