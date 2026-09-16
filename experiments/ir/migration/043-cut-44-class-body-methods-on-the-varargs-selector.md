## Progress — cut 44 (class-body methods on the varargs selector)

Roadmap item 1a, the largest single blocker in the census (`method:varargsSelector`,
1235 stdlib methods): a method that compiles as varargs -- parameter defaults,
`*args` / `**kwargs`, keyword-only or positional-only parameters, and
`__init__` always, since `compilesAsVarargs` forces it there so keyword
construction and `super().__init__(a=1)` bind by name.  The cuts 40-43
prologue now runs in method mode, and the differences from the module form
are exactly the text's (`generateMethodSourceOn:`'s varargs branch against
`generateModuleMethodSourceOn:`'s):

* `___irUsesVarargsForm___` is the text's rule per generator -- a module def
  whenever the signature is not simple-positional, a method under
  `compilesAsVarargs` -- and replaces the `isSimplePositionalArgs` test both
  in the install and in eligibility;
* the prologue declares every bound parameter BUT the receiver as a temp
  (`___irLocalParamNames___`; `self` is the Smalltalk receiver) and binds the
  positional parameters AFTER `self` (`___irBuildParamNames___`, the text's
  `instanceMethodParameterNames`), so `positional at: 1` is the first real
  parameter and the arity messages count as the text's do; the
  positional-only count is the text's consecutive-leading-names count, so a
  positional-only `self` is not counted;
* `___irSelector___` answers `_<mangled>:kw:`;
* the def-time default memo takes the text's CLASS form,
  `((self ___grailClassDefault___: #'___default_<Cls>__<f>__<p>___') ifNil:
  [expr])` -- the class-side table ClassDefAst fills while the class body
  runs, the inline expression the fallback -- keyed by
  `___classDefaultKeyFor___:className:` so a class split between the two
  paths shares one stored default per parameter;
* a default naming any bound parameter, the receiver included, is refused
  (`signature:defaultReadsLocal`): it is a def-time NameError in CPython, and
  the text would emit a receiver read.

The fixture found one defect outside the emitter: `CallAst
___compileContextSnapshot___` was a shallow copy, so the deferred build
shared the LIVE lexical scope stack, which `___restoreScopeDepth___:` had
truncated by the time the class-build statement ran -- the arity messages a
varargs prologue bakes in came out as `advance()` where the text (and
CPython) say `Gauge.advance()`.  Cut 36's plain methods never noticed: a
fixed-arity method bakes no message, and the `__qualname__` stamp lives in
the text-emitted class body.  The stack is now copied into the snapshot.

Fixture: class Gauge (a defaulted `__init__`, keyword-only, `*args` /
`**kwargs`, positional-only, a module-global default, a shared mutable
default) and its callers; the arity-message assertions are limited to the
spellings CPython and Grail agree on (CPython counts `self` in "takes N
positional arguments", Grail does not -- a text-path difference, not an IR
one).  Compiled 173 -> 184: the six Gauge methods, three callers, and
`Ctx.__init__` / `Counter.__init__`, which were refused until now.
