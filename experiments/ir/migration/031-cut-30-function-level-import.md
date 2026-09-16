## Progress — cut 30 (function-level `import`)

A single-alias `import` inside a def binds a body local (the parser's
declareWrite:), so it is printImportBindingOpenOn:name:'s plain ``name := ...''
branch with valueSourceFor:'s value:

    name := (((Python @env0:at: #builtins) instance) ___import__: { 'a.b.c' } kw: nil)

plus, for ``import a.b.c as x'', the leaf reached by the ``@env1:b @env1:c''
walks after the import (``import a.b.c'' binds the TOP name ``a''
unaliased).  The builtins varargs fast path is used directly so the import
does not depend on ``__import__'' resolving through the symbol list.
Multi-alias statements (``import a, b'') stay on text -- the flow analysis
takes one write target per statement -- and so does ``from x import y'' for
now.  ImportAst answers a synthetic NameAst as its ___irLocalWriteTarget___:.

The smoke fixture's text_caller carries a ``global FLOOR'' declaration now:
its ``import traceback'' would otherwise have made it IR-eligible, and it is
the TEXT side of the text-calls-IR traceback check.  Fixture: load_sqrt,
alias_join, dotted_top; compiled 103 -> 106.
