"""Run one of pydantic's own test modules without pytest, and print one line
per test -- the same way under Grail and under CPython, so the two can be
compared test by test (docs/Support_Pydantic.md, Phase 6).

    python run_pydantic_tests.py <pydantic-sdist>/tests/test_main.py [substring]
        [--resume <earlier output>]

Uses the pytest stand-in in ./minipytest (real pytest does not import in
Grail).  Collects module-level ``test_*`` functions and ``Test*`` classes'
``test_*`` methods, expands ``mark.parametrize`` (and parametrised
fixtures), injects fixtures by parameter name, and honours skip / skipif /
xfail marks.  Fixtures: the module's own, plus tmp_path, monkeypatch, request
and create_module (conftest.py's, reimplemented without pytest's assertion
rewriting).  conftest's validate_json_schemas -- a jsonschema check on every
generated JSON schema -- is not reproduced.

Each test prints ``START|<id>`` and then ``RESULT|<id>|<outcome>|<message>``,
outcome one of passed, failed, error, skipped, xfailed, xpassed; the last line
is the tally.  A START with no RESULT is the test that took the process down.
"""

import importlib.util
import inspect
import itertools
import os
import re
import secrets
import sys
import tempfile
import textwrap
import time
import traceback
import types
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'minipytest'))
import pytest  # noqa: E402  (the stand-in)

os.environ['PYDANTIC_ERRORS_INCLUDE_URL'] = 'false'   # conftest's disable_error_urls


# -- fixtures ------------------------------------------------------------------------

def _extract_source_code_from_function(function):
    # conftest.py's, verbatim in effect
    if function.__code__.co_argcount:
        raise RuntimeError(f'function {function.__qualname__} cannot have any arguments')
    code_lines = ''
    body_started = False
    for line in textwrap.dedent(inspect.getsource(function)).split('\n'):
        if line.startswith('def '):
            body_started = True
            continue
        elif body_started:
            code_lines += f'{line}\n'
    return textwrap.dedent(code_lines)


def _builtin_fixture(name, ctx):
    if name == 'tmp_path':
        return Path(tempfile.mkdtemp(prefix='grail_pyd_'))
    if name == 'monkeypatch':
        mp = pytest.MonkeyPatch()
        ctx['finalizers'].append(mp.undo)
        return mp
    if name == 'request':
        return pytest.FixtureRequest(ctx['name'])
    if name == 'create_module':
        tmp = _builtin_fixture('tmp_path', ctx)

        def run(source_code_or_function, rewrite_assertions=True, module_name_prefix=None):
            if isinstance(source_code_or_function, types.FunctionType):
                code = _extract_source_code_from_function(source_code_or_function)
            else:
                code = source_code_or_function
            sanitized = re.sub('[' + re.escape('<>:"/\\|?*[]') + ']', '-', ctx['name'])[:120]
            mod_name = f'{sanitized}_{secrets.token_hex(5)}'.replace('-', '_').replace('.', '_')
            path = tmp / f'{mod_name}.py'
            path.write_text(code)
            if module_name_prefix:
                mod_name = module_name_prefix + mod_name
            if not hasattr(importlib.util, 'module_from_spec'):
                # Grail's importlib has no module_from_spec / exec_module
                # (docs/Support_Pydantic.md, Phase 6): import the file by name
                # from its directory instead, which is what conftest's fixture
                # amounts to for a file nothing else imports.
                if module_name_prefix:
                    path = path.rename(path.with_name(f'{mod_name}.py'))
                sys.path.insert(0, str(path.parent))
                try:
                    return importlib.import_module(mod_name)
                finally:
                    sys.path.remove(str(path.parent))
            spec = importlib.util.spec_from_file_location(mod_name, str(path))
            module = importlib.util.module_from_spec(spec)
            sys.modules[mod_name] = module
            spec.loader.exec_module(module)
            return module
        return run
    raise LookupError(name)


BUILTIN = {'tmp_path', 'monkeypatch', 'request', 'create_module'}


def _resolve(name, ctx, module_fixtures, cache, fparams):
    if name in cache:
        return cache[name]
    if name in fparams:            # a parametrised fixture's current value
        cache[name] = fparams[name]
        return cache[name]
    if name in module_fixtures:
        fdef = module_fixtures[name]
        kwargs = {p: _resolve(p, ctx, module_fixtures, cache, fparams)
                  for p in inspect.signature(fdef.func).parameters if p != 'self'}
        if 'request' in kwargs and name in ctx.get('fixture_param', {}):
            kwargs['request'].param = ctx['fixture_param'][name]
        value = fdef.func(**kwargs)
        if inspect.isgenerator(value):
            gen = value
            value = next(gen)
            ctx['finalizers'].append(lambda g=gen: next(g, None))
        cache[name] = value
        return value
    if name in BUILTIN:
        cache[name] = _builtin_fixture(name, ctx)
        return cache[name]
    raise LookupError(f'fixture {name!r} not found')


# -- collection --------------------------------------------------------------------------

def _marks(obj):
    m = getattr(obj, 'pytestmark', []) or []
    return [m] if isinstance(m, pytest.Mark) else list(m)   # a module may set one bare Mark


def _idval(val, argname, idx):
    if isinstance(val, (str, int, float, bool, complex)) or val is None:
        return str(val)
    if isinstance(val, type) or callable(val):
        return getattr(val, '__name__', f'{argname}{idx}')
    return f'{argname}{idx}'


def _expand(func, extra_marks):
    """[(id_suffix, kwargs, marks)] for every parametrize combination."""
    groups = []
    for m in _marks(func):
        if m.name != 'parametrize':
            continue
        names, values = m.args[0], m.args[1]
        if isinstance(names, str):
            names = [n.strip() for n in names.split(',') if n.strip()]
        ids = m.kwargs.get('ids')
        group = []
        for i, v in enumerate(values):
            pm = ()
            pid = None
            if isinstance(v, pytest.ParameterSet):
                pm, pid, v = v.marks, v.id, v.values
                if len(names) == 1:
                    v = v[0]
            vals = v if len(names) > 1 else (v,)
            if ids is not None and not callable(ids) and i < len(ids):
                pid = ids[i]
            if pid is None:
                # pytest's own scheme: a scalar is its value, anything else
                # argname+index -- a repr would differ between interpreters
                # wherever iteration order does (sets)
                pid = '-'.join(_idval(x, n, i) for x, n in zip(vals, names))
            group.append((str(pid), dict(zip(names, vals)), list(pm)))
        groups.append(group)
    if not groups:
        return [('', {}, [])]
    out = []
    for combo in itertools.product(*reversed(groups)):
        sid = '-'.join(c[0] for c in combo)
        kw = {}
        mk = []
        for c in combo:
            kw.update(c[1])
            mk.extend(c[2])
        out.append((sid, kw, mk))
    return out


def collect(module):
    fixtures = {}
    for name, obj in list(vars(module).items()):
        fd = getattr(obj, '__grail_fixture__', None)
        if fd is not None:
            fixtures[fd.name] = fd
    items = []
    mod_marks = _marks(module)
    for name, obj in list(vars(module).items()):
        if name.startswith('test') and callable(obj) and not isinstance(obj, type) \
                and getattr(obj, '__grail_fixture__', None) is None:
            items.append((name, None, obj, mod_marks))
        elif name.startswith('Test') and isinstance(obj, type):
            for mname in dir(obj):
                if mname.startswith('test'):
                    meth = getattr(obj, mname)
                    if callable(meth):
                        items.append((f'{name}::{mname}', obj, meth, mod_marks + _marks(obj)))
    return fixtures, items


# -- running -----------------------------------------------------------------------------------

def _skip_reason(marks):
    for m in marks:
        if m.name == 'skip':
            return m.kwargs.get('reason', m.args[0] if m.args else 'skip')
        if m.name == 'skipif':
            cond = m.args[0] if m.args else m.kwargs.get('condition', False)
            if cond:
                return m.kwargs.get('reason', 'skipif')
    return None


def _xfail(marks):
    for m in marks:
        if m.name == 'xfail':
            cond = m.args[0] if m.args and not isinstance(m.args[0], str) else True
            if cond:
                return True
    return False


def run_one(nodeid, cls, func, marks, kwargs, fixtures):
    reason = _skip_reason(marks)
    if reason is not None:
        return 'skipped', str(reason)[:80]
    ctx = {'name': nodeid.split('::')[-1], 'finalizers': []}
    xfail = _xfail(marks)
    try:
        target = func
        if cls is not None:
            target = getattr(cls(), func.__name__)
        params = [p for p in inspect.signature(target).parameters]
        cache = {}
        call_kwargs = {}
        for p in params:
            if p in kwargs:
                call_kwargs[p] = kwargs[p]
            else:
                call_kwargs[p] = _resolve(p, ctx, fixtures, cache, kwargs)
    except pytest.Skipped as e:
        return 'skipped', str(e)[:80]
    except BaseException as e:
        # BaseException: pydantic_core's PanicException is one, and a panic in a
        # fixture is a result to record, not a reason to stop the run
        if isinstance(e, (KeyboardInterrupt, SystemExit)):
            raise
        return 'error', f'setup: {type(e).__name__}: {str(e)[:120]}'
    try:
        target(**call_kwargs)
        outcome = ('xpassed', '') if xfail else ('passed', '')
    except pytest.Skipped as e:
        outcome = ('skipped', str(e)[:80])
    except pytest.XFailed as e:
        outcome = ('xfailed', str(e)[:80])
    except BaseException as e:
        if isinstance(e, (KeyboardInterrupt, SystemExit)):
            raise
        if xfail:
            outcome = ('xfailed', type(e).__name__)
        else:
            tb = traceback.extract_tb(e.__traceback__)
            where = f'{os.path.basename(tb[-1].filename)}:{tb[-1].lineno}' if tb else '?'
            outcome = ('failed', f'{type(e).__name__}: {str(e)[:160]} @{where}'.replace('\n', ' '))
    finally:
        for fin in reversed(ctx['finalizers']):
            try:
                fin()
            except Exception:
                pass
    return outcome


def main():
    args = sys.argv[1:]
    done = set()
    if '--resume' in args:
        # skip what an earlier, crashed run already reported (run_pydantic_slice.sh)
        i = args.index('--resume')
        with open(args[i + 1], encoding='utf-8', errors='replace') as f:
            done = {line.split('|')[1] for line in f if line.startswith('RESULT|')}
        del args[i:i + 2]
    path = args[0]
    sub = args[1] if len(args) > 1 else None
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(path))))
    modname = 'tests.' + os.path.splitext(os.path.basename(path))[0]
    t0 = time.time()
    try:
        module = importlib.import_module(modname)
    except BaseException as e:
        print(f'RESULT|{modname}|import-error|{type(e).__name__}: {str(e)[:200]}')
        print(f'TOTAL|{modname}|import-error')
        return
    fixtures, items = collect(module)
    tally = {}
    for name, cls, func, marks in items:
        for sid, kw, pmarks in _expand(func, marks):
            nodeid = f'{name}[{sid}]' if sid else name
            # one line per result: a parametrised id may hold a newline or a '|'
            nodeid = nodeid.replace('\n', '\\n').replace('|', '/')
            if (sub and sub not in nodeid) or nodeid in done:
                continue
            # START first, so a crash that takes the process down still names its test
            print(f'START|{nodeid}', flush=True)
            outcome, msg = run_one(nodeid, cls, func, marks + _marks(func) + pmarks, kw, fixtures)
            tally[outcome] = tally.get(outcome, 0) + 1
            print(f'RESULT|{nodeid}|{outcome}|{msg}', flush=True)
    print('TOTAL|' + modname + '|' + ' '.join(f'{k}={v}' for k, v in sorted(tally.items()))
          + f'|{time.time() - t0:.1f}s', flush=True)


if __name__ == '__main__':
    main()
