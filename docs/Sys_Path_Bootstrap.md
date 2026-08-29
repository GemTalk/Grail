# The sys.path bootstrap — using pip-installed packages from Grail

## What changed, and why it mattered

`sys.path` used to be initialised to an **empty list**, and there was no `site`
module. Every caller who wanted a third-party package had to write

```python
import sys
sys.path.append('/somewhere/site-packages')
import idna
```

by hand. Nobody writes that in CPython: `pip install X; import X` just works,
because `site` puts site-packages on `sys.path` at startup. That gap is the
difference between "pip works" and "pip works the way people expect".

`sys.path` is now populated at session start, in CPython's order, from
**Grail-owned sources**:

| # | Source | Where it comes from |
| --- | --- | --- |
| 0 | the running script's directory | `importlib class >> ___installScriptDir___:`, called by `runPath:` |
| 1 | `$PYTHONPATH`, split on colons | `sys >> ___grailPythonPathDirs___` |
| 2 | an active `$VIRTUAL_ENV`'s site-packages | `sys >> ___grailVenvSiteDirs___` |
| 3 | Grail's user site directory, when it exists | `sys >> ___grailUserSiteDir___` |

Everything except #0 is computed once, in `sys >> initialize_path_info`
(`src/smalltalk/Python/sys.gs`), which runs when the session first touches the
`sys` module singleton.

## What Grail deliberately does NOT adopt

**The host CPython's own site-packages.** Not `site.getsitepackages()`, not
`site.getusersitepackages()`, of whatever `python3` is on `$PATH`.

Those trees are full of wheels carrying compiled extensions Grail cannot load.
Adopting them would replace a clean `ModuleNotFoundError` — which tells you
exactly what to do — with a `dlopen`/ABI failure deep inside an import, which
does not. Grail stays on trees the caller curated on purpose.

## The three ways to make a package importable

### A virtualenv (the recommended one)

```bash
python3 -m venv ~/grailenv
~/grailenv/bin/pip install idna
VIRTUAL_ENV=~/grailenv ./grail myscript.py
```

`<venv>/lib/pythonX.Y/site-packages` is found by **listing** `lib/`, not by
guessing `X.Y`: the venv was built by whatever `python3` the caller has, and
Grail has no CPython version of its own to guess with. `lib64/` is probed too,
for the Linux layout that splits it out.

### Grail's own user site directory

```bash
pip3 install --target ~/.grail/site-packages idna
./grail myscript.py
```

`$GRAIL_SITE_PACKAGES` overrides the location. The directory is put on
`sys.path` only when it exists — CPython's rule for a site directory — but
`site.getusersitepackages()` reports it either way, because the useful question
it answers ("where do I install to?") is asked *before* the directory is made.

### `$PYTHONPATH`

```bash
PYTHONPATH=/my/tree ./grail myscript.py
```

Taken as given, existing or not, exactly as CPython does. Empty components are
dropped rather than becoming the cwd.

## Precedence: sys.path is still searched LAST

`importlib class >> ___moduleNameToPath___:` searches `grailDir`, then
`grailDir/src/python/stdlib`, then `extraSearchRoots`, and **`sys.path` last**.
That is a deliberate deviation from CPython, where `sys.path` *is* the whole
search path: Grail's ported stdlib has to win, so that a directory a caller adds
cannot shadow Grail's own `os` or `traceback` with a same-named file.

Putting the script's directory at `sys.path[0]` does not change that. A script
directory containing an `os.py` still gets Grail's `os`;
`SysPathBootstrapTestCase >> testSysPathIsSearchedAfterTheBundledStdlib` asserts
both halves — the bundled stdlib wins, *and* `sys.path` is genuinely consulted,
so the first half cannot pass by the resolver ignoring `sys.path` altogether.

## The script directory is REPLACED, not appended

A CPython process runs one script and exits, so its `sys.path[0]` is a
one-shot. A Grail **session** runs many scripts — the SUnit shards run hundreds
— so `___installScriptDir___:` removes the directory it installed last time
before inserting the new one. Appending would grow `sys.path` without bound,
and every entry is searched by every later import.

## The `site` module

`src/python/stdlib/site.py` **reports** what `sys` computed; it does not compute
the same rules a second time. `sys.__grail_site_packages__` and
`sys.__grail_user_site__` are the single source of truth.

| API | Answers |
| --- | --- |
| `site.getsitepackages()` | the active virtualenv's site-packages (empty when none) |
| `site.getusersitepackages()` | `$GRAIL_SITE_PACKAGES`, else `~/.grail/site-packages` |
| `site.getuserbase()` | the parent of that |
| `site.ENABLE_USER_SITE` | True unless `$HOME` is unset |
| `site.addsitedir(d)` | appends `d` (idempotently) and processes its `.pth` files |

`addsitedir` **skips** `import` lines inside `.pth` files rather than executing
them, which is where it parts company with CPython. Those lines exist to patch
CPython internals Grail does not have (virtualenv's `_virtualenv.pth` is the
common one), so running them would fail loudly for no benefit.

Not covered, because nothing in Grail can honour them: `sitecustomize` /
`usercustomize`, `python -S`, and the `site` command-line interface.

## Known gaps this does not close

Making a package **importable** is not the same as making it **work**. Two
measured examples, both unrelated to `sys.path`:

* `import idna` now succeeds; `idna.encode()` then fails on
  `unicodedata.bidirectional`, which Grail's `unicodedata` does not implement.
* `import packaging.version` fails on
  `object.__init_subclass__() takes no keyword arguments`.

Those are ordinary stdlib/semantics gaps, and they are now the *next* error
rather than the first one.
