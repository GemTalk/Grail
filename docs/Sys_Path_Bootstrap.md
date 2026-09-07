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
| 0 | the running script's directory, **absolute** | `importlib class >> ___installScriptDir___:`, called by `runPath:` |
| 0 | *or* — for `-m` — the **working directory** | `importlib class >> ___installCwdDir___`, called by `runModule:` |
| 1 | `$PYTHONPATH`, split on colons | `sys >> ___grailPythonPathDirs___` |
| 2 | an active `$VIRTUAL_ENV`'s site-packages | `sys >> ___grailVenvSiteDirs___` |
| 3 | Grail's user site directory, when it exists | `sys >> ___grailUserSiteDir___` |

Everything except #0 is computed once, in `sys >> initialize_path_info`
(`src/smalltalk/Python/sys.gs`), which runs when the session first touches the
`sys` module singleton.

Slot 0 is **one slot**, not two: whichever of the two installers runs last owns
it, exactly as in CPython, where `python3 -m pkg` does not leave a previous
script's directory behind. Both go through
`importlib class >> ___installSysPath0___:`, which shares the single remembered
entry (`#GrailSysScriptDir`) — see *The script directory is REPLACED* below.

**Slot 0 is installed by `runPath:` / `runModule:` themselves, not by the
`./grail` launcher.** So a bare `importlib runPath: '/tmp/x/main.py'` typed into
topaz gets it too, and a two-file program works there with no `sys.path`
fiddling. Worth stating because the opposite was assumed: issue #847 was filed
against a checkout predating this bootstrap, and the natural next guess — that
only the launcher seeds `sys.path` — is wrong.

### Both entries are absolute

`___installScriptDir___:` **absolutises** the directory it derives, via
`os_path >> abspath:` (which normalises `.` and `..` on the way). Measured on
CPython 3.11 and 3.13: `cd /tmp/x; python3 sub/app.py` answers
`sys.path[0] == '/tmp/x/sub'`, not `'sub'`.

That is not cosmetic. `sys.path` is consulted at **every later import**, by which
time the program may have `chdir`'d, and a relative entry is re-resolved against
the new directory — so the script's own siblings stop being importable. Measured
before absolutising, with `helper.py` beside the script: `os.chdir('/')` then
`import helper` raised `ModuleNotFoundError` under Grail and imported fine under
CPython. `___installCwdDir___` needs no such step; `getcwd` is already absolute.

**Symlinks are not resolved.** CPython resolves the script path's symlinks;
Grail's `os_path >> realpath:` is `abspath:` with no symlink primitive under it,
so a symlinked script answers the *link's* directory. Accepted platform gap —
see `docs/Issues.md`.

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

## `sys.meta_path` sits ABOVE the path search

Finders installed in `sys.meta_path` (PEP 302 / PEP 451) are consulted, and they
are consulted **before** the path search above — CPython's order, where the path
search is itself just the last `meta_path` entry (`PathFinder`). The full order
an `import` takes:

| # | Step | Where |
| --- | --- | --- |
| 1 | the `sys.modules` cache (and Grail's Smalltalk-native modules) | `importlib class >> lookupModule:` |
| 2 | `sys.meta_path`, `GrailBuiltinImporter` first | `importlib class >> ___findViaMetaPath___:` |
| 3 | the path search in the table above, then PEP 420 namespace packages, `.so`, the shim backends | `importlib class >> ___moduleNameToPath___:` and the rest of `___import__:kw:` |

Step 2 is what makes `import six.moves.urllib.parse` work: `six` installs a
meta-path importer that *fabricates* its `six.moves.*` modules, so there is
nothing on disk for step 3 to find.

**`GrailBuiltinImporter` is why step 2 cannot shadow Grail's `os` or
`traceback`.** It is seeded at `sys.meta_path[0]` and serves exactly Grail's own
two roots — `grailDir` and `grailDir/src/python/stdlib`
(`___grailOwnRoots___`) — the same boundary `___moduleNameToPath___:` has always
drawn, now stated as a finder. It is asked **first whatever its index**, because
`sys.meta_path.insert(0, f)` is how everyone spells "ask my finder first" and
that must not silently displace the tree Grail's own runtime imports from
(`warnings` → `linecache`/`re`, `PyEnumTypes` → `inspect`, `CPythonShim` →
`contextvars`). Removing the object from `sys.meta_path` is the explicit opt-out.

CPython protects its own modules with the cache plus `BuiltinImporter` at
position 0, not with ordering — measured on 3.14, a spy finder at
`sys.meta_path[0]` is never asked for `os` (preloaded) but *is* asked for `json`,
`struct`, `datetime`, `threading`, `io` and `weakref`. `MetaPathFindersTestCase`
/ `tests/python/meta_path_finders.py` records which checks CPython agrees with
and which it does not.

## The script directory is REPLACED, not appended

A CPython process runs one script and exits, so its `sys.path[0]` is a
one-shot. A Grail **session** runs many scripts — the SUnit shards run hundreds
— so `___installSysPath0___:` removes the directory it installed last time
before inserting the new one. Appending would grow `sys.path` without bound,
and every entry is searched by every later import.

The two installers share that **one** remembered entry rather than keeping one
each. With separate entries each would remove only its own previous directory,
so a session alternating `runPath:` and `runModule:` would accumulate one stale
entry per *kind* of start — which is the growth this rule exists to prevent.
`SysPathBootstrapTestCase >> testTheScriptDirectoryAndTheCwdShareTheOneSlot`
is the test that fails if someone splits them.

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
