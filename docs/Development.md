
# Process


## Parsing Python

Grail parses Python source **directly in Smalltalk**. There is no longer any
runtime dependency on CPython's `ast` module: a hand-written tokenizer and a
recursive-descent parser turn source text straight into our own AST of `*Ast`
nodes.

* `PythonTokenizer class >> tokenize:` lexes a source string into a stream of
  `PythonToken`s, handling Python's significant whitespace by emitting
  `INDENT`/`DEDENT`/`NEWLINE` tokens.
* `PythonParser class >> parse:` is the entry point; it consumes the token
  stream and builds a `ModuleAst`. The parser is a classic recursive-descent
  implementation (see the class comment in `PythonParser.gs`).
* `ModuleAst class >> parseSource:` wraps `PythonParser parse:` and is the
  usual way the rest of the system asks for an AST.

> Historical note: an earlier approach shelled out to Python (`pprintast`,
> the [`ast`](https://docs.python.org/3/library/ast.html) module) and rebuilt
> the tree from its textual dump. That dependency is gone. The `ast` module's
> [abstract grammar](https://docs.python.org/3/library/ast.html) is still a
> handy reference when adding or debugging node types, and `pprintast -a -t
> python/hello.py` is a convenient way to see the shape CPython would produce
> for comparison — but it is a developer aid, not part of the parse path.

### The AST node hierarchy

The node classes are hand-built subclasses guided by Python's abstract grammar:

* `ModuleAst` represents a Python module — the root of the AST.
* `SuiteAst` groups a sequence of statements (e.g. the body of a `for` or `if`).
  It is not a CPython grammar node but is a useful internal construct.
* `BlockAst` is a subclass of `SuiteAst` for a scope that owns local
  variables — a module body or a function body.
* `StatementAst` / `ExpressionAst` are the abstract bases for statements and
  expressions.

### Translate the AST to Smalltalk Code

We traverse the tree and generate Smalltalk **source** (rather than emitting
Internal Representation or IR nodes directly), then hand that source to the 
existing GemStone compiler. Each AST node implements `printSmalltalkOn:`; 
precedence is handled by a companion `printSmalltalkWithParenthesisOn:`. 
Most nodes carry position `attributes` from the source for future error reporting.

Output goes to a `PrettyWriteStream` that manages indentation. (Note the
`#tab` method writes a tab directly rather than going through our `#nextPut:`,
which itself calls `#tab` and would otherwise recurse infinitely.) Generating
source keeps us on the stock GemStone compiler and runtime and makes the
output easy to read, debug, and test; building IR nodes directly remains a
possible future direction.

## Runtime Objects

### Variable scoping

Python's scoping rules are handled by the AST nodes themselves rather than by a
separate scope-manager class. (An early approach had a dedicated
`Variables` class; it no longer exists in the code.)

* During parsing, `PythonParser` keeps a `variableStack` (an `Array` of
  `IdentitySet`s, one per active scope) plus a `writeStack`, and a
  `classNesting` counter that drives the function-def subclass conversion.
* Each `BlockAst` records the names declared in its own scope in a `variables`
  `IdentitySet` (and assignment targets in `writes`).
* Scope resolution walks the AST `parent` chain — see `BlockAst`'s
  `declareVariable:`, `isVariableIsDeclared:`, and
  `isVariableIsDeclaredFromMethod:`. This is what lets codegen decide, for a
  given name, whether to emit a local temp, a module-global access, or a
  builtin lookup.

### `Object` vs. `object` — how Python values are represented

When working in the `smalltalk` folder, keep the distinction in mind between
Python code (modeled by the `*Ast` objects) and Smalltalk code (the
`smalltalk/*.gs` files, subclasses of `Object`).

Python's built-in types are **mapped directly onto existing GemStone classes**
— there is *no* wrapper object with a `value` instance variable. A Python
`str` *is* a GemStone string, a Python `int` *is* a GemStone integer, and so
on. The mapping is established in `install.gs`, e.g.:

| Python | GemStone class |
|--------|----------------|
| `str`   | `Unicode7` (methods compiled on `CharacterCollection` so all string subclasses share them) |
| `int`   | `Integer` (`SmallInteger` / `LargeInteger`) |
| `float` | `Float` |
| `bool`  | `Boolean` |
| `list`  | `OrderedCollection` |
| `dict`  | `KeyValueDictionary` |
| `bytes` | `ByteArray` |
| `range` | `Interval` |
| `object` | `Object` |

Python behavior is added to these classes as **environment-1 methods** (see
the next section), so the Python protocol (`__len__`, `__getitem__:`,
`index:`, …) lives alongside — and never collides with — the native Smalltalk
protocol (`size`, `at:`, …) on the very same object. Methods come in three
flavors by naming convention: CPython "dunder" methods (double underscores,
e.g. `__add__:`), ordinary Python methods (no underscores, e.g. `append:`),
and Grail-internal helpers called from Smalltalk (triple underscores, e.g.
`___new___`).

### Environments 0 and 1 (the dispatch model)

A GemStone class can carry more than one method dictionary, each tagged with an
**environment id**. Grail uses two:

* **Environment 0** — the native Smalltalk methods (`String >> size`,
  `Array >> at:put:`, …). This is the default environment.
* **Environment 1** — the Python methods compiled onto the same classes
  (`__len__`, `__getitem__:`, `append:`, the dunders, …).

Because the two protocols live in separate environments, Python's `str.index`
and Smalltalk's `String>>index:` can coexist on `Unicode7` without clobbering
each other. There are over 2,000 `perform:env: 1` sites in the codebase
(see [Perform_Env1_Summary.md](Perform_Env1_Summary.md)).

**Source syntax.** In `.gs` files the markers `recv @env1:selector: arg` and
`recv @env0:selector: arg` force a send into a specific environment (handled in
the VM like any other message send); a bare send uses the enclosing method's own
compile environment. The topaz directives `set compile_env: 1` and
`set compile_env: 0` choose which environment subsequent method definitions
compile into. Generated code emits `@env1:` sends for Python-level operations
and `@env0:` for Smalltalk-level ones.

**Selector arity convention.** The dispatch rewrite settled on a fixed mapping
from Python call shapes to Smalltalk selectors (full details in
[Rewrite_Dispatch_Model.md](Rewrite_Dispatch_Model.md)):

* fixed-arity fast path: `name:` (1 positional arg), `name:_:` (2),
  `name:_:_:` (3), … — e.g. constructors `__new__:`, `__new__:_:`;
* varargs / keyword slow path: `_name:kw:` (e.g. `_print:kw:`), where the
  first argument is the positional `Array` and the second the keyword `dict`;
* 0-arg Python calls do not use a unary `name` fast path (a bare unary getter
  would return the bound method object, not call it), so they route through
  the varargs form.

## Codegen Debug Capture (`/tmp/grail`)

For debugging the transpiler it is sometimes useful to inspect the Smalltalk source and IR that Grail generates for a given Python module or statement. Grail can write these as Topaz-style `.tpz` source dumps and `.ir` IR snapshots under a trace directory. Both capture paths are **opt-in**, gated by the same environment variable:

```bash
GRAIL_CODEGEN_TRACE_DIR=/tmp/grail topaz -l < session.tpz
```

`importlib class >> ___codegenTraceDir___` is the single source of truth: it reads `GRAIL_CODEGEN_TRACE_DIR` once, caches the result on the class, and creates the directory when the variable is set. It returns `nil` when the variable is unset or empty, in which case **no capture files are written and no codegen streams are built**. If you toggle the variable mid-session from a Topaz prompt, call `importlib ___codegenTraceDirInvalidate___` to force a re-read.

There are two capture paths feeding the same directory:

1. **Module-loading capture** — `importlib class >> loadModuleFromPath:` (and `runPath:`) capture every method source they compile, plus the module body's initialize IR, to `<dir>/<module>.tpz` and `<dir>/<module>.ir` (e.g. `__main__.tpz`, `itertools.tpz`, `urllib.parse.tpz`).

2. **Statement-execution capture** — `ModuleAst >> executeWithScope:as:` writes a `___<kind>_<N>___.tpz` / `.ir` pair (`<kind>` is `exec`, `eval`, or `doit`; `<N>` is a per-kind sequence number) for each statement it runs.

Because both paths are gated, running `./scripts/run_tests.sh` with `GRAIL_CODEGEN_TRACE_DIR` unset writes **nothing** to the trace directory. (Path #2 was previously unconditional and hardcoded to `/tmp/grail`, which flooded the directory with a `___doit_<N>___` pair per executed statement during every test run; it is now gated like path #1.)
