! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
%

! ------- builtins class (Python 'builtins' module)
expectvalue /Class
doit
module subclass: 'builtins'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
builtins comment:
'Python builtins module — root class for all Python built-in functions.

In the current dispatch model (see docs/Rewrite_Dispatch_Model.md),
every Python builtin lives as a real env-1 method on this class. The
codegen in CallAst emits direct sends — `((builtins instance) abs: x)`
for fixed-arity calls and `((builtins instance) _print: { … } kw: …)`
for varargs calls — so there is no symbol-list walk, no block
indirection, and no positional-array allocation in the common case.

Method shapes:
  * Fixed-arity: `name`, `name:`, `name:_:`, `name:_:_:`, …
    The Python call `name(arg1, arg2)` compiles to `name: arg1 _: arg2`.
    Used for builtins with a known fixed signature: `abs:`, `len:`,
    `pow:_:`, `divmod:_:`, etc.
  * Varargs: `_name:kw:` taking (positionalArray, kwargDict).
    Used for builtins that need to handle varying arity, kwargs, or
    have multiple supported call shapes: `_print:kw:`, `_zip:kw:`,
    `_pow:kw:` (3-arg case), `_round:kw:` (2-arg case),
    `_input:kw:` (0-arg/1-arg overload), `_quit:kw:`, `___import__:kw:`.

First-class function values:
  * `f = abs; f(-5)` materializes a `BoundMethod` at compile time
    that holds `(builtins instance, #abs)`. The BoundMethod''s
    `value:value:` dispatches to the arity-resolved selector at call
    time, falling back to `_name:kw:` if no fixed-arity match exists.
  * `callable(boundMethod)` returns True because BoundMethod defines
    `__call__:` (forwarding to `value:value:`).

Per Python semantics, `type(builtins) is type(math)` — both report as
`<class ''module''>`. The Smalltalk subclass relationship between
`builtins` and `module` is an implementation detail, not a Python type
relationship.

See https://docs.python.org/3/library/functions.html for the complete
list of Python built-in functions.
'
%

expectvalue /Class
doit
builtins category: 'Grail-Modules'
%

! ===============================================================================
! builtins Methods (Python 'builtins' type)
! ===============================================================================

! ------------------- Remove existing Python methods from builtins
expectvalue /Metaclass3
doit
builtins removeAllMethods.
builtins class removeAllMethods.
%

set compile_env: 1

! ===============================================================================
! Singleton initialization
! ===============================================================================

category: 'Grail-Initialization'
method: builtins
initialize
	"Eagerly populate this module's namespace with the CPython builtin TYPES,
	EXCEPTIONS and CONSTANTS so ``builtins.int`` / ``builtins.ValueError`` /
	``builtins.None`` resolve via getattr AND appear in vars(builtins) /
	dir(builtins) -- matching CPython, whose builtins module contains every
	builtin type, the whole exception hierarchy, and the constants.  Builtin
	FUNCTIONS (len, abs, ...) already answer through the builtins method path and
	are untouched here.

	Types and exceptions live in the Python dict (install.gs Step 3 maps
	int->Integer etc.; the object-subclass builtins like slice/tuple/set and every
	exception class live there too).  A CPython builtin Grail implements as a
	FUNCTION rather than a class (enumerate/filter/map/reversed/zip/type/super/
	staticmethod/classmethod) is simply absent from the dict and skipped -- the
	method path answers getattr for those.  Only CURATED name lists are consulted,
	never the whole Python dict: the dict is Grail's global namespace (vendored
	modules, iterators, PyCode, and non-builtin exceptions like StatisticsError)
	and is NOT builtins.  The exception list is shared with
	object>>___pythonBuiltinExceptionNames___ so getattr and __module__ agree.

	Constants: None resolves to its NoneType singleton and NotImplemented /
	Ellipsis to their Python-dict values; True / False / __debug__ are the
	Smalltalk booleans (Python __debug__ is True).  Stored as dynamic-instVars,
	the same store module globals use, so getattr and vars() both see them.
	Session-local (the builtins singleton is per session)."

	| pd typeNames excNames constNames |
	pd := System @env0:myUserProfile @env0:symbolList @env0:objectNamed: #'Python'.
	(pd @env0:isNil) @env0:ifTrue: [^ self].
	typeNames := #( #bool #bytearray #bytes #complex #dict #enumerate #filter #float
	   #frozenset #int #list #map #memoryview #object #property #range
	   #reversed #set #slice #staticmethod #classmethod #str #super #tuple
	   #type #zip ).
	excNames := Object ___pythonBuiltinExceptionNames___.
	"Types and exceptions: bind only names that resolve to a CLASS in the dict."
	(typeNames @env0:, excNames) @env0:do: [:n | | v |
		v := pd @env0:at: n otherwise: nil.
		((v @env0:notNil) @env0:and: [v @env0:isKindOf: Behavior]) @env0:ifTrue: [
			self @env0:dynamicInstVarAt: n put: v]].
	"Constants that are Smalltalk booleans."
	self @env0:dynamicInstVarAt: #'True' put: true.
	self @env0:dynamicInstVarAt: #'False' put: false.
	self @env0:dynamicInstVarAt: #'__debug__' put: true.
	"Singleton constants resolved from the Python dict (None / NotImplemented /
	Ellipsis)."
	constNames := #( #'None' #'NotImplemented' #'Ellipsis' ).
	constNames @env0:do: [:n | | v |
		v := pd @env0:at: n otherwise: nil.
		(v @env0:notNil) @env0:ifTrue: [self @env0:dynamicInstVarAt: n put: v]]
%

category: 'Grail-Attribute Access'
method: builtins
__dir__
	"dir(builtins) must list every builtin FUNCTION under its Python name.  The
	generic module>>__dir__ enumerates this class's env-1 selectors, but the
	VARARGS builtins are filed as ``_name:kw:`` (a leading-underscore dispatch
	convention -- see the class comment), so super answers the mangled ``_print``
	/ ``_zip`` forms and drops ``___import__:kw:`` entirely (its ``___`` prefix is
	filtered as internal).  Rewrite them: ``_name:kw: -> name`` and, as a special
	case, ``___import__:kw: -> __import__`` (the one dunder builtin among these);
	other ``___…:kw:`` selectors (e.g. ___reload__) are genuine internals and stay
	out.  Fixed-arity builtins (``abs:`` / ``len:``) already arrive correctly
	through super, as do the eagerly-populated types / exceptions / constants
	(dynamic-instVars)."

	| names |
	names := super __dir__ @env0:asSet.
	((self @env0:class) @env0:selectorsForEnvironment: 1) @env0:do: [:sel | | s base |
		s := sel @env0:asString.
		(s @env0:endsWith: ':kw:') @env0:ifTrue: [
			base := s @env0:copyFrom: 1 to: (s @env0:size @env0:- 4).
			(base @env0:= '___import__')
				@env0:ifTrue: [names @env0:add: '__import__']
				@env0:ifFalse: [
					(((base @env0:at: 1) @env0:= $_)
						@env0:and: [(base @env0:at: 2) @env0:~= $_])
						@env0:ifTrue: [
							names @env0:remove: base @env0:ifAbsent: [nil].
							names @env0:add: (base @env0:copyFrom: 2 to: (base @env0:size))]]]].
	^ (names @env0:asSortedCollection: [:a :b | a @env0:<= b]) @env0:asArray
%

! ===============================================================================
! Fixed-arity fast-path methods (1 positional argument)
! ===============================================================================

category: 'Grail-Built-in Functions'
method: builtins
abs: aNumber
	"Python builtin abs(x) — fixed-arity fast path."

	^ [aNumber __abs__] @env0:on: MessageNotUnderstood do: [:ex | TypeError @env0:signal]
%

category: 'Grail-Built-in Functions'
method: builtins
___requireArgs___: positional atLeast: aCount message: aMessage
	"Missing-required-argument guard for the varargs builtins.

	``positional at: 1'' on an EMPTY Array is a kernel OffsetError (error
	2003, objErrBadOffsetIncomplete) -- an env-0 error, so Python cannot
	catch it, and it ended the WHOLE module run rather than the one call.
	``exec()'', ``eval()'', ``compile()'', ``sorted()'', ``sum()'',
	``getattr()'', ``__import__()'' and ``round()'' all presented that way.
	CPython raises a plain TypeError for every one of them, which is what
	the suite's ``assertRaises(TypeError, f)'' expects.

	The message is supplied by the caller because CPython's wording is
	per-builtin and assertRaisesRegex matches it."

	positional @env0:size @env0:< aCount ifTrue: [
		TypeError ___signal___: aMessage]
%

category: 'Grail-Built-in Functions'
method: builtins
_exec: positional kw: kwargs
	"Python builtin exec(source_or_code, globals=None, locals=None).
	Grail implementation: parse ``source`` as a module body, evaluate it in a
	fresh module scope pre-populated with ``globals`` (then ``locals`` on top,
	so a locals entry shadows a globals one exactly as a name lookup would),
	then reflect the bindings the body produced back into the ``locals``
	mapping -- which is ``globals`` when locals was not supplied, since that
	is what CPython defaults it to.

	``locals'' used to be IGNORED outright, with every binding reflected into
	globals.  That is not an approximation of the 3-argument form, it is a
	silent no-op for it: ``l = {}; exec('def f(): ...', {}, l)'' left l EMPTY,
	so nothing exec'd into a separate namespace could be read back at all --
	defs, classes, assignments and imports alike (test_call's
	test_function_with_many_args, which reads l['f'], is one line of that).

	The load-bearing caller is jinja2's ``Template.from_code(env, code, ...)''
	which compiles the generated template-render source and exec's it into a
	fresh dict so the dict ends up populated with ``root'', ``blocks'',
	``name'', ``debug_info'' etc.  That is the 2-argument form and is
	unaffected: globals and locals are then the same object.

	Without exec, jinja2 template rendering can't progress past the from_code
	step regardless of how much of the compiler runs."

	| source globalsDict localsDict scope seeded globalNames |
	self ___requireArgs___: positional atLeast: 1
		message: 'exec() takes at least 1 positional argument (0 given)'.
	source := positional @env0:at: 1.
	"exec() takes source TEXT here.  A PyCode -- what ``f.__code__'' answers --
	is metadata (name, filename, line, arg counts), not executable code: Grail
	compiles Python to Smalltalk methods and keeps no bytecode to re-enter.
	Without this guard the object fell through to the parser and died in a
	string concatenation with a Smalltalk MessageNotUnderstood, which Python
	code cannot catch; a TypeError is both catchable and what CPython raises
	for the case that actually reaches here (a code object carrying free
	variables -- test_scope testEvalExecFreeVars)."
	(source @env0:isKindOf: CharacterCollection) @env0:ifFalse: [
		^ TypeError ___signal___:
			'exec() arg 1 must be a string; a code object is metadata only in Grail'].
	globalsDict := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [nil].
	(globalsDict @env0:isNil) ifTrue: [
		globalsDict := KeyValueDictionary @env0:new
	].
	localsDict := (positional @env0:size @env0:>= 3)
		ifTrue: [positional @env0:at: 3]
		ifFalse: [nil].
	"CPython: locals defaults to globals, so the 2-argument form keeps
	reflecting into globals exactly as before."
	(localsDict @env0:isNil) ifTrue: [localsDict := globalsDict].
	scope := SymbolDictionary @env0:new.
	seeded := self ___seedDoitScope___: scope from: globalsDict.
	"Locals on top: a name bound in both resolves to the locals value."
	(localsDict @env0:== globalsDict) @env0:ifFalse: [
		self ___seedDoitScope___: scope from: localsDict].
	"Run the source as a module body in the seeded scope.  Tag the
	debug capture as #exec so the .tpz / .ir files under $TMP/codegen/
	carry the ___exec_N___ prefix.  globalNamesInto: collects the names the
	source declares ``global'', which is the one thing that overrides the
	locals routing below -- see ___reflectDoitScope___:."
	globalNames := IdentitySet @env0:new.
	ModuleAst @env0:evaluateSource: source usingModuleScope: scope as: #exec
		globalNamesInto: globalNames.
	self ___reflectDoitScope___: scope seeded: seeded into: localsDict
		globalNames: globalNames globals: globalsDict.
	^ None
%

category: 'Grail-Built-in Functions'
method: builtins
___seedDoitScope___: aScope from: aDict
	"Copy aDict's entries into the SymbolDictionary an exec/eval doit runs in
	-- module scope must use Symbol keys.  The live dict views (PyModuleDict
	from globals(), PyInstanceDict from obj.__dict__) speak keysAndValuesDo:
	too; exec(src, globals()) is the canonical caller.

	Answers a dictionary of what was seeded, which
	___reflectDoitScope___:seeded:into: uses to tell the caller's own entries
	apart from the bindings the source produced."

	| seeded sym |
	seeded := KeyValueDictionary @env0:new.
	((aDict isKindOf: KeyValueDictionary)
		or: [aDict isKindOf: PyInstanceDict]) ifTrue: [
		aDict @env0:keysAndValuesDo: [:key :value |
			"doitScopeNameFor: mangles the six names that collide with a
			Smalltalk pseudo-variable, so ``self'' in the exec'd source finds
			the caller's receiver instead of the doit's nil one."
			sym := NameAst @env0:doitScopeNameFor:
				(key @env0:isSymbol ifTrue: [key] ifFalse: [key @env0:asString @env0:asSymbol]).
			aScope @env0:at: sym put: value.
			seeded @env0:at: sym put: value]].
	^ seeded
%

category: 'Grail-Built-in Functions'
method: builtins
___reflectDoitScope___: aScope seeded: seeded into: targetDict
	"Reflect back with no ``global'' overrides -- eval()'s case, since a
	``global'' statement cannot appear inside an expression."

	^ self ___reflectDoitScope___: aScope seeded: seeded into: targetDict
		globalNames: nil globals: nil
%

category: 'Grail-Built-in Functions'
method: builtins
___reflectDoitScope___: aScope seeded: seeded into: targetDict globalNames: globalNames globals: globalsDict
	"Write the bindings an exec/eval doit produced back into targetDict, with
	string keys (Python convention) and the pseudo-variable mangling undone.

	Only the bindings the SOURCE produced: an entry still holding the exact
	object it was seeded with is the caller's own and is skipped, so
	``exec(src, globals_dict, l)'' leaves l holding what src bound rather than
	a copy of globals_dict.  The comparison is by IDENTITY, so rebinding a
	name to an equal-but-distinct object still counts.  It does mean a
	rebinding to the identical object it already held (``exec('x = 1', {'x':
	1}, l)'', where GemStone interns the SmallInteger) is indistinguishable
	from no binding at all and does not land in l -- the one case this loses,
	and only when globals and locals are separate mappings.

	A name the source declared ``global'' goes to globalsDict instead.  Grail
	runs the body in one flat scope, so that declaration is the only evidence
	left at this point that the binding was meant for globals rather than
	locals -- and it is exactly the evidence CPython acts on."

	aScope @env0:keysAndValuesDo: [:key :value |
		"ensureModuleScope: parks a handle on the scope inside itself, so that
		codegen can name a global-declared slot explicitly where a bare
		identifier would be captured by an enclosing block temp.  It is
		machinery, not a binding the source produced, and must not surface in
		the caller's namespace."
		(key @env0:== #'___pyGlobals___') @env0:ifFalse: [
		((seeded @env0:includesKey: key)
			@env0:and: [(seeded @env0:at: key) @env0:== value])
			@env0:ifFalse: [ | pyName target |
				pyName := NameAst @env0:doitScopeNameToPythonName: key.
				target := ((globalNames @env0:notNil)
					@env0:and: [globalNames @env0:includes: pyName @env0:asString @env0:asSymbol])
					ifTrue: [globalsDict]
					ifFalse: [targetDict].
				target @env0:at: pyName put: value]]]
%

category: 'Grail-Built-in Functions'
method: builtins
_eval: positional kw: kwargs
	"Python builtin eval(expression, globals=None, locals=None) —
	parse ``expression'' as a SINGLE Python expression, evaluate it
	in the supplied ``globals'' scope, return the value.  Raises
	SyntaxError if the source is anything other than a bare
	expression (assignments / multiple statements belong to exec()).

	``locals'' is honoured on the same terms as _exec:'s -- seeded over
	globals for lookups, and the target the reflect-back writes to -- so
	walrus bindings (``(x := 5) + 1'') and any other side-effect binding
	inside the expression land where CPython puts them."

	| source globalsDict localsDict scope seeded result |
	self ___requireArgs___: positional atLeast: 1
		message: 'eval() takes at least 1 positional argument (0 given)'.
	source := positional @env0:at: 1.
	"Source TEXT only -- see the matching guard in _exec: for why a PyCode
	cannot be evaluated and must fail as a catchable TypeError."
	(source @env0:isKindOf: CharacterCollection) @env0:ifFalse: [
		^ TypeError ___signal___:
			'eval() arg 1 must be a string; a code object is metadata only in Grail'].
	globalsDict := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [nil].
	globalsDict @env0:isNil ifTrue: [
		globalsDict := KeyValueDictionary @env0:new].
	localsDict := (positional @env0:size @env0:>= 3)
		ifTrue: [positional @env0:at: 3]
		ifFalse: [nil].
	(localsDict @env0:isNil) ifTrue: [localsDict := globalsDict].
	scope := SymbolDictionary @env0:new.
	seeded := self ___seedDoitScope___: scope from: globalsDict.
	(localsDict @env0:== globalsDict) @env0:ifFalse: [
		self ___seedDoitScope___: scope from: localsDict].
	result := ModuleAst @env0:evaluateExpressionSource: source usingModuleScope: scope.
	self ___reflectDoitScope___: scope seeded: seeded into: localsDict.
	^ result
%

category: 'Grail-Built-in Functions'
method: builtins
_compile: positional kw: kwargs
	"Python builtin compile(source, filename, mode, ...).  Grail has
	no real bytecode compiler, so the compiled result is the source
	string unchanged — exec()/eval() on a string already run through
	the Python AST loader.  Jinja2's Environment._compile is the
	load-bearing caller: it compiles the generated template-render
	source to a code object and exec's it into a fresh namespace;
	returning the source string lets that succeed.

	CPython's compile() nonetheless PARSES the source and raises
	SyntaxError on invalid syntax, so parse here (discarding the AST)
	to surface it — e.g. ``compile('x, b += 3', ...)'' must raise
	(test_augassign.test_with_unpacking).  Only strings are parsed; a
	non-string source (already an AST/code object) is returned as-is."

	| source |
	self ___requireArgs___: positional atLeast: 1
		message: 'compile() missing required argument ''source'' (pos 1)'.
	source := positional @env0:at: 1.
	(source isKindOf: CharacterCollection)
		ifTrue: [
			[ModuleAst @env0:parseSource: source]
				@env0:on: SyntaxError
				do: [:ex |
					"Re-raise so the Python ``str(e)'' carries the parser's message.
					The env-0 parser can set only GemStone's messageText, but
					___signal___: (reachable here in env-1) populates the ``args''
					tuple BaseException>>__str__ reads -- test_dictcomps
					test_illegal_assignment asserts the message via assertRaisesRegex."
					SyntaxError ___signal___: (ex @env0:messageText
						ifNil: ['invalid syntax'])]].
	^ source
%

category: 'Grail-Built-in Functions'
method: builtins
all: anIterable
	"Python builtin all(iterable) — fixed-arity fast path."

	| iter result done |
	iter := anIterable __iter__.
	result := true.
	done := false.
	[done] @env0:whileFalse: [
		| item isTruthy |
		[
			item := iter __next__.
			[isTruthy := item __bool__]
				@env0:on: MessageNotUnderstood do: [:ex | isTruthy := true].
			isTruthy ifFalse: [
				result := false.
				done := true
			]
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	^ result
%

category: 'Grail-Built-in Functions'
method: builtins
any: anIterable
	"Python builtin any(iterable) — fixed-arity fast path."

	| iter result done |
	iter := anIterable __iter__.
	result := false.
	done := false.
	[done] @env0:whileFalse: [
		| item isTruthy |
		[
			item := iter __next__.
			[isTruthy := item __bool__]
				@env0:on: MessageNotUnderstood do: [:ex | isTruthy := true].
			isTruthy ifTrue: [
				result := true.
				done := true
			]
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	^ result
%

category: 'Grail-Built-in Functions'
method: builtins
bin: aNumber
	"Python builtin bin(x) — fixed-arity fast path."

	^ self ___radixString___: aNumber prefix: '0b' radix: 2
%

category: 'Grail-Built-in Functions'
method: builtins
___radixString___: aNumber prefix: aPrefix radix: aRadix
	"Shared render for bin/oct/hex.

	The SIGN goes in front of the base prefix, not inside it: CPython's
	bin(-1) is '-0b1', and Grail answered '0b-1' because the kernel's
	#printStringRadix: emits its own leading minus and the prefix was
	simply concatenated ahead of it.  Wrong for every negative input to
	all three builtins, and silently so -- a plausible-looking string
	that no Python parser accepts."

	| v |
	v := self ___radixInteger___: aNumber.
	v @env0:< 0 ifTrue: [
		^ '-' @env0:, aPrefix @env0:, (v @env0:negated @env0:printStringRadix: aRadix)].
	^ aPrefix @env0:, (v @env0:printStringRadix: aRadix)
%

category: 'Grail-Built-in Functions'
method: builtins
___radixInteger___: aNumber
	"The kernel Integer bin/hex/oct render.  CPython's bin/hex/oct coerce the
	argument with operator.index() -- i.e. x.__index__() -- so any object with
	__index__ works.  A kernel Integer is the fast path (used as-is); anything
	else (notably a mixed-in-int enum member -- class E(HexInt, Enum) -- which
	is AbstractPyInt-rooted and does NOT understand the kernel
	#printStringRadix:, yet answers __index__ with its int value) is routed
	through __index__.

	An object with NO __index__ used to be handed to #printStringRadix:
	anyway -- an env-0 MessageNotUnderstood, which Python cannot catch, so
	``bin(())'' did not raise TypeError, it took down the whole module run.
	``___asIndex___'' is the shared PEP 357 coercion and already raises
	CPython's ``'tuple' object cannot be interpreted as an integer''."

	(aNumber @env0:isKindOf: Integer) ifTrue: [^ aNumber].
	^ aNumber ___asIndex___
%

category: 'Grail-Built-in Functions'
method: builtins
callable: anObject
	"Python builtin callable(x) — fixed-arity fast path.  Classes are
	always callable (instantiation); everything else by the presence of
	``__call__`` (or the Grail call protocol on BoundMethod/closures,
	which both compile ``__call__:``-shaped entries or value:value:)."

	(anObject isKindOf: Behavior) ifTrue: [^ true].
	(anObject isKindOf: BoundMethod) ifTrue: [^ true].
	(anObject isKindOf: ExecBlock) ifTrue: [^ true].
	"UnboundMethod is what ``Cls.method'' answers -- CPython's plain function
	taking self first -- and it is obviously callable, but it implements the
	Grail call protocol as ``value:value:'' rather than ``__call__:'', so the
	respondsTo: probe below missed it and ``callable(Cls.method)'' was False.

	This surfaced through unittest discovery, which is the reason it matters
	beyond introspection: getTestCaseNames keeps a name only if
	``callable(getattr(cls, name))''.  A test method that a decorator had
	rebound (``@unittest.skipIf'' returns the function unchanged, so the
	class attribute becomes the UnboundMethod it was handed) was therefore
	dropped from discovery entirely -- not failed, not skipped, just never
	found."
	(anObject isKindOf: UnboundMethod) ifTrue: [^ true].
	"``def __call__'' compiles to a selector whose shape depends on its
	ARITY, and only the one-argument form was probed.  So an instance of a
	class defining the ordinary no-argument ``__call__(self)'' -- or the
	varargs ``__call__(self, *args)'' -- reported False while calling it
	worked.  Neither object nor PythonInstance defines any of these, so
	responding to one means the class really did declare it."
	((anObject ___respondsTo___: #'__call__')
		or: [(anObject ___respondsTo___: #'__call__:')
		or: [(anObject ___respondsTo___: #'__call__:_:')
		or: [(anObject ___respondsTo___: #'__call__:_:_:')
		or: [anObject ___respondsTo___: #'___call__:kw:']]]])
		ifTrue: [^ true].
	"Same problem once more, for the OTHER shapes of Grail's call protocol.
	functools.partial implements ``value:value:'' rather than ``__call__:'',
	so ``callable(partial(f))'' answered False -- which CPython documents as
	True, and which test_functools asserts on the line before it calls the
	object successfully.

	Asks WHO owns the selector, not merely whether the receiver responds:
	both of these have a base implementation that every object inherits
	(PythonInstance's forwarder, and object's ``not callable'' raiser), so a
	bare respondsTo: would report every object in the image as callable."
	^ self ___definesOwnCallProtocol___: anObject
%

category: 'Grail-Private'
method: builtins
___definesOwnCallProtocol___: anObject
	"True when anObject's class supplies one of Grail's call entry points
	ITSELF, rather than inheriting the base implementation.  Three are
	inherited by objects that are NOT callable and so can never count:
	PythonInstance's ``value:value:'' and its ``___pyCallValue___:kw:''
	both merely forward to __call__ (raising a TypeError-shaped DNU when
	the class declares none), and object's ``___pyCallValue___:kw:''
	exists only to raise ``not callable''."

	| cls owner |
	cls := anObject @env0:class.
	owner := cls @env0:whichClassIncludesSelector: #'value:value:' environmentId: 1.
	(owner @env0:~~ nil
		and: [owner @env0:~~ PythonInstance and: [owner @env0:~~ object]])
		ifTrue: [^ true].
	owner := cls
		@env0:whichClassIncludesSelector: #'___pyCallValue___:kw:' environmentId: 1.
	^ owner @env0:~~ nil
		and: [owner @env0:~~ PythonInstance and: [owner @env0:~~ object]]
%

category: 'Grail-Built-in Functions'
method: builtins
chr: anInteger
	"Python builtin chr(i) — fixed-arity fast path.

	DELIBERATE DEVIATION: CPython's chr() accepts lone surrogates
	(0xD800-0xDFFF), but a GemStone Unicode string cannot hold one —
	downstream string construction dies with the UNCATCHABLE 'receiver
	contains a codePoint not valid for Unicode' error (it killed the
	whole test_re module run via test_bigcharset).  Raise a catchable
	ValueError at the source instead."

	| cp |
	"CPython coerces with __index__, so chr(65.0) is a TypeError, not a
	character.  Grail compared the Float against the range bounds (which
	succeeds), then handed it to Character class>>codePoint: -- an
	UNCATCHABLE ArgumentTypeError (error 2094, rtErrBadArgKind) that ended
	the whole test_builtin run rather than failing chr()'s own test."
	cp := anInteger ___asIndex___.
	(cp @env0:< 0 or: [cp @env0:> 16r10FFFF]) ifTrue: [
		"CPython raises ValueError for a codepoint outside 0..0x10FFFF;
		without this guard Character codePoint: raises an UNCATCHABLE Smalltalk
		OutOfRange (error 2723), which escaped as an ST error rather than the
		re parser's expected `bad escape` PatternError -- the parser probes
		chr(c) precisely to catch that ValueError (test_re
		test_sre_character_literals / _class_literals: \U00110000)."
		ValueError ___signal___: 'chr() arg not in range(0x110000)'].
	(cp @env0:>= 16rD800 and: [cp @env0:<= 16rDFFF]) ifTrue: [
		ValueError ___signal___: 'chr() arg is a lone surrogate, which Grail strings cannot represent'].
	^ (Character @env0:codePoint: cp) @env0:asString
%

category: 'Grail-Built-in Functions'
method: builtins
dir: anObject
	"Python builtin dir(x) — fixed-arity fast path."

	^ anObject __dir__
%

category: 'Grail-Built-in Functions'
method: builtins
___dirOfNamespace___: aMapping
	"The zero-argument ``dir()'': the names in the caller's scope, SORTED.

	CallAst rewrites the bare call and hands the same namespace locals() would
	answer -- a snapshot dict in a function, the live module view at module
	scope -- so this only has to order the keys.  Sorted because dir() is
	documented to be, and callers compare the result."

	^ self sorted: (list @env1:__new__: aMapping)
%

! ``enumerate'' is a TYPE, not a builtins function -- see Python/enumerate.gs.
! It had four entry points here (enumerate:, enumerate:_:, _enumerate:kw: and
! the ___enumerate___:start: core).  They are gone rather than kept as
! shorthand: NameAst treats any name the builtins class publishes a method for
! as a fast-path builtin and emits a BoundMethod for it, so while they existed
! the bare name ``enumerate'' evaluated to that wrapper instead of the class.
! ``enum = enumerate'' then stored a BoundMethod, and ``type(enumerate(s)) is
! enumerate'' was false.  Removing them lets the name resolve to the class the
! same way ``list'' and ``tuple'' do, and a direct ``enumerate(x)'' call
! becomes ordinary instantiation, which is where the argument checking lives.

category: 'Grail-Built-in Functions'
method: builtins
hash: anObject
	"Python builtin hash(x) — fixed-arity fast path.

	A CLASS hashes by IDENTITY.  CPython computes hash(SomeClass) with
	type.__hash__, never with the class's own ``__hash__'' -- that one
	describes its INSTANCES.  Reading it off the class is wrong twice over:
	for a mapping type it is the None that makes instances unhashable
	(collections.UserDict sets exactly that), so hash() answered None and the
	set machinery then died on ``nil doesNotUnderstand: #\\''.

	Not a corner case: copy.py keys its atomic-type tables as SETS OF
	CLASSES, so every copy.copy hashes the type first."

	(anObject @env0:isKindOf: Behavior) ifTrue: [^ anObject @env0:identityHash].
	^ [anObject __hash__] @env0:on: MessageNotUnderstood do: [:ex |
		TypeError ___signal___: 'unhashable type'
	]
%

category: 'Grail-Built-in Functions'
method: builtins
hex: aNumber
	"Python builtin hex(x) — fixed-arity fast path."

	^ (self ___radixString___: aNumber prefix: '0x' radix: 16) @env0:asLowercase
%

category: 'Grail-Built-in Functions'
method: builtins
id: anObject
	"Python builtin id(x) — fixed-arity fast path."

	^ anObject @env0:identityHash
%

category: 'Grail-Built-in Functions'
method: builtins
iter: anObject
	"Python builtin iter(x) — return an iterator over x by calling
	x.__iter__().  Raises TypeError if x has no __iter__ method.

	The two-arg sentinel form ``iter(callable, sentinel)`` is the
	``iter:_:`` method below."

	| result |
	"CPython sentinel: a class that explicitly sets ``__iter__ = None''
	is NOT iterable, and iter(x) raises TypeError even when x defines
	__getitem__.  Without this, Grail falls through (below) to
	``anObject __iter__'', whose PythonInstance fallback walks the legacy
	__getitem__(0..n) sequence protocol EAGERLY — on an unbounded
	__getitem__ (test_iter's NoIterClass) that materialises without bound
	into an uncatchable VM OutOfMemory.  ___classAttrDunder___ reads a
	dunder set as a class-body ATTRIBUTE (the None singleton here) and
	answers nil for a real __iter__ method or an absent one, so a genuine
	iterable is unaffected."
	(anObject ___classAttrDunder___: #'__iter__') == None
		ifTrue: [
			TypeError @env0:signal: ('''' @env0:,
				(anObject @env0:class @env0:name) @env0:,
				''' object is not iterable')
		].

	"``___respondsTo___:`` walks the inheritance chain — needed because
	``__iter__`` lives on CharacterCollection for strings, on SetProtocol
	for sets, etc., not on the leaf class."
	(anObject ___respondsTo___: #'__iter__')
		ifFalse: [
			TypeError @env0:signal: ('''' @env0:,
				(anObject @env0:class @env0:name) @env0:,
				''' object is not iterable')
		].

	"CPython's PyObject_GetIter verifies that the object returned by
	__iter__ is itself an iterator (defines __next__) and raises
	``iter() returned non-iterator of type '...''' otherwise
	(test_iter's test_new_style_iter_class: __iter__ returns self, but
	the class has no __next__).  ``___respondsTo___:'' cannot see this:
	PythonInstance carries a catchable-TypeError __next__ FALLBACK on
	every instance, so it always answers true.  ``___hasProtocol___:''
	asks the real question -- is __next__ defined BELOW that fallback
	level -- so a genuine iterator (seq_iterator/str_iterator/... define a
	real __next__) is unaffected."
	result := anObject __iter__.
	(result ___hasProtocol___: '__next__')
		ifFalse: [
			TypeError ___signal___: ('iter() returned non-iterator of type ''' @env0:,
				(result @env0:class @env0:name @env0:asString) @env0:,
				'''')
		].
	^ result
%

category: 'Grail-Built-in Functions'
method: builtins
iter: aCallable _: aSentinel
	"Python builtin iter(callable, sentinel) — the two-argument form.
	Returns a callable_iterator that calls ``aCallable()'' with no arguments
	on each next() and raises StopIteration once a returned value equals
	(Python ==) aSentinel.  aCallable must be callable (a function or an
	instance whose class defines __call__); CPython raises TypeError for a
	non-callable first argument."

	(self callable: aCallable)
		@env0:ifFalse: [
			TypeError @env0:signal: 'iter(v, w): v must be callable'].
	^ callable_iterator ___on: aCallable sentinel: aSentinel
%

category: 'Grail-Built-in Functions'
method: builtins
next: anIterator
	"Python builtin next(it) — call it.__next__().  Propagates
	StopIteration when the iterator is exhausted; caller can wrap
	in try/except or use the two-arg form below.

	Grail compiles a generator EXPRESSION ``(x for x in ...)'' to an
	eager OrderedCollection rather than a lazy iterator, so a receiver
	that answers ``__iter__'' but not ``__next__'' is materialised to
	its iterator first — ``next(genexp)'' then yields its first
	element (the ``first match'' idiom in django's accepted_type)."

	^ (self ___asIterator___: anIterator) __next__
%

category: 'Grail-Built-in Functions'
method: builtins
___asIterator___: anIterator
	"Return anIterator itself when it is already an iterator (answers
	``__next__''), else its ``__iter__''.  Bridges Grail's eager
	generator-expression collections into the next()/StopIteration
	protocol."

	((anIterator ___respondsTo___: #'__next__') not
		and: [anIterator ___respondsTo___: #'__iter__'])
		ifTrue: [^ anIterator __iter__].
	^ anIterator
%

category: 'Grail-Built-in Functions'
method: builtins
next: anIterator _: aDefault
	"Python builtin next(it, default) — return default instead of
	propagating StopIteration when the iterator is exhausted.
	Used by re/__init__.py's `next(iter(_cache))` LRU pop pattern
	(though that one always pops a real key, so the default path
	is the safety net)."

	^ [(self ___asIterator___: anIterator) __next__]
		@env0:on: StopIteration
		do: [:ex | aDefault]
%

category: 'Grail-Built-in Functions'
method: builtins
len: anObject
	"Python builtin len(x) — fixed-arity fast path."

	| className errorMsg |
	^ [anObject __len__] @env0:on: MessageNotUnderstood do: [:ex |
		className := (anObject @env0:class) @env0:name.
		errorMsg := 'object of type ''' @env0:, className.
		errorMsg := errorMsg @env0:, ''' has no len()'.
		TypeError ___signal___: errorMsg
	]
%

category: 'Grail-Built-in Functions'
method: builtins
max: anIterable
	"Python builtin max(iterable) — fixed-arity fast path."

	| iter maxVal first done |
	iter := anIterable __iter__.
	first := true.
	maxVal := nil.
	done := false.
	[done] @env0:whileFalse: [
		| item |
		[
			item := iter __next__.
			first ifTrue: [
				maxVal := item.
				first := false
			] ifFalse: [
				(item ___cmpGt___: maxVal) ifTrue: [maxVal := item]
			]
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	"An EMPTY iterable used to answer Smalltalk nil -- not None, not an
	error, but the one value Python has no name for, handed back into
	Python code to fail somewhere else entirely.  CPython raises here."
	first ifTrue: [
		ValueError ___signal___: 'max() iterable argument is empty'].
	^ maxVal
%

category: 'Grail-Built-in Functions'
method: builtins
min: a _: b
	"Python builtin min(a, b) — 2-arg fast path.

	Compares through ___cmpLt___/___cmpGt___ -- the OPERATOR-level comparison
	-- rather than sending the __lt__/__gt__ dunder directly.  A dunder may
	answer the NotImplemented sentinel, which is not a Boolean: ``min(3j, 1j)''
	died with an uncatchable ``Expected #'___NotImplemented___' to be a
	Boolean'' where CPython raises TypeError.  The operator level is what turns
	the sentinel into the reflected call and then into that TypeError, and it is
	what CPython's min/max use (PyObject_RichCompare).
	"

	^ (a ___cmpLt___: b) ifTrue: [a] ifFalse: [b]
%

category: 'Python-Built-in Functions'
method: builtins
max: a _: b
	"Python builtin max(a, b) — 2-arg fast path.  See min:_: for why the
	comparison goes through ___cmpGt___ and not __gt__."

	^ (a ___cmpGt___: b) ifTrue: [a] ifFalse: [b]
%

category: 'Grail-Built-in Functions'
method: builtins
_min: positional kw: kwargs
	"Python ``min(iterable, *, key=None, default=...)'' varargs form.
	Single positional → reduce iterable; multiple positionals →
	pick smallest by ``key'' (if given) or natural comparison.
	``default'' only consulted when iterable is empty."

	^ self ___minOrMax___: positional kw: kwargs lessThan: true
%

category: 'Grail-Built-in Functions'
method: builtins
_max: positional kw: kwargs
	"Python ``max(iterable, *, key=None, default=...)'' varargs form."

	^ self ___minOrMax___: positional kw: kwargs lessThan: false
%

category: 'Grail-Built-in Functions'
method: builtins
___minOrMax___: positional kw: kwargs lessThan: pickSmaller
	"Shared helper for the varargs forms of min and max."

	| iterable keyFn default iter best done bestKey hasDefault gotAny |
	"Zero positionals is a TypeError in CPython, not the empty-sequence
	ValueError: ``min()'' is a call that never had an argument to reduce,
	which is a different mistake from ``min([])''."
	self ___requireArgs___: positional atLeast: 1
		message: (pickSmaller @env0:ifTrue: ['min'] @env0:ifFalse: ['max'])
			@env0:, ' expected at least 1 argument, got '
			@env0:, positional @env0:size @env0:printString.
	keyFn := (kwargs @env0:notNil and: [kwargs @env0:includesKey: 'key'])
		@env0:ifTrue: [kwargs @env0:at: 'key']
		@env0:ifFalse: [nil].
	"Explicit key=None means no key (CPython)."
	keyFn == None ifTrue: [keyFn := nil].
	hasDefault := kwargs @env0:notNil and: [kwargs @env0:includesKey: 'default'].
	default := hasDefault @env0:ifTrue: [kwargs @env0:at: 'default'] @env0:ifFalse: [nil].
	iterable := (positional @env0:size) @env0:= 1
		@env0:ifTrue: [positional @env0:at: 1]
		@env0:ifFalse: [positional].
	iter := iterable __iter__.
	gotAny := false.
	done := false.
	best := nil.
	bestKey := nil.
	[done] @env0:whileFalse: [
		[
			| item itemKey isBetter |
			item := iter __next__.
			itemKey := keyFn @env0:isNil @env0:ifTrue: [item] @env0:ifFalse: [
				keyFn ___pyCallValue___: { item } kw: nil].
			gotAny @env0:ifFalse: [
				best := item.
				bestKey := itemKey.
				gotAny := true
			] @env0:ifTrue: [
				isBetter := pickSmaller
					@env0:ifTrue: [itemKey ___cmpLt___: bestKey]
					@env0:ifFalse: [itemKey ___cmpGt___: bestKey].
				isBetter @env0:ifTrue: [best := item. bestKey := itemKey]
			]
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	gotAny @env0:ifFalse: [
		hasDefault @env0:ifTrue: [^ default].
		ValueError ___signal___: (pickSmaller @env0:ifTrue: ['min'] @env0:ifFalse: ['max'])
			@env0:, '() iterable argument is empty'].
	^ best
%

category: 'Python-Built-in Functions'
method: builtins
min: anIterable
	"Python builtin min(iterable) — fixed-arity fast path.  See min:_: for why
	the comparison goes through ___cmpLt___ and not __lt__."

	| iter minVal first done |
	iter := anIterable __iter__.
	first := true.
	minVal := nil.
	done := false.
	[done] @env0:whileFalse: [
		| item |
		[
			item := iter __next__.
			first ifTrue: [
				minVal := item.
				first := false
			] ifFalse: [
				(item ___cmpLt___: minVal) ifTrue: [minVal := item]
			]
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	"An EMPTY iterable used to answer Smalltalk nil -- not None, not an
	error, but the one value Python has no name for, handed back into
	Python code to fail somewhere else entirely.  CPython raises here."
	first ifTrue: [
		ValueError ___signal___: 'min() iterable argument is empty'].
	^ minVal
%

category: 'Grail-Built-in Functions'
method: builtins
oct: aNumber
	"Python builtin oct(x) — fixed-arity fast path."

	^ self ___radixString___: aNumber prefix: '0o' radix: 8
%

category: 'Grail-Built-in Functions'
method: builtins
___buildLocals___: pairsArray
	"Backing for the compile-time locals() rewrite (CallAst >>
	printLocalsCallOn:).  pairsArray holds {nameString. value} pairs
	for every name in the enclosing function scope; entries whose
	value is Smalltalk nil are locals that are unbound at the call
	moment and are omitted (nil ≡ absent — Python None is the None
	singleton, never nil).  Answers a fresh dict, like CPython's
	function-scope locals() snapshot."

	| d |
	d := dict ___new___.
	pairsArray @env0:do: [:pair |
		(pair @env0:at: 2) == nil ifFalse: [
			d __setitem__: ((pair @env0:at: 1) @env0:asUnicodeString) _: (pair @env0:at: 2)]].
	^ d
%

category: 'Grail-Built-in Functions'
method: builtins
___buildClassBodyLocals___: pairsArray forClass: aClass
	"Backing for the CLASS-BODY locals()/vars() rewrite (CallAst >>
	printClassBodyLocalsOn:).  Same pairs as ___buildLocals___: -- the names the
	body has bound so far -- but the answer is a ClassBodyLocals, so a write
	through it binds a class attribute instead of vanishing.

	The entries go in BEFORE the class is bound, which is what keeps seeding
	from writing through: ClassBodyLocals >> __setitem__ is the inherited dict
	store until ___grailBindClass___ runs."

	| d |
	d := ClassBodyLocals ___new___.
	pairsArray @env0:do: [:pair |
		(pair @env0:at: 2) == nil ifFalse: [
			d __setitem__: ((pair @env0:at: 1) @env0:asUnicodeString) _: (pair @env0:at: 2)]].
	d ___grailBindClass___: aClass.
	^ d
%

category: 'Grail-Built-in Functions'
method: builtins
___evalScopeFor___: moduleOrNil locals: localsDict
	"Evaluation namespace for a bare in-function eval()/exec() (CallAst >>
	printBareEvalExecOn:): the enclosing module's globals with the
	function's locals laid OVER them.

	Only the locals used to be passed, so an expression could read an
	enclosing local but not a module-level name -- eval('date(1, 2, 3)')
	answered `undefined symbol date' even though the module imported it
	(test_roundtrip).  CPython's bare eval() sees the caller's globals AND
	locals, so both belong here, locals last because they shadow.

	A COPY, not the live PyModuleDict view: _eval reflects any bindings the
	expression makes (walrus, etc.) back into whatever it was handed, and
	those must not become real module globals.  This is also why the module
	is read defensively -- the eval()/exec() harness compiles code with no
	real module instance, and a nil or non-module receiver simply
	contributes nothing rather than failing."

	| merged |
	merged := dict ___new___.
	(moduleOrNil @env0:notNil @env0:and: [moduleOrNil @env0:isKindOf: module]) ifTrue: [
		(PyModuleDict @env0:on: moduleOrNil) @env0:keysAndValuesDo: [:k :v |
			merged __setitem__: (k @env0:asString @env0:asUnicodeString) _: v]].
	localsDict @env0:isNil ifFalse: [
		localsDict @env0:keysAndValuesDo: [:k :v |
			merged __setitem__: (k @env0:asString @env0:asUnicodeString) _: v]].
	^ merged
%

category: 'Grail-Built-in Functions'
method: builtins
open: file
	"Python builtin open(file) — fixed-arity fast path; text read mode.
	Implementation lives in FileIO class >> ___open___:mode:encoding:."

	^ FileIO ___open___: file mode: nil encoding: nil
%

category: 'Grail-Built-in Functions'
method: builtins
open: file _: mode
	"Python builtin open(file, mode) — fixed-arity fast path."

	^ FileIO ___open___: file mode: mode encoding: nil
%

category: 'Grail-Built-in Functions'
method: builtins
open: file _: mode _: buffering
	"Python builtin open(file, mode, buffering) — fixed-arity fast path.
	buffering is accepted and ignored (GsFile buffers internally)."

	^ FileIO ___open___: file mode: mode encoding: nil
%

category: 'Grail-Built-in Functions'
method: builtins
open: file _: mode _: buffering _: encoding
	"Python builtin open(file, mode, buffering, encoding) — fixed-arity
	fast path.  buffering is accepted and ignored."

	^ FileIO ___open___: file mode: mode encoding: encoding
%

category: 'Grail-Built-in Functions'
method: builtins
_open: positional kw: kwargs
	"Python builtin open(file, mode='r', buffering=-1, encoding=None,
	errors=None, newline=None, closefd=True, opener=None) — varargs fast
	path for kwarg call shapes like open(p, encoding='utf-8').
	buffering / errors / newline / closefd / opener are accepted and
	ignored (no newline translation; GsFile buffers internally)."

	| nargs file mode encoding |
	nargs := positional @env0:size.
	file := (nargs @env0:>= 1)
		ifTrue: [positional @env0:at: 1]
		ifFalse: [
			(kwargs == nil) ifTrue: [
				TypeError ___signal___: 'open() missing required argument: ''file'''].
			kwargs @env0:at: 'file' ifAbsent: [
				TypeError ___signal___: 'open() missing required argument: ''file''']].
	mode := (nargs @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			(kwargs == nil)
				ifTrue: [nil]
				ifFalse: [kwargs @env0:at: 'mode' ifAbsent: [nil]]].
	encoding := (nargs @env0:>= 4)
		ifTrue: [positional @env0:at: 4]
		ifFalse: [
			(kwargs == nil)
				ifTrue: [nil]
				ifFalse: [kwargs @env0:at: 'encoding' ifAbsent: [nil]]].
	^ FileIO ___open___: file mode: mode encoding: encoding
%

category: 'Grail-Built-in Functions'
method: builtins
ord: aString
	"Python builtin ord(c) — fixed-arity fast path."

	| size char errorMsg sizeStr |
	size := aString @env0:size.
	(size == 1) ifFalse: [
		sizeStr := size @env0:asString.
		errorMsg := 'ord() expected a character, but string of length ' @env0:, sizeStr.
		errorMsg := errorMsg @env0:, ' found'.
		TypeError ___signal___: errorMsg
	].
	"A str holding a LONE SURROGATE has no Character to fetch -- GemStone's
	Character cannot hold D800..DFFF, which is why PyStrSurrogate keeps raw
	code points instead of indexable slots.  ``at:'' on one answered an
	uncatchable OffsetError (``object does not have varying instVars''), so
	``ord('\udce9')'' -- an ordinary thing to do to a surrogateescape'd byte
	-- brought the session down rather than answering 56553."
	(aString isKindOf: PyStrSurrogate) ifTrue: [
		^ (aString @env0:___codePoints___) @env0:at: 1].
	char := aString @env0:at: 1.
	"A str yields a Character (-> codePoint); a bytes/bytearray yields the
	byte value directly as an Integer (ord(b'A') == 65)."
	^ (char @env0:isKindOf: Integer) ifTrue: [char] ifFalse: [char @env0:codePoint]
%

category: 'Grail-Built-in Functions'
method: builtins
repr: anObject
	"Python builtin repr(x) — fixed-arity fast path."

	^ anObject __repr__
%

category: 'Grail-Format Spec Engine'
method: builtins
___digitsAreAllZero___: digits
	"True when a formatted numeric body carries no significant digit -- ``0'',
	``0.00'', ``0.0e+00'' -- which is how PEP 682's ``z'' decides that a negative
	value has ROUNDED to zero and should shed its sign.  Only the MANTISSA is
	examined: the exponent of ``0.0e+00'' is irrelevant, and ``-1.00e-03'' must
	keep its sign even though the exponent is negative."

	| mantissa ePos |
	digits @env0:isNil ifTrue: [^ false].
	ePos := 0.
	1 @env0:to: digits @env0:size do: [:k |
		(ePos @env0:= 0 and: [#($e $E) @env0:includes: (digits @env0:at: k)])
			ifTrue: [ePos := k]].
	mantissa := ePos @env0:= 0
		ifTrue: [digits]
		ifFalse: [digits @env0:copyFrom: 1 to: ePos @env0:- 1].
	mantissa @env0:do: [:c |
		(c @env0:isDigit and: [c @env0:~= $0]) ifTrue: [^ false]].
	^ true
%

category: 'Grail-Format Spec Engine'
method: builtins
___checkDuplicateGrouping___: spec at: i first: firstChar
	"A SECOND grouping char right after the first is its own diagnosis, not
	trailing junk, and CPython's two messages are exact.  The same char twice
	reads as ``grouping + presentation type'' -> ``Cannot specify ',' with ','.''
	(invalid_thousands_separator_type); a MIXED pair is caught by the
	underscore/comma parse itself -> ``Cannot specify both ',' and '_'.''  Grail
	let both fall through to the type check, whose generic ``Invalid format
	specifier'' matched neither.  Applies at BOTH grouping positions -- before
	the dot and after the precision -- so ``{:,_}'' and ``{:.,_f}'' agree."

	(i @env0:> spec @env0:size) ifTrue: [^ self].
	(#($, $_) @env0:includes: (spec @env0:at: i)) ifFalse: [^ self].
	(spec @env0:at: i) @env0:= firstChar
		ifTrue: [
			^ ValueError ___signal___: ('Cannot specify ''' @env0:,
				(String @env0:with: firstChar) @env0:, ''' with ''' @env0:,
				(String @env0:with: firstChar) @env0:, '''.')].
	^ ValueError ___signal___: 'Cannot specify both '','' and ''_''.'
%

category: 'Grail-Format Spec Engine'
method: builtins
___badFormatSpec___: spec typeName: typeName
	"CPython 3.14 names the VALUE's type in this message -- ``Invalid format
	specifier '%M' for object of type 'complex''' -- and test_format matches it
	exactly (test_unicode_in_error_message, test_better_error_message_format).
	A missing type name still produces the shorter form rather than ''nil''."

	typeName == nil ifTrue: [
		^ ValueError ___signal___: ('Invalid format specifier '''
			@env0:, spec @env0:asString @env0:, '''')].
	^ ValueError ___signal___: ('Invalid format specifier '''
		@env0:, spec @env0:asString @env0:, ''' for object of type '''
		@env0:, typeName @env0:asString @env0:, '''')
%

category: 'Grail-Format Spec Engine'
method: builtins
___pyTypeNameOf___: value
	"The PYTHON type name for an error message -- ``str'', not ``Unicode7''.
	Falls back to the Smalltalk class name if the Python route fails, so a
	diagnostic can never itself raise."

	^ [(value @env1:__class__) @env1:__name__ @env0:asString]
		@env0:on: AbstractException
		do: [:ex | ex @env0:return: value @env0:class @env0:name @env0:asString]
%

category: 'Grail-Format Spec Engine'
method: builtins
___parseFormatSpec___: spec typeName: typeName
	"Parse Python's format-spec mini-language
	    [[fill]align][sign][#][0][width][,|_][.precision[,|_]][type]
	into a 9-slot Array: {fill. align. sign. alt. width. grouping.
	precision. type. fracGrouping}.  align/grouping/precision/type/
	fracGrouping are nil when absent.  fracGrouping is a SEPARATE,
	optional grouping char for the digits after the decimal point
	(only meaningful for f/F/e/E; test_format's '.10_f' ->
	'123456.123_456_000_0') -- it sits right after the precision
	digits (if any), so it's parsed at the tail of the precision
	clause, not alongside the integer-part `grouping` before it.
	Raises ValueError on trailing junk, empty precision (a dot with
	neither digits nor a grouping char after it), or 'n' combined
	with either grouping (CPython: ``Cannot specify ',' with 'n'.'')."

	| fill align sign alt width grouping precision type i n c fracGrouping noNegZero |
	fill := $ . align := nil. sign := $-. alt := false.
	width := 0. grouping := nil. precision := nil. type := nil.
	fracGrouping := nil. noNegZero := false.
	i := 1. n := spec @env0:size.
	(n @env0:>= 2 and: [#($< $> $^ $=) @env0:includes: (spec @env0:at: 2)])
		ifTrue: [
			fill := spec @env0:at: 1.
			align := spec @env0:at: 2.
			i := 3]
		ifFalse: [
			(n @env0:>= 1 and: [#($< $> $^ $=) @env0:includes: (spec @env0:at: 1)])
				ifTrue: [
					align := spec @env0:at: 1.
					i := 2]].
	(i @env0:<= n and: [#($+ $- $ ) @env0:includes: (spec @env0:at: i)]) ifTrue: [
		sign := spec @env0:at: i. i := i @env0:+ 1].
	"PEP 682's ``z'' -- negative-zero coercion -- sits between the sign and the
	``#'' flag.  ONLY there: ``z+f'' and ``fz'' are invalid specs, and they stay
	invalid because a ``z'' anywhere else is simply not consumed and falls through
	to the type check (test_format test_specifier_z_error)."
	(i @env0:<= n and: [(spec @env0:at: i) @env0:= $z]) ifTrue: [
		noNegZero := true. i := i @env0:+ 1].
	(i @env0:<= n and: [(spec @env0:at: i) @env0:= $#]) ifTrue: [
		alt := true. i := i @env0:+ 1].
	(i @env0:<= n and: [(spec @env0:at: i) @env0:= $0]) ifTrue: [
		"The '0' flag always sets the fill char, even when align was
		already given explicitly -- it only DEFAULTS align to '=' (the
		sign-aware zero-pad) when align is otherwise unset (test_format:
		format(x, '>021_._f') keeps align '>' but still zero-fills)."
		align == nil ifTrue: [align := $=].
		fill := $0.
		i := i @env0:+ 1].
	[i @env0:<= n and: [(spec @env0:at: i) @env0:isDigit]] @env0:whileTrue: [
		width := (width @env0:* 10) @env0:+ (spec @env0:at: i) @env0:digitValue.
		i := i @env0:+ 1].
	(i @env0:<= n and: [#($, $_) @env0:includes: (spec @env0:at: i)]) ifTrue: [
		grouping := spec @env0:at: i. i := i @env0:+ 1.
		self ___checkDuplicateGrouping___: spec at: i first: grouping].
	(i @env0:<= n and: [(spec @env0:at: i) @env0:= $.]) ifTrue: [
		i := i @env0:+ 1.
		"A dot needs SOMETHING after it -- either precision digits or
		(new in 3.14) a fraction grouping char directly; a dot at the
		very end, or followed by neither, is 'missing precision'."
		((i @env0:> n) or: [(spec @env0:at: i) @env0:isDigit @env0:not
			and: [(#($, $_) @env0:includes: (spec @env0:at: i)) @env0:not]])
			ifTrue: [ValueError ___signal___: 'Format specifier missing precision'].
		((i @env0:<= n) and: [(spec @env0:at: i) @env0:isDigit]) ifTrue: [
			precision := 0.
			[i @env0:<= n and: [(spec @env0:at: i) @env0:isDigit]] @env0:whileTrue: [
				precision := (precision @env0:* 10) @env0:+ (spec @env0:at: i) @env0:digitValue.
				i := i @env0:+ 1].
			"CPython stores the precision in a C int and rejects anything wider;
			Grail's is an arbitrary-precision Integer, so ``format(1.2, '.%df' %
			(sys.maxsize + 1))'' went on to ask for that many fraction digits and
			died on an UNCATCHABLE NumericError (``an Integer would exceed 130144
			bits'').  Cap it here so the failure is the ValueError CPython raises
			(test_format test_precision)."
			precision @env0:> 2147483647 ifTrue: [
				ValueError ___signal___: 'precision too big']].
		"Optional fraction-part grouping char, right after the precision
		digits (if any) -- e.g. '.10_f' or the digit-less '._f'.  A
		SECOND such char (or leftover digits after it) isn't consumed
		here and falls through to the type check below, which rejects
		it as an invalid format specifier (test_format: '.6_,f' etc.)."
		(i @env0:<= n and: [#($, $_) @env0:includes: (spec @env0:at: i)]) ifTrue: [
			fracGrouping := spec @env0:at: i. i := i @env0:+ 1.
			"The fraction-grouping position needs the SAME diagnosis as the
			integer one: ``{:.,_f}'' is a mixed pair, not trailing junk."
			self ___checkDuplicateGrouping___: spec at: i first: fracGrouping]].
	i @env0:<= n ifTrue: [
		c := spec @env0:at: i.
		(#($b $c $d $e $E $f $F $g $G $n $o $s $x $X $%) @env0:includes: c) ifFalse: [
			^ self ___badFormatSpec___: spec typeName: typeName].
		type := c.
		i := i @env0:+ 1].
	i @env0:<= n ifTrue: [
		^ self ___badFormatSpec___: spec typeName: typeName].
	(type @env0:= $n and: [grouping @env0:notNil or: [fracGrouping @env0:notNil]]) ifTrue: [
		ValueError ___signal___: ('Cannot specify ''' @env0:,
			(String @env0:with: (grouping @env0:ifNil: [fracGrouping])) @env0:, ''' with ''n''.')].
	"``z'' is meaningless for an INTEGER presentation type -- there is no negative
	zero to coerce -- and CPython rejects it by name.  Note this is about the
	TYPE, not the value: ``f'{-0:z.1f}''' passes an int and is fine."
	(noNegZero and: [#($b $c $d $o $x $X $n $s) @env0:includes: type]) ifTrue: [
		ValueError ___signal___: 'Negative zero coercion (z) not allowed'].
	^ { fill. align. sign. alt. width. grouping. precision. type. fracGrouping.
		noNegZero }
%

category: 'Grail-Format Spec Engine'
method: builtins
___formatPadBody___: body fill: fill align: align width: width signLength: signLength
	"Pad body to width.  align $= keeps the first signLength chars
	(sign and/or 0x prefix) on the left and pads between them and the
	digits."

	| padCount pad left lp rp leftPad |
	width @env0:<= body @env0:size ifTrue: [^ body @env0:asString].
	padCount := width @env0:- body @env0:size.
	"atAllPut: answers its ARGUMENT, not the receiver — assign first."
	pad := String @env0:new: padCount.
	pad @env0:atAllPut: fill.
	align @env0:= $< ifTrue: [^ (body @env0:, pad) @env0:asString].
	align @env0:= $^ ifTrue: [
		leftPad := padCount @env0:// 2.
		lp := String @env0:new: leftPad.
		lp @env0:atAllPut: fill.
		rp := String @env0:new: padCount @env0:- leftPad.
		rp @env0:atAllPut: fill.
		^ (lp @env0:, body @env0:, rp) @env0:asString].
	align @env0:= $= ifTrue: [
		left := body @env0:copyFrom: 1 to: signLength.
		^ (left @env0:, pad @env0:, (body @env0:copyFrom: signLength @env0:+ 1 to: body @env0:size)) @env0:asString].
	^ (pad @env0:, body) @env0:asString
%

category: 'Grail-Format Spec Engine'
method: builtins
___groupDigits___: digits separator: sep every: groupSize
	"Insert sep into a digit string every groupSize digits from the
	right: '1234567' -> '1,234,567'."

	| out count i |
	digits @env0:size @env0:<= groupSize ifTrue: [^ digits].
	out := ''.
	count := 0.
	i := digits @env0:size.
	[i @env0:>= 1] @env0:whileTrue: [
		out := (String @env0:with: (digits @env0:at: i)) @env0:, out.
		count := count @env0:+ 1.
		(count @env0:\\ groupSize @env0:= 0 and: [i @env0:> 1]) ifTrue: [
			out := (String @env0:with: sep) @env0:, out].
		i := i @env0:- 1].
	^ out
%

category: 'Grail-Format Spec Engine'
method: builtins
___groupDigitsFromLeft___: digits separator: sep every: groupSize
	"Insert sep into a digit string every groupSize digits from the
	LEFT: '1234560000' -> '123_456_000_0'.  Used for the fractional
	part of a float format (grouping counts out from the decimal
	point, unlike the integer part's from-the-right thousands
	grouping in ___groupDigits___:)."

	| out i n |
	n := digits @env0:size.
	n @env0:<= groupSize ifTrue: [^ digits].
	out := ''.
	i := 1.
	[i @env0:<= n] @env0:whileTrue: [
		out := out @env0:, (String @env0:with: (digits @env0:at: i)).
		(i @env0:\\ groupSize @env0:= 0 and: [i @env0:< n]) ifTrue: [
			out := out @env0:, (String @env0:with: sep)].
		i := i @env0:+ 1].
	^ out
%

category: 'Grail-Format Spec Engine'
method: builtins
___signString___: negative sign: sign
	negative ifTrue: [^ '-'].
	sign @env0:= $+ ifTrue: [^ '+'].
	sign @env0:= $  ifTrue: [^ ' '].
	^ ''
%

category: 'Grail-Format Spec Engine'
method: builtins
___formatIntValue___: value parsed: p
	"Format an Integer per a parsed spec.  Float-ish types delegate
	to the float formatter (CPython allows format(3, '.2f'))."

	| fill align sign alt width grouping type digits prefix signStr body groupSize |
	fill := p @env0:at: 1. align := p @env0:at: 2. sign := p @env0:at: 3.
	alt := p @env0:at: 4. width := p @env0:at: 5. grouping := p @env0:at: 6.
	type := p @env0:at: 8.
	(#($e $E $f $F $g $G $%) @env0:includes: type) ifTrue: [
		^ self ___formatFloatValue___: value @env0:asFloat parsed: p].
	type @env0:= $c ifTrue: [
		body := String @env0:with: (Character @env0:codePoint: value).
		align == nil ifTrue: [align := $<].
		^ self ___formatPadBody___: body fill: fill align: align width: width signLength: 0].
	type @env0:= $s ifTrue: [
		ValueError ___signal___: 'Unknown format code ''s'' for object of type ''int'''].
	prefix := ''.
	(type == nil or: [type @env0:= $d or: [type @env0:= $n]]) ifTrue: [
		digits := value @env0:abs @env0:printString]
	ifFalse: [
		type @env0:= $b ifTrue: [
			digits := value @env0:abs @env0:printStringRadix: 2.
			alt ifTrue: [prefix := '0b']].
		type @env0:= $o ifTrue: [
			digits := value @env0:abs @env0:printStringRadix: 8.
			alt ifTrue: [prefix := '0o']].
		type @env0:= $x ifTrue: [
			digits := (value @env0:abs @env0:printStringRadix: 16) @env0:asLowercase.
			alt ifTrue: [prefix := '0x']].
		type @env0:= $X ifTrue: [
			digits := value @env0:abs @env0:printStringRadix: 16.
			alt ifTrue: [prefix := '0X']]].
	grouping == nil ifFalse: [
		groupSize := (type == nil or: [type @env0:= $d or: [type @env0:= $n]])
			ifTrue: [3] ifFalse: [4].
		digits := self ___groupDigits___: digits separator: grouping every: groupSize].
	signStr := self ___signString___: value @env0:< 0 sign: sign.
	body := signStr @env0:, prefix @env0:, digits.
	align == nil ifTrue: [align := $>].
	^ self ___formatPadBody___: body fill: fill align: align
		width: width signLength: signStr @env0:size @env0:+ prefix @env0:size
%

category: 'Grail-Format Spec Engine'
method: builtins
___fixedDigits___: absValue precision: precision
	"Fixed-point digit string for a non-negative Float: 'II.FFF' with
	exactly `precision` fraction digits ('II' when precision = 0).
	Uses EXACT Fraction arithmetic throughout -- ``(absValue * factor)
	rounded'' multiplies in FLOAT space and can itself introduce
	rounding error (the same class of bug float>>__round__:'s rewrite
	fixed), which made format()'s '.Nf' and round(x, N) occasionally
	disagree (test_matches_float_format).  Round-half-to-even, matching
	CPython's correctly-rounded dtoa (formatfloat_testcases.txt:
	'%.0f' of 2.5 -> '2', of 3.5 -> '4')."

	| factor fr num den scaledNum q r ip frac |
	factor := 10 @env0:raisedTo: precision.
	fr := absValue @env0:asFraction.
	num := fr @env0:numerator.
	den := fr @env0:denominator.
	scaledNum := num @env0:* factor.
	q := scaledNum @env0:// den.
	r := scaledNum @env0:- (q @env0:* den).
	((r @env0:* 2) @env0:> den) ifTrue: [q := q @env0:+ 1]
		ifFalse: [((r @env0:* 2) @env0:= den) ifTrue: [(q @env0:even) ifFalse: [q := q @env0:+ 1]]].
	ip := q @env0:// factor.
	frac := q @env0:\\ factor.
	precision @env0:= 0 ifTrue: [^ ip @env0:printString].
	frac := frac @env0:printString.
	[frac @env0:size @env0:< precision] @env0:whileTrue: [frac := '0' @env0:, frac].
	^ (ip @env0:printString) @env0:, '.' @env0:, frac
%

category: 'Grail-Format Spec Engine'
method: builtins
___decExp10Of___: absValue
	"The EXACT decimal exponent of a non-negative Float: the integer e with
	10^e <= absValue < 10^(e+1) (0 for zero).  Derived from digit COUNTS of the
	exact rational value, so unlike a loop of float divisions it cannot drift."

	| fr num den k |
	absValue @env0:= 0 ifTrue: [^ 0].
	fr := absValue @env0:asFraction.
	num := fr @env0:numerator.
	den := fr @env0:denominator.
	"value >= 1: floor(value) has d digits exactly when 10^(d-1) <= value < 10^d."
	num @env0:>= den ifTrue: [
		^ (num @env0:// den) @env0:printString @env0:size @env0:- 1].
	"value < 1: floor(1/value) having k digits narrows the exponent to -k or
	1-k (10^-k < value <= 10^(1-k)); one exact comparison picks between them."
	k := (den @env0:// num) @env0:printString @env0:size.
	^ ((num @env0:* (10 @env0:raisedTo: k @env0:- 1)) @env0:>= den)
		ifTrue: [1 @env0:- k]
		ifFalse: [0 @env0:- k]
%

category: 'Grail-Format Spec Engine'
method: builtins
___sciParts___: absValue precision: precision
	"Round a non-negative Float to `precision` + 1 significant decimal digits
	EXACTLY, answering { mantissaString. exponent } -- 'M.MMM' (bare 'M' when
	precision is 0) and the power of ten it multiplies.  Round-half-to-even on
	the exact binary value, matching CPython's correctly-rounded dtoa.

	Also used by %g/%G, which must decide fixed-vs-scientific on the exponent
	AFTER rounding.

	This replaces normalising the mantissa into [1, 10) by repeated float
	division/multiplication, which was lossy in BOTH directions and corrupted
	the digits before rounding ever ran:
	  * 1505.0 / 10 / 10 / 10 lands just ABOVE the exact 1.505, so '%.2e'
	    rounded up to '1.51e+03' where CPython -- rounding an exact tie to
	    even -- gives '1.50e+03'.
	  * 0.1 * 10 is exactly 1.0, so '%.17e' of 0.1 printed
	    '1.00000000000000000e-01' instead of '1.00000000000000006e-01'.  Every
	    digit of information was gone before rounding began."

	| exp fr num den shift sn sd q r qs mstr |
	exp := self ___decExp10Of___: absValue.
	fr := absValue @env0:asFraction.
	num := fr @env0:numerator.
	den := fr @env0:denominator.
	"Scale so the digits to keep become an integer: value * 10^(precision - exp)."
	shift := precision @env0:- exp.
	shift @env0:>= 0
		ifTrue: [sn := num @env0:* (10 @env0:raisedTo: shift). sd := den]
		ifFalse: [sn := num. sd := den @env0:* (10 @env0:raisedTo: 0 @env0:- shift)].
	q := sn @env0:// sd.
	r := sn @env0:- (q @env0:* sd).
	((r @env0:* 2) @env0:> sd) ifTrue: [q := q @env0:+ 1]
		ifFalse: [((r @env0:* 2) @env0:= sd) ifTrue: [(q @env0:even) ifFalse: [q := q @env0:+ 1]]].
	qs := q @env0:printString.
	"Rounding can carry into an extra digit (9.99 -> 10.0); renormalize.  The
	carried value is exactly 10^(precision+1), so truncating is exact."
	qs @env0:size @env0:> (precision @env0:+ 1) ifTrue: [
		exp := exp @env0:+ 1.
		qs := qs @env0:copyFrom: 1 to: precision @env0:+ 1].
	"Only a zero value can come out SHORT (every other q spans exactly
	precision+1 digits by construction)."
	[qs @env0:size @env0:< (precision @env0:+ 1)] @env0:whileTrue: [qs := '0' @env0:, qs].
	mstr := precision @env0:= 0
		ifTrue: [qs]
		ifFalse: [(qs @env0:copyFrom: 1 to: 1) @env0:, '.'
			@env0:, (qs @env0:copyFrom: 2 to: qs @env0:size)].
	^ { mstr. exp }
%

category: 'Grail-Format Spec Engine'
method: builtins
___sciDigitsFromParts___: parts upper: upper
	"Assemble 'M.MMMe+EE' from a ___sciParts___ pair.  The exponent always
	carries a sign and at least two digits, as in CPython."

	| mstr exp estr |
	mstr := parts @env0:at: 1.
	exp := parts @env0:at: 2.
	estr := exp @env0:abs @env0:printString.
	estr @env0:size @env0:< 2 ifTrue: [estr := '0' @env0:, estr].
	estr := (exp @env0:< 0 ifTrue: ['-'] ifFalse: ['+']) @env0:, estr.
	^ mstr @env0:, (upper ifTrue: ['E'] ifFalse: ['e']) @env0:, estr
%

category: 'Grail-Format Spec Engine'
method: builtins
___sciDigits___: absValue precision: precision upper: upper
	"Scientific-notation digit string for a non-negative Float:
	'M.MMMe+EE'."

	^ self ___sciDigitsFromParts___: (self ___sciParts___: absValue precision: precision)
		upper: upper
%

category: 'Grail-Format Spec Engine'
method: builtins
___stripTrailingZeros___: digitString
	"For %g/g: drop trailing fraction zeros (and a bare trailing dot)
	from the MANTISSA.  An exponent suffix ('e+03') must survive
	verbatim, so locate it first rather than stripping from the raw
	string's end -- which silently no-ops whenever an exponent is
	present ('1.0e+03' has a trailing '3', not '0'), leaving bogus
	un-stripped zeros in the mantissa (test_format_testfile: '%.2g' of
	1000 must be '1e+03', not '1.0e+03')."

	| ePos mant suffix |
	(digitString @env0:includes: $.) ifFalse: [^ digitString].
	ePos := 0.
	1 @env0:to: digitString @env0:size do: [:k |
		((digitString @env0:at: k) @env0:= $e or: [(digitString @env0:at: k) @env0:= $E]) ifTrue: [ePos := k]].
	mant := ePos @env0:= 0 ifTrue: [digitString] ifFalse: [digitString @env0:copyFrom: 1 to: ePos @env0:- 1].
	suffix := ePos @env0:= 0 ifTrue: [''] ifFalse: [digitString @env0:copyFrom: ePos to: digitString @env0:size].
	[mant @env0:size @env0:> 0 and: [(mant @env0:at: mant @env0:size) @env0:= $0]]
		@env0:whileTrue: [mant := mant @env0:copyFrom: 1 to: mant @env0:size @env0:- 1].
	(mant @env0:size @env0:> 0 and: [(mant @env0:at: mant @env0:size) @env0:= $.]) ifTrue: [
		mant := mant @env0:copyFrom: 1 to: mant @env0:size @env0:- 1].
	^ mant @env0:, suffix
%

category: 'Grail-Format Spec Engine'
method: builtins
___formatFloatValue___: value parsed: p
	"Format a Float per a parsed spec (types f F e E g G % and the
	bare-precision form)."

	| fill align sign alt width grouping precision type neg a digits signStr body suffix exp10 sciParts fracGrouping |
	fill := p @env0:at: 1. align := p @env0:at: 2. sign := p @env0:at: 3.
	alt := p @env0:at: 4. width := p @env0:at: 5. grouping := p @env0:at: 6.
	precision := p @env0:at: 7. type := p @env0:at: 8. fracGrouping := p @env0:at: 9.
	"'n' (locale-aware number format) is valid for a float and behaves like
	'g' -- Grail does not insert locale grouping separators, but the general
	digit format is the same (test_enum _MinimalOutputTests.test_format_specs
	formats a float ReprEnum member with '{:n}')."
	type @env0:= $n ifTrue: [type := $g].
	(#($b $o $x $X $c $d $s) @env0:includes: type) ifTrue: [
		ValueError ___signal___: ('Unknown format code for object of type ''float''')].
	"Non-finite values format as their str with sign/width only."
	(value @env0:= value) ifFalse: [
		digits := 'nan'. neg := false]
	ifTrue: [
		"Use the sign bit (not < 0) so -0.0 is recognized as negative."
		neg := value @env0:signBit @env0:= 1.
		a := value @env0:abs.
		a @env0:> 1e300 ifTrue: [
			a @env0:* 0 @env0:= 0 ifFalse: [digits := 'inf']]].
	(digits @env0:notNil and: [#($F $E $G) @env0:includes: type]) ifTrue: [
		digits := digits @env0:asUppercase].
	"A float's digits are generated by exact integer scaling (value * 10^precision),
	and GemStone's LargeInteger tops out near 130144 bits -- about 39000 decimal
	digits -- so ``'%12.*f' % (123456, 1.0)'' blew up with an UNCATCHABLE
	NumericError (``an Integer would exceed 130144 bits'').  CPython does produce
	that 123456-digit string; Grail cannot, so raise the OverflowError CPython
	uses for over-long float conversions instead of dying.  The bound is far above
	any real format and far below the VM's ceiling, leaving room for the value's
	own magnitude (1e100 adds only ~100 digits).  test_format's test_common_format
	passes overflowok=True precisely to allow this."
	(precision @env0:notNil and: [precision @env0:> 30000]) ifTrue: [
		OverflowError ___signal___: 'formatted float is too long (precision too large)'].
	digits == nil ifTrue: [
		suffix := ''.
		type @env0:= $% ifTrue: [
			a := a @env0:* 100.
			suffix := '%'.
			type := $f].
		(type @env0:= $f or: [type @env0:= $F]) ifTrue: [
			digits := self ___fixedDigits___: a
				precision: (precision == nil ifTrue: [6] ifFalse: [precision])]
		ifFalse: [
		(type @env0:= $e or: [type @env0:= $E]) ifTrue: [
			digits := self ___sciDigits___: a
				precision: (precision == nil ifTrue: [6] ifFalse: [precision])
				upper: type @env0:= $E]
		ifFalse: [
			"g / G / bare precision / bare float."
			(type == nil and: [precision == nil]) ifTrue: [
				digits := a @env0:printString]
			ifFalse: [
				precision == nil ifTrue: [precision := 6].
				precision @env0:= 0 ifTrue: [precision := 1].
				"CPython's %g renders with '%.<p-1>e' FIRST and then picks
				notation from the exponent it got, so the decision must use the
				exponent AFTER rounding.  Deciding on the pre-rounding one made
				'%.3g' of 999.9 print '1000': the exponent 2 chose fixed
				notation, while rounding to three significant digits actually
				yields 1.00e+03 -- exponent 3 -- and CPython prints '1e+03'."
				sciParts := self ___sciParts___: a precision: precision @env0:- 1.
				exp10 := sciParts @env0:at: 2.
				((exp10 @env0:>= -4) @env0:and: [exp10 @env0:< (type == nil ifTrue: [precision @env0:- 1] ifFalse: [precision])])
					ifTrue: [
						digits := self ___fixedDigits___: a precision: (precision @env0:- 1 @env0:- exp10 @env0:max: 0).
						"'#' (alt form) keeps trailing fraction zeros that plain g/G
						would otherwise strip (test_format_testfile: '%#.4g' of 0.2
						-> '0.2000', not '0.2')."
						alt ifFalse: [digits := self ___stripTrailingZeros___: digits]]
					ifFalse: [
						digits := self ___sciDigitsFromParts___: sciParts upper: type @env0:= $G.
						alt ifFalse: [digits := self ___stripTrailingZeros___: digits]]]]].
		digits := digits @env0:, suffix.
		"'#' also forces a decimal point even with zero fraction digits
		('%#.0f' of 0 -> '0.', '%#.0e' of 1 -> '1.e+00', '%#.0g' of 2 ->
		'2.') -- insert it right before any exponent marker (or at the
		very end for f/F/plain g without one) when not already present."
		(alt @env0:and: [(digits @env0:includes: $.) @env0:not]) ifTrue: [
			| ePos2 |
			ePos2 := 0.
			1 @env0:to: digits @env0:size do: [:k |
				((digits @env0:at: k) @env0:= $e or: [(digits @env0:at: k) @env0:= $E]) ifTrue: [ePos2 := k]].
			digits := ePos2 @env0:= 0
				ifTrue: [digits @env0:, '.']
				ifFalse: [(digits @env0:copyFrom: 1 to: ePos2 @env0:- 1) @env0:, '.'
					@env0:, (digits @env0:copyFrom: ePos2 to: digits @env0:size)]]].
	"PEP 682: with ``z'', a value that ROUNDS to zero loses its minus sign, so
	``f'{-0.001:z.2f}''' is ``0.00'' while ``f'{-0.001:z.2e}''' keeps ``-1.00e-03''
	because that one does NOT round to zero.  Testing the produced DIGITS rather
	than the input is what gets both right -- the rounding has already happened
	by here."
	(neg and: [(p @env0:size @env0:>= 10) and: [(p @env0:at: 10) @env0:= true]])
		ifTrue: [
			(self ___digitsAreAllZero___: digits) ifTrue: [neg := false]].
	signStr := self ___signString___: neg sign: sign.
	(grouping @env0:notNil or: [fracGrouping @env0:notNil]) ifTrue: [
		| ePos dotPos mainPart expSuffix ip fp dotStr zeroFillWithGrouping |
		"Split '<int>[.<frac>][e[+-]<exp>]' into its three pieces so the
		integer part and fraction part can be grouped INDEPENDENTLY
		(different separators, and the fraction groups LEFT-to-right
		from the point while the integer part groups RIGHT-to-left from
		it -- test_format's '+.11_e' -> '+1.234_561_234_56e+05' groups
		only the mantissa's fraction digits, never the exponent)."
		ePos := 0.
		1 @env0:to: digits @env0:size do: [:k |
			((digits @env0:at: k) @env0:= $e or: [(digits @env0:at: k) @env0:= $E]) ifTrue: [ePos := k]].
		expSuffix := ePos @env0:= 0 ifTrue: [''] ifFalse: [digits @env0:copyFrom: ePos to: digits @env0:size].
		mainPart := ePos @env0:= 0 ifTrue: [digits] ifFalse: [digits @env0:copyFrom: 1 to: ePos @env0:- 1].
		dotPos := mainPart @env0:indexOf: $..
		ip := dotPos @env0:= 0 ifTrue: [mainPart] ifFalse: [mainPart @env0:copyFrom: 1 to: dotPos @env0:- 1].
		fp := dotPos @env0:= 0 ifTrue: [''] ifFalse: [mainPart @env0:copyFrom: dotPos @env0:+ 1 to: mainPart @env0:size].
		dotStr := dotPos @env0:= 0 ifTrue: [''] ifFalse: ['.'].
		(fracGrouping @env0:notNil and: [fp @env0:notEmpty]) ifTrue: [
			fp := self ___groupDigitsFromLeft___: fp separator: fracGrouping every: 3].
		zeroFillWithGrouping := (align @env0:= $=) and: [grouping @env0:notNil].
		zeroFillWithGrouping
			ifTrue: [
				"CPython merges the sign-aware zero-fill with grouping: the
				synthetic zeros used to reach `width` are grouped together
				WITH the original integer digits as one continuous run, not
				appended after an already-grouped '123_456' (test_format:
				format(x, '021_._f') -> '0_000_123_456.123_456', not
				'000000123_456.123_456').  Grow the un-grouped integer digit
				count k (from its natural size) until grouping it would meet
				or exceed the target width, then group once at that size --
				this mirrors ___formatPadBody___:'s zero-fill for the plain
				(no grouping) case, just solved in digit-count space instead
				of character space because separators add extra characters
				that themselves count toward width."
				| fixedLen target k zeros |
				fixedLen := signStr @env0:size @env0:+ dotStr @env0:size @env0:+ fp @env0:size @env0:+ expSuffix @env0:size.
				target := width @env0:- fixedLen.
				k := ip @env0:size.
				[(k @env0:+ ((k @env0:+ 2) @env0:// 3) @env0:- 1) @env0:< target] @env0:whileTrue: [k := k @env0:+ 1].
				(k @env0:> ip @env0:size) ifTrue: [
					zeros := String @env0:new: k @env0:- ip @env0:size.
					zeros @env0:atAllPut: $0.
					ip := zeros @env0:, ip].
				ip := self ___groupDigits___: ip separator: grouping every: 3]
			ifFalse: [
				grouping @env0:notNil ifTrue: [ip := self ___groupDigits___: ip separator: grouping every: 3]].
		digits := ip @env0:, dotStr @env0:, fp @env0:, expSuffix].
	body := signStr @env0:, digits.
	align == nil ifTrue: [align := $>].
	^ self ___formatPadBody___: body fill: fill align: align
		width: width signLength: signStr @env0:size
%

category: 'Grail-Format Spec Engine'
method: builtins
___formatStrValue___: value parsed: p
	"Format a string per a parsed spec: optional .precision truncation,
	then fill/align/width.  Default alignment is left."

	| fill align width precision type body |
	fill := p @env0:at: 1. align := p @env0:at: 2. width := p @env0:at: 5.
	precision := p @env0:at: 7. type := p @env0:at: 8.
	(type == nil or: [type @env0:= $s]) ifFalse: [
		ValueError ___signal___: ('Unknown format code for object of type ''str''')].
	body := value.
	((precision == nil) @env0:not and: [body @env0:size @env0:> precision]) ifTrue: [
		body := body @env0:copyFrom: 1 to: precision].
	align == nil ifTrue: [align := $<].
	align @env0:= $= ifTrue: [
		ValueError ___signal___: '''='' alignment not allowed in string format specifier'].
	^ self ___formatPadBody___: body fill: fill align: align width: width signLength: 0
%

category: 'Grail-Format Spec Engine'
method: builtins
___isPrintfConversion___: conv
	"Is ``conv'' a conversion character printf-style %-formatting accepts?
	``%'' is not listed: the caller consumes a literal ``%%'' before asking."

	^ #($s $r $a $c $d $i $u $o $x $X $e $E $f $F $g $G) @env0:includes: conv
%

category: 'Grail-Format Spec Engine'
method: builtins
___printfCharBody___: value
	"``%c'' operand for str %-formatting: an int code point, or a ONE-character
	string.  The range check is not cosmetic -- an out-of-range code point used
	to reach Character class>>codePoint:, whose OutOfRange is a SMALLTALK error
	that Python ``except'' cannot catch, so ``'%c' % -1'' aborted the whole
	module instead of raising OverflowError (test_format test_str_format).
	The other shapes fell through to ``value asString'', which turned
	``'%c' % 3.14'' into ``3.14'' -- four characters from a %c."

	| iv |
	(value isKindOf: CharacterCollection) ifTrue: [
		value @env0:size @env0:= 1 ifTrue: [^ value @env0:asString].
		TypeError ___signal___:
			('%c requires an int or a unicode character, not a string of length '
				@env0:, value @env0:size @env0:printString)].
	iv := nil.
	(value isKindOf: Integer) ifTrue: [iv := value]
	ifFalse: [
		(value isKindOf: Boolean) ifTrue: [iv := value ifTrue: [1] ifFalse: [0]]
		ifFalse: [
			"An int SUBCLASS (or any __index__ provider) is accepted, as in
			CPython; a float is not, since it has no __index__."
			(value ___respondsTo___: #'__index__') ifTrue: [iv := value __index__]]].
	iv @env0:isNil ifTrue: [
		TypeError ___signal___: ('%c requires an int or a unicode character, not '
			@env0:, (self ___pyTypeNameOf___: value))].
	((iv @env0:>= 0) @env0:and: [iv @env0:<= 16r10FFFF]) ifFalse: [
		OverflowError ___signal___: '%c arg not in range(0x110000)'].
	^ String @env0:with: (Character @env0:codePoint: iv @env0:asInteger)
%

category: 'Grail-Format Spec Engine'
method: builtins
___printfAsFloat___: value
	"``%e/%E/%f/%F/%g/%G'' operand for str %-formatting.  A bare
	``value asFloat'' silently accepted a STRING, because GemStone's
	String>>asFloat PARSES one -- so ``'%g' % '1''' produced ``1'' where
	CPython raises TypeError (test_format test_str_format)."

	(value isKindOf: Float) ifTrue: [^ value].
	(value isKindOf: Integer) ifTrue: [^ value @env0:asFloat].
	(value isKindOf: Boolean) ifTrue: [^ value ifTrue: [1.0] ifFalse: [0.0]].
	(value ___respondsTo___: #'__float__') ifTrue: [^ (value __float__) @env0:asFloat].
	(value ___respondsTo___: #'__index__') ifTrue: [^ (value __index__) @env0:asFloat].
	TypeError ___signal___: ('must be real number, not '
		@env0:, (self ___pyTypeNameOf___: value))
%

category: 'Grail-Format Spec Engine'
method: builtins
___printfAsInteger___: value conv: conv
	"``%d/%i/%u/%o/%x/%X'' operand for str %-formatting.  As with
	___printfAsFloat___, the bare ``value asInteger'' it replaces PARSED a
	string, so ``'%d' % '1''' answered ``1''.  d/i/u take any real number
	(``'%d' % 3.7'' truncates, as in CPython); o/x/X require an integer."

	(value isKindOf: Integer) ifTrue: [^ value].
	(value isKindOf: Boolean) ifTrue: [^ value ifTrue: [1] ifFalse: [0]].
	((conv @env0:= $d) @env0:or: [(conv @env0:= $i) @env0:or: [conv @env0:= $u]]) ifTrue: [
		(value isKindOf: Float) ifTrue: [^ value @env0:truncated].
		(value ___respondsTo___: #'__index__') ifTrue: [^ value __index__].
		(value ___respondsTo___: #'__int__') ifTrue: [^ value __int__].
		TypeError ___signal___: ('%' @env0:, (String @env0:with: conv)
			@env0:, ' format: a real number is required, not '
			@env0:, (self ___pyTypeNameOf___: value))].
	(value ___respondsTo___: #'__index__') ifTrue: [^ value __index__].
	TypeError ___signal___: ('%' @env0:, (String @env0:with: conv)
		@env0:, ' format: an integer is required, not '
		@env0:, (self ___pyTypeNameOf___: value))
%

category: 'Grail-Format Spec Engine'
method: builtins
___printfConvert___: value conv: conv flags: flags width: width precision: precision
	"Render one printf %-field for str.__mod__: apply flags (- + space # 0),
	width and precision per the conversion char, reusing the str.format()
	value formatters for padding/sign/precision.  Conversions: s r a c
	(string-like) · d i u o x X (integer) · e E f F g G (float)."

	| leftAlign zeroPad plusSign spaceSign altForm body align fill iv neg absval digits prefix signStr signLen p |
	leftAlign := flags @env0:includes: $-.
	zeroPad := (flags @env0:includes: $0) @env0:and: [leftAlign @env0:not].
	plusSign := flags @env0:includes: $+.
	spaceSign := flags @env0:includes: (Character @env0:space).
	altForm := flags @env0:includes: $#.

	"--- string-like conversions: s r a c ---"
	(conv @env0:= $s @env0:or: [conv @env0:= $r @env0:or: [
		conv @env0:= $a @env0:or: [conv @env0:= $c]]]) ifTrue: [
		"%s IS str(value) and %r IS repr(value), so both delegate to the
		builtins that already implement them.  They used to fall back to
		Smalltalk asString / printString for anything outside a hand-kept
		list of types (ByteArray, CharacterCollection, Float), which leaked
		Smalltalk spellings into Python output for everything else:

		    '%s' % True        -> 'true'                  not 'True'
		    '%s' % None        -> 'aNoneType'             not 'None'
		    '%s' % [1, 2]      -> 'anOrderedCollection'   not '[1, 2]'
		    '%r' % [1, 2]      -> 'anOrderedCollection( 1, 2)'
		    '%r' % {'k': 1}    -> 'aPyDict( ''k''->1)'
		    '%r' % a_function  -> 'aBoundMethod'
		    '%r' % obj         -> 'aFoo', IGNORING a user __repr__

		The list grew one type at a time as individual tests demanded it,
		which is why str/bytes/float looked right while everything else did
		not.  Delegating instead fixes the whole matrix at once, and keeps
		the reasons those three were special-cased: bytes repr is ``b'...'''
		rather than 'aByteArray( 32, ...)'; str repr escapes control
		characters, so an embedded tab becomes '\t' and a NUL the four chars
		'\x00' (test_int / test_float test_error_message); and Float repr
		uses CPython's exponent-sign and inf/nan/-0.0 spellings rather than
		GemStone's ('%r' % 1e16 -> '1e+16').  All three now arrive via their
		own __repr__ through repr(), which is where that behaviour lives.

		No DNU risk: object carries env-1 __repr__ and __str__ defaults, so
		every value -- including nil, booleans and kernel numbers -- answers
		both.  And a value whose __repr__ RAISES still propagates rather than
		being masked, as before and as in CPython, because nothing here
		catches: builtins>>repr: is a bare ``anObject __repr__''.

		``self str:'' rather than ``value __str__'' so a str SUBCLASS coerces
		down to a plain str exactly as str() does."
		conv @env0:= $s ifTrue: [body := (self str: value) @env0:asString].
		conv @env0:= $r ifTrue: [body := (self repr: value) @env0:asString].
		conv @env0:= $a ifTrue: [body := (self ascii: value) @env0:asString].
		conv @env0:= $c ifTrue: [body := self ___printfCharBody___: value].
		"precision truncates s/r/a (not c)."
		(conv @env0:~= $c @env0:and: [
			precision ~~ nil @env0:and: [body @env0:size @env0:> precision]]) ifTrue: [
			body := body @env0:copyFrom: 1 to: precision].
		align := leftAlign ifTrue: [$<] ifFalse: [$>].
		^ self ___formatPadBody___: body fill: (Character @env0:space)
			align: align width: width signLength: 0].

	"--- float conversions: e E f F g G ---"
	(#($e $E $f $F $g $G) @env0:includes: conv) ifTrue: [
		fill := zeroPad ifTrue: [$0] ifFalse: [Character @env0:space].
		align := leftAlign ifTrue: [$<] ifFalse: [zeroPad ifTrue: [$=] ifFalse: [$>]].
		p := {
			fill.
			align.
			(plusSign ifTrue: [$+] ifFalse: [
				spaceSign ifTrue: [Character @env0:space] ifFalse: [$-]]).
			altForm.
			width.
			nil.
			precision.
			conv.
			nil "fracGrouping: printf-style '%' formatting has no grouping syntax" }.
		^ self ___formatFloatValue___: (self ___printfAsFloat___: value) parsed: p].

	"--- integer conversions: d i u o x X ---"
	iv := self ___printfAsInteger___: value conv: conv.
	neg := iv @env0:< 0.
	absval := iv @env0:abs.
	prefix := ''.
	(conv @env0:= $d @env0:or: [conv @env0:= $i @env0:or: [conv @env0:= $u]]) ifTrue: [
		digits := absval @env0:printString].
	conv @env0:= $o ifTrue: [
		digits := absval @env0:printStringRadix: 8.
		altForm ifTrue: [prefix := '0o']].
	conv @env0:= $x ifTrue: [
		digits := (absval @env0:printStringRadix: 16) @env0:asLowercase.
		altForm ifTrue: [prefix := '0x']].
	conv @env0:= $X ifTrue: [
		digits := (absval @env0:printStringRadix: 16) @env0:asUppercase.
		altForm ifTrue: [prefix := '0X']].
	digits == nil ifTrue: [
		"Name the offending character, as CPython does -- ``unsupported format
		character 'z''' -- so a caller can tell WHICH conversion it got wrong.
		test_format's test_specifier_z_error checks exactly this for ``%z.1f'',
		since ``z'' is a format-SPEC option and has no %-conversion meaning."
		ValueError ___signal___: ('unsupported format character '''
			@env0:, (String @env0:with: conv) @env0:, '''')].
	"integer precision = minimum digit count; the 0 flag is ignored when given."
	precision ~~ nil ifTrue: [
		((precision @env0:= 0) @env0:and: [absval @env0:= 0])
			ifTrue: [digits := '']
			ifFalse: [[digits @env0:size @env0:< precision]
				@env0:whileTrue: [digits := '0' @env0:, digits]]].
	signStr := neg ifTrue: ['-'] ifFalse: [
		plusSign ifTrue: ['+'] ifFalse: [spaceSign ifTrue: [' '] ifFalse: ['']]].
	body := signStr @env0:, prefix @env0:, digits.
	signLen := signStr @env0:size @env0:+ prefix @env0:size.
	(zeroPad @env0:and: [precision == nil])
		ifTrue: [fill := $0. align := $=]
		ifFalse: [fill := Character @env0:space.
			align := leftAlign ifTrue: [$<] ifFalse: [$>]].
	^ self ___formatPadBody___: body fill: fill align: align width: width signLength: signLen
%

category: 'Grail-Format Spec Engine'
method: builtins
___formatComplexParts___: aComplex parsed: p
	"``real'' + signed ``imag'' + 'j' for a complex whose spec names a
	presentation type, per CPython's format_complex_internal.  Each part is
	formatted with the TYPE / PRECISION / #-alt only: fill, align and width
	describe the whole result and are applied once by the caller, and applying
	them per part would pad each half separately.

	The imaginary part always shows its sign ('+' forced), which is why it is
	formatted with sign $+ regardless of what the spec asked for; the real part
	keeps the spec's own sign option."

	| rePart imPart reSpec imSpec |
	reSpec := { Character @env0:space. nil. (p @env0:at: 3). (p @env0:at: 4).
		0. (p @env0:at: 6). (p @env0:at: 7). (p @env0:at: 8). (p @env0:at: 9).
		(p @env0:size @env0:>= 10 ifTrue: [p @env0:at: 10] ifFalse: [false]) }.
	imSpec := { Character @env0:space. nil. $+. (p @env0:at: 4).
		0. (p @env0:at: 6). (p @env0:at: 7). (p @env0:at: 8). (p @env0:at: 9).
		(p @env0:size @env0:>= 10 ifTrue: [p @env0:at: 10] ifFalse: [false]) }.
	rePart := self ___formatFloatValue___: aComplex real @env0:asFloat parsed: reSpec.
	imPart := self ___formatFloatValue___: aComplex imag @env0:asFloat parsed: imSpec.
	^ rePart @env0:asString @env0:, imPart @env0:asString @env0:, 'j'
%

category: 'Grail-Format Spec Engine'
method: builtins
___formatValue___: value spec: spec
	"Shared entry point behind int/float/str __format__.  Empty spec
	is str(value); otherwise parse once and dispatch by type."

	| p |
	(spec == nil or: [spec @env0:isEmpty]) ifTrue: [^ value __str__].
	p := self ___parseFormatSpec___: spec
		typeName: (self ___pyTypeNameOf___: value).
	(value isKindOf: Float) ifTrue: [
		^ self ___formatFloatValue___: value parsed: p].
	(value isKindOf: Integer) ifTrue: [
		^ self ___formatIntValue___: value parsed: p].
	(value isKindOf: CharacterCollection) ifTrue: [
		^ self ___formatStrValue___: value @env0:asString parsed: p].
	^ self ___formatStrValue___: (value __str__) parsed: p
%

category: 'Grail-Built-in Functions'
method: builtins
format: aValue
	"Python builtin format(value) — defaults to format-spec ''''."

	^ aValue __format__: ''
%

category: 'Grail-Built-in Functions'
method: builtins
format: aValue _: aFormatSpec
	"Python builtin format(value, spec) — fixed-arity fast path.
	Delegates to value.__format__(spec).  Emitted by f-string codegen
	for placeholders that carry a format spec (e.g. ``f''{x:>4d}''``)."

	^ aValue __format__: aFormatSpec
%

category: 'Grail-Built-in Functions'
method: builtins
reversed: aSequence
	"Python builtin reversed(seq) — fixed-arity fast path.  Prefer
	the receiver's own __reversed__ (the Python protocol); fall back
	to reverseDo: for native Smalltalk SequenceableCollections that
	don't override.  Without the __reversed__ branch, Python user
	classes like collections.deque (which has __reversed__ but no
	env-0 reverseDo:) hit MNU."

	| lst |
	"``__reversed__ = None'' BLOCKS, the same rule that makes ``__hash__ =
	None'' unhashable: the lookup succeeds and yields None, so CPython reports
	the type as not reversible rather than falling back to the sequence
	protocol.  A class that declares __len__ and __getitem__ would otherwise
	reverse perfectly well, which is precisely what the block exists to
	prevent (test_enumerate's TestReversed.test_objmethods)."
	(self ___reversedBlocked___: aSequence)
		ifTrue: [^ self ___notReversible___: aSequence].
	(aSequence ___respondsTo___: #'__reversed__')
		ifTrue: [^ aSequence __reversed__].
	"A string reversed must yield 1-char STRINGS, matching forward str
	iteration -- the ``reverseDo:'' fallback yields Characters, so
	``list(reversed('abcd'))'' came back as [$d $c $b $a] not ['d','c','b','a']
	(test_deque test_reversed / test_extendleft).  bytes/bytearray are not
	CharacterCollections, so they keep the reverseDo: path (ints)."
	(aSequence @env0:isKindOf: CharacterCollection)
		ifTrue: [^ (aSequence @env0:reverse) __iter__].
	"OLD-STYLE SEQUENCE PROTOCOL.  A user class with no __reversed__ is
	reversible when it answers __getitem__, and CPython walks it DOWN from
	len - 1.  Grail went straight to the env-0 ``reverseDo:'', which such a
	class does not understand -- an uncatchable MNU, not the TypeError Python
	code catches.

	The two failure messages are distinct and CPython distinguishes them in
	this order: reversed_new tests PySequence_Check (i.e. __getitem__) FIRST,
	so an object with __len__ but no __getitem__ is ``not reversible'', and
	only then takes the length, so an object with __getitem__ but no __len__
	reports ``has no len()''."
	"A NATIVE Smalltalk sequence keeps the reverseDo: route.  It would satisfy
	the sequence protocol below too, but the iterator type is observable:
	pickle.py reduces each built-in iterator by type, and routing tuples
	through seq_iterator made a reversed tuple reload as a tuple_iterator --
	a different type than it started as (TestReversed.test_pickle)."
	(aSequence @env0:class @env0:whichClassIncludesSelector: #'reverseDo:'
		environmentId: 0) @env0:isNil ifFalse: [
		lst := list ___new___.
		aSequence @env0:reverseDo: [:item | lst append: item].
		^ lst __iter__].
	(self ___hasProtocolForCall___: aSequence _: '__getitem__') ifTrue: [
		(self ___hasProtocolForCall___: aSequence _: '__len__') ifFalse: [
			^ TypeError ___signal___: ('object of type '''
				@env0:, (aSequence ___pyTypeNameForError___)
				@env0:, ''' has no len()')].
		^ seq_iterator ___onReverse: aSequence].
	^ self ___notReversible___: aSequence
%

category: 'Grail-Built-in Functions'
method: builtins
___reversedBlocked___: anObject
	"True when anObject's class body bound __reversed__ to None.

	ClassDefAst compiles a class-body ``name = value'' to an accessor pair in
	category ``Grail-Class Attrs'' on the metaclass, so that is where the None
	is found -- ___respondsTo___ would not see it, and a plain getattr would
	answer the None without saying it came from a class-body binding rather
	than from an absent name."

	| owner |
	owner := anObject @env0:class @env0:class
		@env0:whichClassIncludesSelector: #'__reversed__' environmentId: 1.
	owner @env0:isNil ifTrue: [^ false].
	((owner @env0:categoryOfSelector: #'__reversed__' environmentId: 1)
		@env0:asString @env0:= 'Grail-Class Attrs') ifFalse: [^ false].
	^ (anObject @env0:class @env0:perform: #'__reversed__' env: 1)
		@env0:== (Python @env0:at: #None otherwise: nil)
%

category: 'Grail-Built-in Functions'
method: builtins
___notReversible___: aSequence
	"CPython's reversed_new error for a type that cannot be reversed."

	^ TypeError ___signal___: ('''' @env0:, (aSequence ___pyTypeNameForError___)
		@env0:, ''' object is not reversible')
%

category: 'Grail-Built-in Functions'
method: builtins
round: aNumber
	"Python builtin round(x) — fixed-arity fast path (1-arg form).
	The 2-arg form `round(x, ndigits)` lives at `_round:kw:`.
	__round__ first (CPython protocol): vendored fractions.Fraction
	implements banker's rounding there; the kernel #rounded was an
	uncatchable MNU on PythonInstances.

	Three possible shapes for a type's __round__, tried in order:
	  1. ___round__:kw: -- the VARARGS form Grail's Python-class
	     compiler generates for a user-defined dunder with a keyword/
	     default argument, e.g. fractions.py's
	     ``def __round__(self, ndigits=None)``.  This is NOT dead code
	     (a previous pass here deleted an earlier copy of this check
	     believing no class ever defines it, having only grepped for
	     OTHER call sites of the same selector) -- every Python-source
	     class with a defaulted dunder parameter compiles to exactly
	     this selector, never a bare __round__.
	  2. __round__ -- the plain 0-arg kernel-style dunder (Float, Int,
	     the native AbstractFraction kernel classes).
	  3. neither -- fall back to the kernel's own #rounded.
	whichClassIncludesSelector:environmentId: (not ___respondsTo___:)
	because a small Fraction value is a native GemStone SmallFraction
	under the hood, which -- like AbstractPyInt/AbstractPyFloat's
	kernel siblings -- does NOT descend from Grail's ``object'' root,
	so it does not understand ___respondsTo___: at all
	(MessageNotUnderstood, not just a false answer)."

	((aNumber @env0:class @env0:whichClassIncludesSelector: #'___round__:kw:' environmentId: 1) @env0:notNil)
		ifTrue: [^ aNumber perform: #'___round__:kw:' env: 1 withArguments: { { }. nil }].
	((aNumber @env0:class @env0:whichClassIncludesSelector: #'__round__' environmentId: 1) @env0:notNil)
		ifTrue: [^ aNumber @env0:perform: #'__round__' env: 1].
	"A non-number reaches the kernel's #rounded, which it does not understand
	-- an UNCATCHABLE MessageNotUnderstood where CPython raises a perfectly
	ordinary TypeError.  gettext._as_int is built on catching exactly that
	(``try: round(n) / except TypeError:'' is how it rejects a non-integer
	plural value), so the MNU escaped the except clause and killed the test.
	Converted the same way len: converts its own MNU, and worded as CPython
	words it: ``type str doesn't define __round__ method''."
	^ [aNumber @env0:rounded] @env0:on: MessageNotUnderstood do: [:ex |
		TypeError ___signal___: ('type ' @env0:,
			(bytes ___pyTypeNameOf___: aNumber) @env0:,
			' doesn''t define __round__ method')]
%

category: 'Grail-Built-in Functions'
method: builtins
memoryview: aBytesObject
	"Python builtin memoryview(b) — stub.
	Returns the argument unchanged.  Used by re/_compiler.py only in
	`_bytes_to_codes`, which optimizes character-class bytecode and
	is not on the path for plain regex compile.  Patterns that hit
	that path need a real memoryview with .cast()/.itemsize/.tolist();
	revisit when something actually trips this."

	^ aBytesObject
%

category: 'Grail-Built-in Functions'
method: builtins
___pyIter___: anIterable
	"Smalltalk-level mirror of itertools._iter's eager validation (see that
	function's docstring for the full rationale).  Real CPython's iter() /
	PyObject_GetIter does not just call __iter__ and trust the result -- it
	raises TypeError immediately for an object missing both __iter__ and
	__getitem__, and ALSO raises immediately when __iter__() returns an
	object that itself lacks __next__ (an ``iter() returned non-iterator of
	type ...'' TypeError).  Grail's PythonInstance fallback compiles catchable
	__iter__/__next__/__getitem__ stubs onto every instance, so a plain
	getattr-style probe can't tell a genuine iterable from one that merely
	inherited the fallback -- ___hasProtocolForCall___ tests method
	OWNERSHIP below that fallback level (and, unlike ___hasProtocol___,
	answers for a CLASS receiver whether calling aName on that class
	itself works, via its METACLASS -- needed for e.g. Enum classes,
	which are iterable through their metaclass's __iter__: iter(MainEnum)
	must not raise, see test_enum).  Used by map:_:/filter:_:/zip so those
	builtins reject non-iterables as eagerly as CPython does (see
	test_itertools.TestVariousIteratorArgs)."

	| result |
	(anIterable ___hasProtocolForCall___: '__getitem__') ifTrue: [^ anIterable __iter__].
	(anIterable ___hasProtocolForCall___: '__iter__') ifTrue: [
		result := anIterable __iter__.
		(result ___hasProtocolForCall___: '__next__') ifFalse: [
			TypeError ___signal___: ('iter() returned non-iterator of type '''
				@env0:, (result @env0:class @env0:name)) @env0:, ''''].
		^ result].
	TypeError ___signal___: (('''' @env0:, (anIterable @env0:class @env0:name))
		@env0:, ''' object is not iterable')
%

category: 'Python-Built-in Functions'
method: builtins
map: aFunction _: anIterable
	"Python builtin map(func, iter) — LAZY, as in CPython.  Eager
	materialization looped forever (then OOM-killed the session) on
	infinite sources: take(4, map(f, itertools.count()))."

	^ map_iterator ___on: aFunction sources: { self ___pyIter___: anIterable }
%

category: 'Grail-Built-in Functions'
method: builtins
filter: aFunction _: anIterable
	"Python builtin filter(func, iter) — keep items where func(item)
	is truthy; filter(None, iter) keeps truthy items.  LAZY, as in
	CPython (see map:_:)."

	^ filter_iterator ___on: aFunction source: (self ___pyIter___: anIterable)
%

category: 'Grail-Built-in Functions'
method: builtins
_filter: positional kw: kwargs
	"Varargs form of filter() for BoundMethod indirect calls -- reached
	whenever the call's arg count isn't exactly 2 (including 0 or 1,
	which filter:_:'s fixed arity can't match at all).  Unconditionally
	indexing positional at 1/2 without a size check crashed with a raw
	VM-level OffsetError for filter() / filter(f) rather than a Python
	TypeError (test_itertools.TestBasicOps.test_filter's
	``self.assertRaises(TypeError, filter)'')."

	(kwargs @env0:notNil and: [kwargs @env0:size @env0:> 0]) ifTrue: [
		TypeError ___signal___: 'filter() takes no keyword arguments'].
	positional @env0:size @env0:= 2 ifFalse: [
		TypeError ___signal___: (('filter expected 2 arguments, got '
			@env0:, positional @env0:size @env0:printString))].
	^ self filter: (positional @env0:at: 1) _: (positional @env0:at: 2)
%

category: 'Grail-Built-in Functions'
method: builtins
vars: anObject
	"Python builtin vars(obj) — the instance namespace as a fresh
	dict: dynamic instVars plus non-nil named instVars (nil means
	unbound in Grail); module/dict-backed receivers also contribute
	their dict entries.  The zero-arg vars() is rewritten to locals()
	at compile time (CallAst), matching CPython's equivalence."

	| d |
	"Reject receivers that cannot carry attributes BEFORE touching the
	dynamic-instVar API — signaling from inside an on:Error handler
	around dynamicInstVarPairs on a special (immediate) object loops
	the signal machinery into AlmostOutOfStack."
	((anObject == nil)
		or: [(anObject == None)
		or: [(anObject isKindOf: Number)
		or: [(anObject isKindOf: Boolean)
		or: [(anObject isKindOf: CharacterCollection)
		or: [(anObject @env0:class @env0:isPointers) @env0:not]]]]]) ifTrue: [
		TypeError ___signal___: 'vars() argument must have __dict__ attribute'].
	"vars(module) IS the module's __dict__ in CPython -- a LIVE mapping.
	Return the PyModuleDict view (same object semantics as globals()
	inside the module) instead of a snapshot that would drop writes."
	(anObject isKindOf: module) ifTrue: [
		^ (Python @env0:at: #'PyModuleDict') @env0:on: anObject].
	d := dict ___new___.
	(anObject isKindOf: SymbolDictionary) ifTrue: [
		anObject @env0:keysDo: [:k |
			d __setitem__: k @env0:asString @env0:asUnicodeString _: (anObject @env0:at: k)]].
	(anObject @env0:dynamicInstanceVariables) @env0:do: [:nm |
		d __setitem__: (nm @env0:asString @env0:asUnicodeString)
			_: (anObject @env0:dynamicInstVarAt: nm)].
	(anObject @env0:class @env0:allInstVarNames) @env0:doWithIndex: [:nm :i |
		| v |
		v := anObject @env0:instVarAt: i.
		v == nil ifFalse: [
			d __setitem__: (nm @env0:asString @env0:asUnicodeString) _: v]].
	^ d
%

category: 'Grail-Built-in Functions'
method: builtins
ascii: anObject
	"Python builtin ascii(x) — repr() with non-ASCII characters
	escaped as \\xHH / \\uHHHH / \\UHHHHHHHH."

	| r ws cp hex |
	r := anObject __repr__.
	ws := AppendStream @env0:on: Unicode7 @env0:new.
	r @env0:do: [:ch |
		cp := ch @env0:codePoint.
		cp @env0:<= 126
			ifTrue: [ws @env0:nextPut: ch]
			ifFalse: [
				hex := (cp @env0:printStringRadix: 16) @env0:asLowercase.
				cp @env0:<= 255
					ifTrue: [
						[hex @env0:size @env0:< 2] @env0:whileTrue: [hex := '0' @env0:, hex].
						ws @env0:nextPutAll: '\x'.
						ws @env0:nextPutAll: hex]
					ifFalse: [
						cp @env0:<= 16rFFFF
							ifTrue: [
								[hex @env0:size @env0:< 4] @env0:whileTrue: [hex := '0' @env0:, hex].
								ws @env0:nextPutAll: '\u'.
								ws @env0:nextPutAll: hex]
							ifFalse: [
								[hex @env0:size @env0:< 8] @env0:whileTrue: [hex := '0' @env0:, hex].
								ws @env0:nextPutAll: '\U'.
								ws @env0:nextPutAll: hex]]]].
	^ ws @env0:contents
%

category: 'Grail-Built-in Functions'
method: builtins
help
	"Python builtin help() — Grail has no interactive help system."

	Transcript @env0:nextPutAll: 'Grail: call help(obj) to print obj.__doc__.'.
	Transcript @env0:cr.
	^ None
%

category: 'Grail-Built-in Functions'
method: builtins
help: anObject
	"Python builtin help(obj) — minimal: print the docstring."

	| doc |
	doc := [anObject __doc__] @env0:on: Error do: [:ex | nil].
	(doc == nil or: [doc == None]) ifTrue: [
		doc := 'No documentation available.'].
	Transcript @env0:nextPutAll: doc @env0:asString.
	Transcript @env0:cr.
	^ None
%

category: 'Grail-Built-in Functions'
method: builtins
_help: positional kw: kwargs
	positional @env0:isEmpty ifTrue: [^ self help].
	^ self help: (positional @env0:at: 1)
%

category: 'Python-Built-in Functions'
method: builtins
sorted: anIterable
	"Python builtin sorted(iterable) — fixed-arity fast path."

	| lst iter done sortedArray |
	lst := list ___new___.
	iter := anIterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[
			| item |
			item := iter __next__.
			lst append: item
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	"GemStone's sort: returns a fresh sorted Array, not the receiver; copy it
	back over the list's slots so sorted() returns a Python list (not an Array,
	which is not a list: isinstance/== against a list literal would fail).
	___stableSortedArray: gives CPython-stable ordering (GemStone's @env0:sort:
	is not stable)."
	sortedArray := lst ___stableSortedArray: nil reverse: false.
	lst @env0:replaceFrom: 1 to: lst @env0:size with: sortedArray startingAt: 1.
	^ lst
%

category: 'Python-Built-in Functions'
method: builtins
_sorted: positional kw: kwargs
	"Python builtin sorted(iterable, *, key=None, reverse=False) —
	varargs entry handling ``key=`` and ``reverse=`` kwargs that
	the fixed-arity sorted: can't accept.  Jinja2's compiler iterates
	``sorted(self.extensions.values(), key=lambda x: x.priority)``
	at template-load time."

	"isNil must be @env0:-annotated here: isNil is a configurable
	optimized selector, and a host extent that removed it from
	GsNMethod optimizedSelectors compiles a bare isNil as a real
	send — which nothing implements in env 1."
	| iterable keyFn reverse lst iter done sortedArray |
	self ___requireArgs___: positional atLeast: 1
		message: 'sorted expected 1 argument, got '
			@env0:, positional @env0:size @env0:printString.
	iterable := positional @env0:at: 1.
	keyFn := kwargs @env0:isNil
		ifTrue: [nil]
		ifFalse: [kwargs @env0:at: 'key' ifAbsent: [nil]].
	"An EXPLICIT key=None means no key (CPython) -- test_heapq passes
	key in [None, itemgetter(0), ...]; calling the None killed the
	test with 'NoneType' object is not callable."
	keyFn == None ifTrue: [keyFn := nil].
	reverse := kwargs @env0:isNil
		ifTrue: [false]
		ifFalse: [kwargs @env0:at: 'reverse' ifAbsent: [false]].
	reverse == None ifTrue: [reverse := false].
	lst := list ___new___.
	iter := iterable __iter__.
	done := false.
	[done] @env0:whileFalse: [
		[
			| item |
			item := iter __next__.
			lst append: item
		] @env0:on: StopIteration do: [:ex | done := true]
	].
	"GemStone's sort: returns a fresh sorted Array, not the receiver; copy it
	back over the list's slots so sorted() returns a Python list (not an Array).
	___stableSortedArray: gives CPython-stable ordering and evaluates the key
	once per element (GemStone's @env0:sort: is not stable, and the old inline
	sortBlock recomputed the key on every comparison)."
	sortedArray := lst ___stableSortedArray: keyFn reverse: (reverse ___isTruthy___).
	lst @env0:replaceFrom: 1 to: lst @env0:size with: sortedArray startingAt: 1.
	^ lst
%

category: 'Grail-Built-in Functions'
method: builtins
str: anObject
	"Python builtin str(x) — fixed-arity fast path.  A user-defined str
	SUBCLASS instance (``class FooStr(str): ...'') must coerce down to
	a genuine plain str here, mirroring CPython (str(subclass_instance)
	is exactly type str, never the subclass) -- the inherited __str__
	just answers self unchanged, which would otherwise retain the
	subclass's own overrides (test_float.py's test_floatconversion:
	FooStr.__float__ calls str(self) and, without this, gets back
	ANOTHER FooStr, re-entering __float__ and recursing forever).
	Checked against the specific sealed/kernel string classes (not
	just ``isKindOf: CharacterCollection``) so a plain WIDE string
	(Unicode16/32, auto-promoted by content, not a user subclass)
	takes the untouched fast path -- str.gs's __new__: always builds a
	narrow Unicode7 copy, which would corrupt a wide one."

	((anObject isKindOf: CharacterCollection) and: [
		(anObject @env0:class @env0:== Unicode7) @env0:not and: [
		(anObject @env0:class @env0:== Unicode16) @env0:not and: [
		(anObject @env0:class @env0:== Unicode32) @env0:not and: [
		(anObject @env0:class @env0:== String) @env0:not and: [
		(anObject @env0:class @env0:== Symbol) @env0:not]]]]]) ifTrue: [
			"Coerce the __str__ RESULT, not the input: a plain str subclass
			inherits str.__str__ (answers self), so this stays the input's
			character content; but a subclass with an OVERRIDING __str__ --
			notably a str-mixin enum member (``class E(str, Enum)``), whose
			forced Enum __str__ answers 'E.name' while its own char content is
			empty -- is honored (CPython str(x) calls type(x).__str__)."
			| r |
			r := [anObject __str__] @env0:on: AbstractException do: [:ex | anObject].
			^ (r isKindOf: CharacterCollection) ifTrue: [str __new__: r] ifFalse: [r]].
	^ [anObject __str__] @env0:on: MessageNotUnderstood do: [:ex | anObject __repr__]
%

category: 'Grail-Built-in Functions'
method: builtins
sum: anIterable
	"Python builtin sum(iterable) — fixed-arity fast path."

	^ self sum: anIterable _: 0
%

category: 'Grail-Built-in Functions'
method: builtins
sum: anIterable _: start
	"Python ``sum(iterable, start=0)'' two-positional form."

	| iter total |
	total := start.
	iter := anIterable __iter__.
	[true] @env0:whileTrue: [
		[
			| item |
			item := iter __next__.
			total := total __add__: item
		] @env0:on: StopIteration do: [:ex | ^total].
	].
%

category: 'Grail-Built-in Functions'
method: builtins
_sum: positional kw: kwargs
	"Python ``sum(iterable, /, start=0)'' varargs form — covers the
	keyword call ``sum(items, start=0)'' used by jinja2's
	sync_do_sum once the @pass_environment shim injects environment."

	| iterable start |
	self ___requireArgs___: positional atLeast: 1
		message: 'sum() takes at least 1 positional argument (0 given)'.
	iterable := positional @env0:at: 1.
	start := positional @env0:size >= 2
		ifTrue: [positional @env0:at: 2]
		ifFalse: [(kwargs notNil and: [kwargs includesKey: 'start'])
			ifTrue: [kwargs at: 'start']
			ifFalse: [0]].
	^ self sum: iterable _: start
%

category: 'Grail-Built-in Functions'
method: builtins
type: anObject
	"Python builtin type(x) — fixed-arity fast path.

	ONE ROUTE for both spellings.  CPython's ``x.__class__ is type(x)'' is an
	invariant, and these two used to disagree for every class receiver:
	__class__ answered the per-class Smalltalk metaclass and this answered the
	canonical ``type'', so the two were never the same object.

	An ordinary class still answers that canonical ``type'' -- object >>
	___pyMetaclass___ ends there -- so ``type(cls) is type'' keeps holding and
	stays consistent with ``isinstance(cls, type)'', which keys off ``isKindOf:
	Behavior''.  What changes is a class that HAS a Python metaclass: an enum
	now answers EnumType, and a ``metaclass='' class answers what it declared.
	The note this replaced said enum and abc carried no Python-level metaclass
	machinery; enum does now, and test_enum asserts it."

	^ anObject ___pyMetaclass___
%

! ===============================================================================
! Fixed-arity fast-path methods (2 positional arguments)
! ===============================================================================

category: 'Grail-Built-in Functions'
method: builtins
divmod: x _: y
	"Python builtin divmod(x, y) = (x // y, x % y).  A complex operand has no
	divmod: CPython raises TypeError naming ``divmod()'' (not ``//'' from the
	pair below) -- test_fractions test_complex_handling."

	| quotient remainder tn |
	((x @env0:isKindOf: complex) or: [y @env0:isKindOf: complex]) ifTrue: [
		tn := [:v | | n | n := v @env0:class @env0:name @env0:asString.
			(#('Integer' 'SmallInteger' 'LargeInteger' 'LargePositiveInteger'
				'LargeNegativeInteger') @env0:includes: n) ifTrue: ['int'] ifFalse: [n]].
		^ TypeError ___signal___: ('unsupported operand type(s) for divmod(): '''
			@env0:, (tn @env0:value: x) @env0:, ''' and ''' @env0:, (tn @env0:value: y) @env0:, '''')].
	quotient := x ___binOpFloorDiv___: y.
	remainder := x ___binOpMod___: y.
	^ tuple @env0:withAll: {quotient. remainder}
%

category: 'Grail-Built-in Functions'
method: builtins
isinstance: anObject _: aClassOrTuple
	"Python builtin isinstance(obj, classinfo) — fixed-arity fast path.
	Supports Abstract Base Classes (ABCs) via __instancecheck__.

	`classinfo` may be either a single class or a tuple of classes.  Codegen
	emits builtin class names like ``str`` / ``int`` as a BoundMethod on
	``builtins`` (because they have a fast-path keyword form), so when we
	see a BoundMethod here we unwrap to the underlying Smalltalk class via
	``Python at: selector``.  Tuples are handled by recursing on each
	element until a match is found."

	^ self ___isInstance___: anObject of: aClassOrTuple depth: 0
%

category: 'Python-Built-in Functions'
method: builtins
___isInstance___: anObject of: aClassOrTuple depth: aDepth
	"isinstance's recursive core.  ``aDepth'' bounds the NESTED-TUPLE recursion:
	a classinfo tuple may contain tuples, and CPython's own recursion limit is
	what turns an absurdly nested one into RecursionError
	(test_isinstance's blowstack nests 100 deeper on every pass until it gets
	one).  Grail recursed in Smalltalk with no guard, so it died on the
	UNCATCHABLE AlmostOutOfStack instead.  The cap is far above any real
	classinfo -- nesting beyond one level is already pathological -- and well
	under the Smalltalk stack, which is what keeps the failure a catchable
	Python RecursionError."

	| cls |
	aDepth @env0:> 50 ifTrue: [
		RecursionError ___signal___:
			'maximum recursion depth exceeded in __instancecheck__'].
	cls := self ___resolveClassRef___: aClassOrTuple.
	"Tuple-of-classes form: recurse, OR together."
	(cls isKindOf: tuple) ifTrue: [
		cls @env0:do: [:eachCls |
			(self ___isInstance___: anObject of: eachCls depth: aDepth @env0:+ 1)
				ifTrue: [^ true]].
		^ false
	].
	"PEP 604 union (``int | str''): CPython's isinstance accepts types.UnionType
	and tests each member, so it behaves exactly like the tuple form.  A member
	is normalised first because ``int | None'' keeps the None SINGLETON in its
	__args__ while CPython stores NoneType there -- unnormalised,
	isinstance(None, int | None) raised instead of answering True."
	(cls isKindOf: PyUnionType) ifTrue: [
		(cls @env0:dynamicInstVarAt: #'__args__') @env0:do: [:eachCls |
			(self ___isInstance___: anObject
				of: (self ___normalizeUnionMember___: eachCls)
				depth: aDepth @env0:+ 1)
					ifTrue: [^ true]].
		^ false
	].
	^ self ___isInstanceSingle___: anObject of: cls
%

category: 'Python-Built-in Functions'
method: builtins
___resolveClassRef___: aRef
	"Helper for isinstance/issubclass: unwrap a BoundMethod wrapping a
	builtin class name (e.g. BoundMethod(builtins, #str)) to the
	underlying Smalltalk class.  Other inputs pass through unchanged.

	``type'' is special: referenced as a value it is the builtins ``type''
	callable (a BoundMethod selector #type), not a Smalltalk class, and
	there is no ``type'' class in the Python dict.  Per Python,
	``isinstance(x, type)'' / ``issubclass(c, type)'' ask whether x / c is
	a class — which in GemStone is ``isKindOf: Behavior'' /
	``inheritsFrom: Behavior''.  Mapping the type callable to Behavior lets
	both checks run through the normal isKindOf:/inheritsFrom: path instead
	of raising an uncatchable ArgumentTypeError from isKindOf: on a
	non-class second argument.  (numpy._utils.set_module does
	``isinstance(func, type)'' to tell a decorated class from a function.)"

	(aRef isKindOf: BoundMethod) ifTrue: [
		(aRef @env0:selector == #'type') ifTrue: [^ Behavior].
		^ Python @env0:at: aRef @env0:selector ifAbsent: [aRef]
	].
	^ aRef
%

category: 'Python-Built-in Functions'
method: builtins
___isInstanceSingle___: anObject of: aClass
	"isinstance with a single class argument (post-tuple-expansion)."

	| result baCls egCls hook |
	"CPython PyObject_IsInstance: after the exact-type fast path it looks up
	__instancecheck__ on TYPE(cls) and, when the metaclass supplies one,
	DELEGATES to it entirely.  That is the whole ABC mechanism -- what makes
	isinstance(x, MyABC) consult register()ed classes and __subclasshook__ --
	and Grail never looked, so a metaclass defining it was simply ignored
	(test_typechecks).

	The exact-type match short-circuits first, as CPython's does: it is the
	common case and must not pay a lookup or a Python call.  The hook itself is
	nil unless the class recorded a ``metaclass='' that defines the method, so
	ordinary isinstance pays one SessionTemps read."
	(aClass isKindOf: Behavior) ifTrue: [
		(anObject @env0:class == aClass) ifTrue: [^ true].
		hook := aClass ___metaclassCheckHook___: #'__instancecheck__'.
		hook @env0:notNil ifTrue: [
			"PyObject_IsTrue on the result, so any truthy answer counts."
			^ (hook ___pyCallValue___: { aClass. anObject } kw: nil) ___isTruthy___]].
	"Non-class classinfo (isinstance(x, functools.cached_property)
	where the attr resolved to a BoundMethod): raise CPython's
	catchable TypeError -- isKindOf: on a non-Behavior dies with an
	UNCATCHABLE ArgumentTypeError (killed test_functools)."
	(aClass isKindOf: Behavior) ifFalse: [
		"A non-class classinfo may still supply __instancecheck__ on its own
		type -- CPython looks the hook up on TYPE(cls) without first requiring
		cls to be a type, and ``isinstance([], typing.List)'' is exactly that
		shape (typing.List is a _SpecialGenericAlias INSTANCE).  Asked BEFORE
		the __bases__ protocol and the TypeError, both of which are the
		fallbacks for a classinfo that supplies no hook."
		hook := aClass ___nonClassCheckHook___: #'__instancecheck__'.
		hook @env0:notNil ifTrue: [
			^ (hook ___pyCallValue___: { aClass. anObject } kw: nil) ___isTruthy___]].
	(aClass isKindOf: Behavior) ifFalse: [
		"OLD-STYLE PROTOCOL (CPython recursive_isinstance): a non-type
		classinfo that exposes a tuple __bases__ is not an error -- compare
		the INSTANCE's __class__ against it through the __bases__ graph.
		___abstractClassCheck___ raises the TypeError when it does not
		qualify, so reaching the next line means it does."
		self ___abstractClassCheck___: aClass
			argMessage: 'isinstance() arg 2 must be a type, a tuple of types, or a union'.
		^ self ___abstractIsSubclass___:
				(anObject @env1:___pyAttrLoad___: #'__class__')
			of: aClass depth: 0].
	result := anObject isKindOf: aClass.
	"CPython's object_isinstance: when the real type check FAILS it still reads
	``inst.__class__'' and re-tests, so an object that declares its own
	__class__ is judged by what it CLAIMS to be.  Two consequences the tests
	pin: a lying __class__ makes isinstance answer True, and a __class__ getter
	that raises propagates instead of being masked (test_isinstance's
	test_isinstance_dont_mask_non_attribute_error -- ``isinstance(c, bool)''
	with a RuntimeError-raising getter, which never touched __class__ here
	because bool is a real type and the fast path had already decided).
	Gated on the class body actually DECLARING __class__, so the ordinary case
	pays one metaclass-chain probe and no attribute read."
	(result not and: [anObject ___declaresOwnClassAttr___: #'__class__']) ifTrue: [
		| claimed |
		claimed := anObject @env1:___pyAttrLoad___: #'__class__'.
		(claimed @env0:notNil and: [claimed @env0:isKindOf: Behavior])
			ifTrue: [result := claimed @env0:inheritsFrom: aClass.
				result @env0:ifFalse: [result := claimed @env0:== aClass]]].
	(result not and: [aClass == Integer]) ifTrue: [
		"CPython's bool IS an int subclass, so isinstance(True, int) is
		True (PEP 285; test_bool.py test_isinstance).  Grail maps bool to
		the kernel Boolean, which is NOT under Integer on the Smalltalk
		chain, so widen here -- the same shape as the AbstractPyInt
		widening in ___isSubclassSingle___:of:.  Only the int direction
		widens: isinstance(1, bool) stays False, since Integer is not
		under Boolean either."
		result := anObject isKindOf: Boolean].
	(result not and: [aClass == (Python @env0:at: #Exception otherwise: nil)]) ifTrue: [
		| egCls |
		"PEP 654: ExceptionGroup derives from BOTH BaseExceptionGroup and
		Exception, but Grail's single-inheritance chain can only put it under
		BaseExceptionGroup, leaving Python's Exception and BaseExceptionGroup
		SIBLINGS.  ___issubclass___ and Exception class>>handles: already widen
		(so issubclass says yes and ``except Exception:'' catches); isinstance
		has to agree or the same object is an Exception by type and not by
		instance.  Only ExceptionGroup widens, never a bare BaseExceptionGroup
		-- CPython excludes that one from Exception too."
		egCls := Python @env0:at: #ExceptionGroup otherwise: nil.
		result := egCls @env0:notNil and: [anObject isKindOf: egCls]].
	(result not and: [aClass == Unicode7]) ifTrue: [
		"str maps to Unicode7 for construction, but CPython counts EVERY
		text string as str: Grail literals may come back Unicode16 /
		QuadByteString (wide content) and GemStone APIs hand back String /
		DoubleByteString.  Without this, isinstance(cyrillic, str) was
		False and re.compile rejected wide-string patterns
		(test_word_boundaries).  bytes stays distinct: ByteArray is not a
		CharacterCollection."
		result := anObject @env0:___isPyStr___].
	(result not and: [aClass == (Python @env0:at: #'PyDict' otherwise: nil)]) ifTrue: [
		"dict maps to PyDict (the insertion-ordered subclass) for
		construction, but CPython counts EVERY dict as a dict: internal
		plain KeyValueDictionaries surfaced to Python (module namespaces,
		some builtins) must still read as dict.  PyDict is-a KVD, so this
		only widens the check to the superclass (docs/Ordered_Dict.md).
		PyDict resolved late -- builtins.gs compiles before PyDict.gs.
		The live dict VIEWS (PyInstanceDict for obj.__dict__, PyModuleDict
		for globals()) also count: CPython's globals() IS a dict, and
		mapping-duck-typed code checks isinstance(g, dict)."
		result := (anObject isKindOf: KeyValueDictionary)
			or: [anObject isKindOf: PyInstanceDict]].
	(result not and: [aClass == (Python @env0:at: #Enum otherwise: nil)]) ifTrue: [
		"Enum-family widening (mirror of ___isSubclassSingle___of:): an
		IntEnum/IntFlag/StrEnum member is stored on the int/str root, so
		isKindOf: does not reach Enum, but CPython counts it an Enum instance."
		| ie se |
		ie := Python @env0:at: #IntEnum otherwise: nil.
		se := Python @env0:at: #StrEnum otherwise: nil.
		result := (ie @env0:notNil and: [anObject isKindOf: ie])
			or: [se @env0:notNil and: [anObject isKindOf: se]]].
	(result not and: [aClass == (Python @env0:at: #Flag otherwise: nil)]) ifTrue: [
		"IntFlag member is int-rooted; CPython counts it a Flag instance."
		| iff |
		iff := Python @env0:at: #IntFlag otherwise: nil.
		result := iff @env0:notNil and: [anObject isKindOf: iff]].
	result ifFalse: [
		"Secondary (multiple-inheritance) bases are not on the Smalltalk
		chain isKindOf: walks -- consult the instance class's registered
		C3 MRO."
		| il |
		il := Python @env0:at: #importlib otherwise: nil.
		il == nil ifFalse: [
			result := (il @env0:___mroOf___: anObject @env0:class) @env0:includes: aClass]].
	result ifFalse: [
		"Walk the metaclass chain (not just the own method dict) for
		``__instancecheck__:'' — ABCs define it once on a base
		(``numbers.Number'', ``collections.abc._ABCStub'') and the
		concrete ABC names inherit it.  An own-dict-only check
		(``includesSelector:'') misses ``isinstance(x, numbers.Integral)''
		and every ``isinstance(x, collections.abc.Mapping/Sequence/...)''
		because those classes carry the method only by inheritance.
		Matches CPython, where the hook lives on the (shared) metaclass
		``type(cls).__instancecheck__''.  ``aClass ___respondsTo___: s''
		probes aClass's metaclass chain (class-side responds-to)."
		(aClass ___respondsTo___: #'__instancecheck__:') ifTrue: [
			result := aClass __instancecheck__: anObject
		]
	].
	"CPython: a bytearray is NOT a bytes -- they are distinct types.  Grail
	stores bytearray as a ByteArray(=bytes) subclass for storage/method reuse,
	so the isKindOf: chain above counts a bytearray as bytes; narrow it back
	here as a FINAL override (after every widening path).  A plain bytes
	subclass (class X(bytes)) is NOT under bytearray, so it stays bytes."
	(aClass == ByteArray) ifTrue: [
		baCls := Python @env0:at: #bytearray otherwise: nil.
		(baCls @env0:notNil and: [anObject isKindOf: baCls]) ifTrue: [result := false]].
	^ result
%

category: 'Grail-Built-in Functions'
method: builtins
pow: x _: y
	"Python builtin pow(x, y) — fixed-arity fast path (2-arg form).
	The 3-arg form `pow(x, y, z)` lives at `_pow:kw:`."

	^ x __pow__: y
%

! ``staticmethod'' / ``classmethod'' are NOT builtins methods: they are bound as
! TYPES in the Python dict (PyStaticMethod / PyClassMethod, registered under those
! names in MethodWrappers.gs) so the bare name resolves to the class and
! ``type(staticmethod(f)) is staticmethod'' holds.  A ``staticmethod:'' method here
! would be found by ___pyAttrLoad___ (colon stripped) and SHADOW the type binding.
! The value form ``staticmethod(f)'' now calls the class (value:value:/__new__:),
! building the same wrapper; the @staticmethod decorator is parse-time in ClassDefAst.

category: 'Grail-Built-in Functions'
method: builtins
property: fn
	"``property(fget)'' — build a real read-only descriptor.

	This used to be an identity stub returning fn (the comment said ``no
	descriptor protocol yet''), which made the ONE-argument call form behave
	unlike every other arity: property(), property(g, s), property(g, s, d) and
	the doc= keyword all already reached PropertyDescriptor's constructors, so
	only property(g) answered a bare function.  Reading such an attribute gave
	back the function rather than calling it, which is why
	``__bases__ = property(getbases)'' -- the legacy abstract-class protocol
	CPython's test_isinstance exercises throughout -- looked like a
	non-conforming classinfo and raised TypeError.

	Kept as a builtins method rather than deleted so the 1-argument call site
	resolves exactly as before; only the value it answers changes."

	^ PropertyDescriptor @env1:__new__: fn
%

category: 'Grail-Built-in Functions'
method: builtins
property
	"``property()'' called through the builtins BoundMethod value (``p =
	property; p()'').  The bare NAME ``property'' resolves to this builtins
	method, not the class, so a call THROUGH A VARIABLE lands here rather than
	on the class constructor -- and every arity must therefore be served here,
	not just the 1-arg form above (test_property test_issue41287 iterates ``for
	ps in property, PropertySub, ...: ps(getter, None, None, doc)'')."

	^ PropertyDescriptor @env1:__new__
%

category: 'Grail-Built-in Functions'
method: builtins
property: fg _: fs
	"``property(fget, fset)'' through the builtins BoundMethod value."

	^ PropertyDescriptor @env1:__new__: fg _: fs
%

category: 'Grail-Built-in Functions'
method: builtins
property: fg _: fs _: fd
	"``property(fget, fset, fdel)'' through the builtins BoundMethod value."

	^ PropertyDescriptor @env1:__new__: fg _: fs _: fd
%

category: 'Grail-Built-in Functions'
method: builtins
property: fg _: fs _: fd _: dc
	"``property(fget, fset, fdel, doc)'' through the builtins BoundMethod value."

	^ PropertyDescriptor @env1:__new__: fg _: fs _: fd _: dc
%

category: 'Grail-Built-in Functions'
method: builtins
delattr: anObject _: aName
	"Python builtin delattr(obj, name).  Dispatches through the
	``__delattr__'' protocol so user overrides intercept.  Default
	``object>>__delattr__:'' falls through to ``___pyAttrDelete___:''
	which removes the dynamic-instVar slot (raising AttributeError
	if it was never bound).  Returns None per CPython."

	anObject __delattr__: aName.
	^ None
%

category: 'Grail-Built-in Functions'
method: builtins
hasattr: anObject _: aName
	"Python builtin hasattr(obj, name) — return True if obj has an
	attribute named `name`, False if accessing the attribute raises
	any exception (CPython 3 behavior: only AttributeError, but
	Grail collapses ``except (TypeError, AttributeError):`` paths
	through env-1 dispatch errors that show up as MNUs here too).

	Catch both the Smalltalk ``Error`` family (covers MNUs and other
	GS-side faults) and Python ``AttributeError`` (which inherits
	from AbstractException, not Error — ``___pyAttrLoad___`` now
	raises a real AttributeError on miss rather than DNU-ing).

	Used heavily by MarkupSafe, itsdangerous, and Werkzeug to detect
	``__html__`` / ``__call__`` / duck-typed protocols."

	^ [[anObject ___pyAttrLoad___: aName @env0:asSymbol.
	    true]
		@env0:on: AttributeError do: [:___ex___ | false]]
		@env0:on: Error do: [:___ex___ | false]
%

category: 'Grail-Built-in Functions'
method: builtins
getattr: anObject _: aName
	"Python builtin getattr(obj, name) — 2-arg form.  Raises
	AttributeError on miss; the 3-arg form (with default) lives at
	``_getattr:kw:``."

	^ anObject ___pyAttrLoad___: aName @env0:asSymbol
%

category: 'Grail-Built-in Functions'
method: builtins
_getattr: positional kw: kwargs
	"Python builtin getattr(obj, name, default=MISSING) — varargs
	entry covering the 3-arg form (default), invoked when a Smalltalk
	call site sees ``getattr(obj, name, default)`` from Python.
	Returns ``default`` instead of raising AttributeError on miss."

	| anObject aName |
	self ___requireArgs___: positional atLeast: 2
		message: 'getattr expected at least 2 arguments, got '
			@env0:, positional @env0:size @env0:printString.
	anObject := positional @env0:at: 1.
	aName := positional @env0:at: 2.
	(positional @env0:size) @env0:>= 3 ifTrue: [
		| default |
		default := positional @env0:at: 3.
		^ [anObject ___pyAttrLoad___: aName @env0:asSymbol]
			@env0:on: AttributeError do: [:ex | ex @env0:return: default]
	].
	^ anObject ___pyAttrLoad___: aName @env0:asSymbol
%

category: 'Grail-Built-in Functions'
method: builtins
issubclass: aClass _: aClassOrTuple
	"Python builtin issubclass(cls, classinfo) — True if `cls` is a
	subclass of `classinfo` (or any class in the tuple form).  Mirrors
	the BoundMethod-unwrap + tuple-recursion shape of `isinstance:_:`.
	When `cls` is a BoundMethod wrapping a builtin class name (Grail
	emits ``str`` / ``int`` as such), unwrap to the underlying class
	before walking the hierarchy."

	^ self ___isSubclass___: aClass of: aClassOrTuple depth: 0
%

category: 'Grail-Built-in Functions'
method: builtins
___isSubclass___: aClass of: aClassOrTuple depth: aDepth
	"issubclass's recursive core.  ``aDepth'' bounds the nested-tuple recursion
	for the same reason isinstance's does -- see ___isInstance___:of:depth:."

	| sub target |
	aDepth @env0:> 50 ifTrue: [
		RecursionError ___signal___:
			'maximum recursion depth exceeded in __subclasscheck__'].
	sub := self ___resolveClassRef___: aClass.
	target := self ___resolveClassRef___: aClassOrTuple.
	"RECURSE per element rather than calling ___isSubclassSingle___ directly,
	mirroring isinstance:_:.  Two things the direct call got wrong: a builtin
	class name inside the tuple is still a BoundMethod (___resolveClassRef___
	was applied to the TUPLE, not its elements), so ``issubclass(B, (str, A))''
	died on ``str'' before ever reaching A; and CPython allows NESTED tuples,
	``issubclass(Super, (Child, (Super,)))'' (test_isinstance
	test_subclass_tuple), which only recursion handles."
	(target isKindOf: tuple) ifTrue: [
		target @env0:do: [:eachCls |
			(self ___isSubclass___: sub of: eachCls depth: aDepth @env0:+ 1)
				ifTrue: [^ true]
		].
		^ false
	].
	"PEP 604 union: same treatment as a tuple, per CPython's issubclass, with the
	same None -> NoneType normalisation."
	(target isKindOf: PyUnionType) ifTrue: [
		(target @env0:dynamicInstVarAt: #'__args__') @env0:do: [:eachCls |
			(self ___isSubclass___: sub
				of: (self ___normalizeUnionMember___: eachCls)
				depth: aDepth @env0:+ 1)
					ifTrue: [^ true]
		].
		^ false
	].
	"__subclasscheck__ on the metaclass wins over the built-in walk, exactly as
	__instancecheck__ does for isinstance -- see ___isInstanceSingle___:of:."
	(target isKindOf: Behavior) ifTrue: [ | hook |
		hook := target ___metaclassCheckHook___: #'__subclasscheck__'.
		hook @env0:notNil ifTrue: [
			^ (hook ___pyCallValue___: { target. sub } kw: nil) ___isTruthy___]].
	"A NON-CLASS target may supply the hook on its own type -- CPython looks
	__subclasscheck__ up on TYPE(cls) whatever cls is, and never validates the
	FIRST argument before asking, which is what lets
	``issubclass(typing.List, typing.List | typing.Tuple)'' work with a
	non-class on both sides.  See ___nonClassCheckHook___."
	(target isKindOf: Behavior) ifFalse: [ | hook |
		hook := target ___nonClassCheckHook___: #'__subclasscheck__'.
		hook @env0:notNil ifTrue: [
			^ (hook ___pyCallValue___: { target. sub } kw: nil) ___isTruthy___]].
	^ self ___isSubclassSingle___: sub of: target
%

category: 'Grail-Built-in Functions'
method: builtins
___normalizeUnionMember___: aMember
	"``X | None'' is spelled with the None SINGLETON but means NoneType, which is
	what CPython puts in __args__ -- so isinstance(None, int | None) is True.
	Grail's union keeps the singleton, so translate it at the point of use.
	Everything else passes through untouched."

	aMember == None ifTrue: [^ NoneType].
	^ aMember
%

category: 'Grail-Built-in Functions'
method: builtins
___abstractBases___: anObject
	"CPython's abstract_get_bases: the object's ``__bases__'' when it is a
	TUPLE, else nil.  This is what makes something a ``class'' for the
	old-style protocol isinstance()/issubclass() still honour -- a plain
	object that exposes __bases__ (typically as a property) participates in
	subclass checks without being a type at all.

	A missing __bases__, or one that is not a tuple, answers nil (CPython
	swallows the AttributeError); so does any exception from reading it,
	because CPython's abstract_get_bases clears the error and treats the
	object as a non-class."

	| bases |
	"Catch AttributeError SPECIFICALLY, and nothing wider.

	It cannot be ``on: Error'': Grail's Python exceptions hang off Exception,
	so an Error handler misses the AttributeError a missing __bases__ raises,
	and it escaped issubclass(1, 2) as an AttributeError where CPython reports
	a TypeError.

	But it must not be ``on: Exception'' either.  The VM's AlmostOutOfStack is
	a NOTIFICATION under Exception, so a broad handler catches it mid-recursion
	and the ``ex return: nil'' then tries to unwind across a C primitive frame:
	UncontinuableError, ``return from on:do: block would cross frame of C
	primitive'', which killed the whole module (test_isinstance went to CRASH
	with t=0).  test_infinitely_many_bases reaches that depth on purpose -- its
	__getattr__ manufactures two fresh classes per level."
	bases := [anObject @env1:___pyAttrLoad___: #'__bases__']
		@env0:on: AttributeError do: [:ex | ex @env0:return: nil].
	^ (bases isKindOf: tuple) ifTrue: [bases] ifFalse: [nil]
%

category: 'Grail-Built-in Functions'
method: builtins
___abstractIsSubclass___: derived of: cls depth: aDepth
	"CPython's abstract_issubclass: walk ``derived''s __bases__ graph looking
	for ``cls'', by IDENTITY.  Used for the old-style protocol where either
	argument is not a real type but exposes a tuple __bases__.

	CPython recurses in C and lets the interpreter's own stack guard turn a
	cyclic or unbounded __bases__ chain into RecursionError.  Grail has no
	such guard on this path -- an unbounded chain raised the UNCATCHABLE
	Smalltalk AlmostOutOfStack -- so the depth is carried explicitly and
	raises Python's RecursionError at the limit.  test_isinstance's
	test_infinite_cycle_in_bases, test_infinite_recursion_in_bases,
	test_infinite_recursion_via_bases_tuple and test_infinitely_many_bases
	each build one of those chains deliberately.

	The limit is DELIBERATELY LOW (20).  CPython's default recursion limit is
	1000, but its own tests for these shapes wrap them in
	``support.infinite_recursion(25)'' -- and Grail cannot afford even that
	many: test_infinitely_many_bases' __getattr__ manufactures two classes per
	level, so at a limit of 100 the Smalltalk stack overflowed BEFORE the
	counter fired, and the AlmostOutOfStack notification took the module down.
	Real old-style __bases__ graphs are shallow, so a low ceiling costs
	nothing in practice and is what keeps the failure a catchable Python
	RecursionError.

	The single-base case iterates rather than recursing, matching CPython's
	tail-call, so a long linear chain costs no depth."

	| node bases steps |
	node := derived.
	steps := aDepth.
	[true] @env0:whileTrue: [
		"The guard counts ITERATIONS of the single-base walk as well as
		recursive descents.  Counting only the descents was not enough: a
		self-referential single base (``__bases__'' answering ``(self,)'')
		never recurses at all, so the loop spun forever and took the whole
		module down -- test_isinstance went from 20 errors to a CRASH.
		CPython gets its RecursionError from the C stack the repeated
		property-getter calls consume; this loop consumes none, so the limit
		has to be explicit."
		steps @env0:> 20 ifTrue: [
			RecursionError ___signal___:
				'maximum recursion depth exceeded while calling a Python object'].
		steps := steps @env0:+ 1.
		(node @env0:== cls) ifTrue: [^ true].
		bases := self ___abstractBases___: node.
		bases @env0:isNil ifTrue: [^ false].
		(bases @env0:size @env0:= 0) ifTrue: [^ false].
		(bases @env0:size @env0:= 1)
			ifTrue: [node := bases @env0:at: 1]
			ifFalse: [
				bases @env0:do: [:each |
					(self ___abstractIsSubclass___: each of: cls depth: steps)
						ifTrue: [^ true]].
				^ false]]
%

category: 'Grail-Built-in Functions'
method: builtins
___abstractClassCheck___: anObject argMessage: aMessage
	"CPython's check_class: ``anObject'' must be a real type OR expose a tuple
	__bases__; otherwise raise the caller's TypeError.  Answers true when the
	object is a non-type that nonetheless qualifies through __bases__, so the
	caller knows to take the abstract path."

	(anObject isKindOf: Behavior) ifTrue: [^ false].
	(self ___abstractBases___: anObject) @env0:isNil ifTrue: [
		TypeError ___signal___: aMessage].
	^ true
%

category: 'Grail-Built-in Functions'
method: builtins
___hasProtocol___: anObject _: aName
	"Grail-internal builtin bridging collections.abc's structural checks to
	object >> ___hasProtocol___: (method OWNERSHIP below the
	PythonInstance/Object fallback level).  A separate builtin because the
	Python attribute-call path on a CLASS receiver doesn't reach Object's
	env-1 instance methods -- a direct Smalltalk env-1 send does, for
	instance and class receivers alike."

	^ anObject ___hasProtocol___: aName
%

category: 'Grail-Built-in Functions'
method: builtins
___hasProtocolForCall___: anObject _: aName
	"Grail-internal builtin bridging itertools._iter's eager iterator
	validation to object >> ___hasProtocolForCall___: (see that method's
	comment) -- same Python-attribute-call-path reason as
	___hasProtocol___:_: above."

	^ anObject ___hasProtocolForCall___: aName
%

category: 'Grail-Built-in Functions'
method: builtins
___isSubclassSingle___: sub of: target
	"issubclass with a single class argument.  The Smalltalk chain
	covers single inheritance; a multiple-inheritance class's secondary
	bases are visible only through its registered C3 MRO."

	| il baCls |
	"OLD-STYLE PROTOCOL.  When either argument is not a real type, CPython
	does not reject: recursive_issubclass falls back to abstract_issubclass,
	which walks ``sub''s __bases__ graph looking for ``target''.  An object
	exposing a tuple __bases__ -- typically ``__bases__ = property(getbases)''
	-- therefore participates in subclass checks without being a type at all.
	Grail raised a flat ``issubclass() arg must be a type'', which was 11 of
	test_isinstance's 20 failures.  Argument 1 is checked before argument 2,
	matching CPython, so the message names the same argument it does."
	((sub isKindOf: Behavior) and: [target isKindOf: Behavior]) ifFalse: [
		self ___abstractClassCheck___: sub
			argMessage: 'issubclass() arg 1 must be a class'.
		self ___abstractClassCheck___: target
			argMessage: 'issubclass() arg 2 must be a class, a tuple of classes, or a union'.
		^ self ___abstractIsSubclass___: sub of: target depth: 0].
	(sub == target) ifTrue: [^ true].
	"CPython: bytearray is NOT a subclass of bytes (distinct types), though
	Grail stores bytearray as a ByteArray(=bytes) subclass.  Exclude the
	bytearray subtree from issubclass(..., bytes) before the inheritsFrom check."
	baCls := Python @env0:at: #bytearray otherwise: nil.
	(target == ByteArray and: [baCls @env0:notNil
		and: [(sub == baCls) or: [sub @env0:inheritsFrom: baCls]]]) ifTrue: [^ false].
	(sub @env0:inheritsFrom: target) ifTrue: [^ true].
	"Mirror isinstance's str widening: every text string class is a
	subclass of str (see ___isInstanceSingle___:of:)."
	(target == Unicode7 and: [(sub == CharacterCollection)
		or: [(sub @env0:inheritsFrom: CharacterCollection)
		or: [(sub == AbstractPyStr) or: [sub @env0:inheritsFrom: AbstractPyStr]]]]) ifTrue: [^ true].
	"int-subclass widening: a class routed onto AbstractPyInt by
	___subclass___'s sealed-Integer substitution IS a subclass of int.
	bool is one too -- CPython's bool subclasses int (PEP 285;
	test_bool.py test_issubclass), but Grail's Boolean sits outside the
	Integer chain.  Only this direction widens: issubclass(int, bool)
	stays False."
	(target == Integer and: [(sub == Boolean)
		or: [(sub == AbstractPyInt)
		or: [sub @env0:inheritsFrom: AbstractPyInt]]]) ifTrue: [^ true].
	"float-subclass widening -- same substitution story."
	(target == Float and: [(sub == AbstractPyFloat)
		or: [sub @env0:inheritsFrom: AbstractPyFloat]]) ifTrue: [^ true].
	"Enum-family widening: IntEnum/IntFlag/StrEnum store members on the
	int/str storage root, so their Smalltalk chain is IntFlag<IntEnum<
	AbstractPyInt (StrEnum<AbstractPyStr) and bypasses Enum -- and IntFlag
	bypasses Flag -- even though CPython makes them Enum (and IntFlag a Flag)
	subclasses.  Widen issubclass to report the CPython hierarchy the same way
	the int/str/float widenings above do, WITHOUT registering an MI MRO (which
	would reorder the super/method-resolution chain).  Classes resolved late
	(builtins.gs compiles before PyEnumTypes.gs)."
	(sub isKindOf: Behavior) ifTrue: [ | enumCls flagCls |
		enumCls := Python @env0:at: #Enum otherwise: nil.
		(enumCls @env0:notNil and: [target == enumCls]) ifTrue: [ | ie se |
			ie := Python @env0:at: #IntEnum otherwise: nil.
			se := Python @env0:at: #StrEnum otherwise: nil.
			((ie @env0:notNil and: [(sub == ie) or: [sub @env0:inheritsFrom: ie]])
				or: [se @env0:notNil and: [(sub == se) or: [sub @env0:inheritsFrom: se]]])
				ifTrue: [^ true]].
		flagCls := Python @env0:at: #Flag otherwise: nil.
		(flagCls @env0:notNil and: [target == flagCls]) ifTrue: [ | iff |
			iff := Python @env0:at: #IntFlag otherwise: nil.
			(iff @env0:notNil and: [(sub == iff) or: [sub @env0:inheritsFrom: iff]])
				ifTrue: [^ true]]].
	"ExceptionGroup widening: CPython's ExceptionGroup derives from BOTH
	BaseExceptionGroup and Exception (PEP 654), but Grail's single-inheritance
	Smalltalk chain puts it under BaseExceptionGroup only.  Report the CPython
	relationship so issubclass(ExceptionGroup, Exception) holds -- the documented
	hierarchy test_baseexception test_inheritance checks against."
	(target == (Python @env0:at: #Exception otherwise: nil)) ifTrue: [ | egCls |
		egCls := Python @env0:at: #ExceptionGroup otherwise: nil.
		(egCls @env0:notNil and: [(sub == egCls) or: [sub @env0:inheritsFrom: egCls]])
			ifTrue: [^ true]].
	il := Python @env0:at: #importlib otherwise: nil.
	il == nil ifFalse: [
		((il @env0:___mroOf___: sub) @env0:includes: target) ifTrue: [^ true]].
	"``__subclasscheck__:'' hook -- the issubclass analog of isinstance's
	``__instancecheck__:'' probe above.  ABCs (collections.abc, numbers)
	define it once on a shared base and every concrete ABC inherits it, so
	walk the METACLASS chain, mirroring CPython's
	``type(cls).__subclasscheck__''.  Reached only after the real chain,
	the widenings, and the C3 MRO all missed."
	(target ___respondsTo___: #'__subclasscheck__:') ifTrue: [
		^ (target __subclasscheck__: sub) == true].
	^ false
%

category: 'Grail-Built-in Functions'
method: builtins
setattr: anObject _: aName _: aValue
	"Python builtin setattr(obj, name, value).  Dispatches through the
	``__setattr__'' protocol so user overrides intercept (see
	AttributeProtocolTestCase).  Default ``object>>__setattr__:_:''
	falls through to ``___pyAttrStore___:put:'' (instance →
	dynamicInstVarAt:put:; class → env-1 class-side setter).

	Per CPython, setattr returns None regardless of the underlying
	store's internal return — discard whatever __setattr__ yields."

	anObject __setattr__: aName _: aValue.
	^ None
%

category: 'Grail-Built-in Functions'
method: builtins
type: className _: bases _: namespace
	"Python builtin type(name, bases, namespace) — the 3-argument
	metaclass form that builds a class dynamically.  Mirrors the
	compile-time path in ClassDefAst: pick the storage base from
	``bases'' as the Smalltalk superclass, create an anonymous subclass,
	then merge the other Python bases' methods (importlib
	___selectStorageBase___ / ___mergeSecondaryBases___).  An EMPTY
	namespace is supported — e.g. werkzeug's
	``type('WrapperTestResponse', (TestResponse, wrapper), {})''.

	A NON-EMPTY namespace is stored as class attributes below.  That store
	used to RAISE -- ``type('B', (), {'z': 5})'' died with ``'B' object has
	no attribute 'z''' from inside the constructor, so the AttributeError
	escaped the class statement rather than the load, and a Python
	``try/except'' around the read could not catch it because the failure
	had already happened.  The cause was the holder, not the store: a
	class built here has no ``dynInstVars'' accessor pair, which is where
	``___pyAttrStore___'' puts a class attribute, and which the compile-time
	path in ClassDefAst emits for every class it builds.  Ensured below."

	| il baseArray storageBase nameSym newClass ownAttrNames |
	il := Python @env0:at: #importlib.
	baseArray := Array @env0:withAll: bases.
	baseArray @env0:isEmpty ifTrue: [ baseArray := { PythonInstance } ].
	storageBase := il @env0:___selectStorageBase___: baseArray.
	nameSym := (il @env0:___asSmalltalkClassName___: className @env0:asString) @env0:asSymbol.
	"``dynInstVars'' is the class-side SLOT the class-attribute holder lives in,
	and it is requested here rather than added later because a Smalltalk class's
	instVars are fixed at creation.  ClassDefAst declares it for every class it
	compiles; a class built here did not have it, so ___ensureClassAttrHolder___
	could compile an accessor whose variable did not exist -- a compile failure,
	which installs the codegen-gap STUB, so the store then died with ``Grail
	could not compile this method'' instead of the AttributeError it used to
	give.  ___subclass___: filters the name against the parent's hierarchy, so
	asking for it when a base already declares it is a no-op."
	newClass := storageBase ___subclass___: nameSym instVarNames: #()
		classInstVarNames: #('dynInstVars').
	"Symbols: ___inheritClassAttrs___ compares against ``allInstVarNames'',
	which answers symbols."
	ownAttrNames := IdentitySet @env0:new.
	il @env0:___mergeSecondaryBases___: newClass bases: baseArray.
	"Non-empty namespace: store each binding as a class attribute via
	the polymorphic attribute store (values land in the per-class
	dynInstVars holder, where ___pyAttrLoad___'s class branch finds
	them).  Callables become class attrs too — enough for django's
	``BaseManager.from_queryset(QuerySet)'' (its copied queryset
	methods are invoked through instance attribute dispatch)."
	(namespace @env0:isNil @env0:not and: [namespace @env0:isEmpty @env0:not])
		ifTrue: [
			"The holder a class attribute lands in.  ClassDefAst emits this pair
			for every class it compiles; a class built here never had it, so the
			first store raised out of the constructor.  Same guard PyEnumTypes
			uses for a functional-API enum, which is the other path that builds
			a class without going through ClassDefAst."
			il @env0:___ensureClassAttrHolder___: newClass.
			namespace @env0:keysAndValuesDo: [:k :v |
				ownAttrNames @env0:add: k @env0:asSymbol.
				newClass ___pyAttrStore___: k @env0:asSymbol put: v
			]
		].
	"Copy inherited class-body data attributes (``X = v'') from the storage
	base into newClass's per-class slots — the same step ClassDefAst runs at
	compile time.  Smalltalk class-side instVars are per-class storage, so
	without this an unredeclared inherited Python class attr stays nil on the
	dynamically built class.  werkzeug's ``type('WrapperTestResponse',
	(TestResponse, Response), {})'' otherwise lost ``Response.
	implicit_sequence_conversion = True'', so ``test_client'' responses read
	it as nil and ``get_data()'' raised ``RuntimeError: the response object
	required the iterable to be a sequence''.

	EXCLUDING the namespace's own names, which is load-bearing now that a
	non-empty namespace is honoured: this step copies the PARENT's value into
	the subclass's matching slot, and an accessor slot outranks the holder the
	namespace store writes to.  So ``type('Derived', (Base,), {'kind':
	'derived'})'' answered Base's ``'base''' -- the inherit pass overwrote the
	override it was supposed to leave alone.  The parameter existed for exactly
	this; it had only ever been given an empty set because the non-empty case
	could not get this far."
	il @env0:___inheritClassAttrs___: newClass exclude: ownAttrNames.
	^ newClass
%

! ===============================================================================
! Varargs fast-path methods (`_name:kw:` shape)
! ===============================================================================

category: 'Grail-Built-in Functions'
method: builtins
___import__: positional kw: kwargs
	"Python builtin __import__(name, globals, locals, fromlist, level)
	— varargs fast path. Delegates to importlib's ___import__:kw:
	method directly.

	Selector encoding: the Python name is `__import__` (two leading and
	two trailing underscores). The varargs rule prepends one underscore
	to the name and appends `:kw:`, giving `___import__:kw:` — three
	leading underscores, two trailing before `:kw:`."

	self ___requireArgs___: positional atLeast: 1
		message: '__import__() missing required argument ''name'' (pos 1)'.
	^ (importlib instance) ___import__: positional kw: kwargs
%

category: 'Grail-Built-in Functions'
method: builtins
___reload__: positional kw: kwargs
	"Helper builtin behind ``importlib.reload(module)``.  Delegates to the
	Smalltalk importlib loader's ``reload:'', which re-reads the module's
	source (``__file__'') and re-compiles it in place.  Named ``__reload__''
	(two leading + two trailing underscores) so the Python facade's
	``importlib.reload'' can call it the way ``import_module'' calls
	``__import__''."

	self ___requireArgs___: positional atLeast: 1
		message: 'reload() missing required argument ''module'' (pos 1)'.
	^ (importlib instance) reload: (positional @env0:at: 1)
%

category: 'Grail-Built-in Functions'
method: builtins
_input: positional kw: kwargs
	"Python builtin input([prompt]) — varargs fast path. 0-arg form reads
	from stdin; 1-arg form writes the prompt to stdout first."

	| nargs prompt stdout stdin |
	nargs := positional @env0:size.
	(nargs @env0:>= 1) ifTrue: [
		prompt := positional @env0:at: 1.
		stdout := System @env0:stdout.
		stdout @env0:nextPutAll: prompt.
		stdout @env0:flush
	].
	stdin := System @env0:stdin.
	^ stdin @env0:nextLine
%

category: 'Grail-Built-in Functions'
method: builtins
_pow: positional kw: kwargs
	"Python builtin pow(x, y[, z]) — varargs fast path. 2-arg case
	computes x**y; 3-arg case computes (x**y) % z. The 2-arg form also
	has a fixed-arity fast path at `pow:_:` (used for direct call sites
	with two arguments); this method is the fallback for 3-arg and
	BoundMethod indirect calls."

	| nargs x y z |
	nargs := positional @env0:size.
	(nargs == 2) ifTrue: [
		x := positional @env0:at: 1.
		y := positional @env0:at: 2.
		^ x __pow__: y
	].
	(nargs == 3) ifTrue: [
		| tn |
		x := positional @env0:at: 1.
		y := positional @env0:at: 2.
		z := positional @env0:at: 3.
		"3-arg pow is modular exponentiation, defined only for integers.  Any
		non-int operand raises CPython's TypeError naming all three types
		(test_fractions test_three_argument_pow), rather than silently doing
		(x**y) % z."
		((x @env0:isKindOf: Integer) and: [(y @env0:isKindOf: Integer)
			and: [z @env0:isKindOf: Integer]]) ifTrue: [
			(z @env0:= 0) ifTrue: [
				ValueError ___signal___: 'pow() 3rd argument cannot be 0'].
			"Negative exponent: CPython (3.8+) defines pow(x, -k, z) as the
			modular inverse of x**k modulo z — an integer — rather than the
			float x**-k.  Raises ValueError when x is not invertible mod z."
			(y @env0:< 0) ifTrue: [
				| inv |
				inv := self ___modInverse___: x mod: z.
				^ self ___modPow___: inv exp: (y @env0:negated) mod: z].
			"Positive exponent: modular exponentiation (square-and-multiply)
			so a huge exponent never materializes x**y -- test_pow
			test_big_exp does pow(a, b, prime) with b up to 2**50000."
			^ self ___modPow___: x exp: y mod: z].
		"A COMPLEX operand is a ValueError, not the TypeError below: CPython
		reaches complex's power slot, which rejects a modulus outright --
		``pow(1+1j, 1+1j, 1+1j)'' is ValueError('complex modulo') (test_pow).
		WHICH of the two you get follows CPython's slot order, so the first
		complex-or-float operand IN ORDER decides: float's slot runs first in
		``pow(1.0, 1+1j, 2)'' and raises the TypeError, while int's declines in
		``pow(2, 1+1j, 3)'' and complex's raises."
		(({x. y. z} @env0:detect: [:v |
			(v @env0:isKindOf: complex) or: [v @env0:isKindOf: Float]]
			ifNone: [nil]) @env0:isKindOf: complex) ifTrue: [
				ValueError ___signal___: 'complex modulo'].
		tn := [:v | | n | n := v @env0:class @env0:name @env0:asString.
			(#('Integer' 'SmallInteger' 'LargeInteger' 'LargePositiveInteger'
				'LargeNegativeInteger') @env0:includes: n) ifTrue: ['int'] ifFalse: [n]].
		TypeError ___signal___: ('unsupported operand type(s) for ** or pow(): '''
			@env0:, (tn @env0:value: x) @env0:, ''', ''' @env0:, (tn @env0:value: y)
			@env0:, ''', ''' @env0:, (tn @env0:value: z) @env0:, '''')
	].
	TypeError ___signal___: 'pow expected 2 or 3 arguments'
%

category: 'Grail-Numeric Helpers'
method: builtins
___modInverse___: a mod: m
	"Modular inverse of integer `a` modulo integer `m` via the extended
	Euclidean algorithm.  Returns an integer in the sign range of `m`
	(GemStone `\\` follows the divisor's sign, matching Python `%`).
	Raises ValueError when gcd(a, m) ~= 1, mirroring CPython's
	pow(a, -1, m)."

	| oldR r oldS s q tmp |
	oldR := a.  r := m @env0:abs.
	oldS := 1.  s := 0.
	[r @env0:~= 0] @env0:whileTrue: [
		q := oldR @env0:// r.
		tmp := oldR @env0:- (q @env0:* r).  oldR := r.  r := tmp.
		tmp := oldS @env0:- (q @env0:* s).  oldS := s.  s := tmp].
	(oldR @env0:abs @env0:~= 1) ifTrue: [
		ValueError ___signal___: 'base is not invertible for the given modulus'].
	"oldR is +/-1 = gcd; normalise the coefficient's sign accordingly."
	^ (oldS @env0:* oldR) @env0:\\ m
%

category: 'Grail-Numeric Helpers'
method: builtins
___modPow___: base exp: e mod: m
	"base ** e modulo m for e >= 0 via square-and-multiply, keeping every
	intermediate reduced mod m so huge exponents stay cheap.  Result sign
	follows m (Python `%` semantics via GemStone `\\`)."

	| result b ee |
	result := 1.
	b := base @env0:\\ m.
	ee := e.
	[ee @env0:> 0] @env0:whileTrue: [
		((ee @env0:bitAnd: 1) @env0:= 1) ifTrue: [
			result := (result @env0:* b) @env0:\\ m].
		ee := ee @env0:bitShift: -1.
		b := (b @env0:* b) @env0:\\ m].
	^ result @env0:\\ m
%

category: 'Grail-Built-in Functions'
method: builtins
_print: positional kw: kwargs
	"Python builtin print(*objects, sep=' ', end='\n', file=sys.stdout,
	flush=False).

	Every keyword used to be IGNORED, and the separator was wrong with them:
	a space was written AFTER each object rather than BETWEEN them, so
	``print('a', 'b')'' produced ``a b '' with a trailing space, and there was
	no way to suppress the newline.

	WHERE IT WRITES is the part with reach.  The target is the ``file''
	argument, or ``sys.stdout'' when there is none -- looked up at CALL TIME,
	which is what makes redirection work:

	    sys.stdout = io.StringIO()      -- test.support.captured_stdout()
	    print('123')                    -- lands in the StringIO

	Grail leaves sys.stdout as None, meaning the console, so an ordinary print
	still goes to the Transcript exactly as before.  Anything else is written
	through its ``write'' method, which is all a file-like object has to
	provide -- io.StringIO, a real file, or a user class."

	| sep end target text flush |
	sep := self ___printKwarg___: kwargs named: 'sep' default: ' '.
	end := self ___printKwarg___: kwargs named: 'end'
		default: (String @env0:with: Character @env0:lf).
	target := self ___printTarget___: kwargs.
	text := WriteStream @env0:on: Unicode7 @env0:new.
	1 @env0:to: positional @env0:size do: [:i |
		| obj strRep |
		obj := positional @env0:at: i.
		"``str(obj)'', with __repr__ as the fallback for an object whose class
		defines neither -- the same two-step the original did."
		[strRep := obj __str__]
			@env0:on: MessageNotUnderstood do: [:ex | strRep := obj __repr__].
		text @env0:nextPutAll: strRep @env0:asString.
		"BETWEEN, not after: no separator follows the last object."
		i @env0:< positional @env0:size ifTrue: [
			text @env0:nextPutAll: sep @env0:asString]].
	text @env0:nextPutAll: end @env0:asString.
	target @env0:isNil
		ifTrue: [Transcript @env0:nextPutAll: text @env0:contents]
		ifFalse: [
			"``file'' only has to provide write(); anything else is an
			AttributeError naming it, which is what CPython raises for
			``print('', file='')'' -- and what a bare send produced instead was
			an uncatchable MessageNotUnderstood.  Both spellings are probed: a
			Python ``def write(self, s)'' compiles to the fixed-arity selector,
			and one with defaults or *args to the varargs form."
			((target ___respondsTo___: #'write:')
				or: [target ___respondsTo___: #'_write:kw:']) ifFalse: [
					^ AttributeError ___signal___: '''' @env0:,
						(bytes ___pyTypeNameOf___: target) @env0:,
						''' object has no attribute ''write'''].
			target @env1:write: text @env0:contents].
	flush := kwargs @env0:isNil
		ifTrue: [nil]
		ifFalse: [kwargs @env0:at: 'flush' otherwise: nil].
	(flush @env0:notNil and: [flush ___isTruthy___]) ifTrue: [
		"NOT guarded.  CPython passes an exception from flush() straight
		through -- test_print_flush asserts a RuntimeError raised by a
		file-like object's flush reaches the caller -- so swallowing it here
		would turn a reported failure into a silent one."
		target @env0:isNil ifFalse: [target @env1:flush]].
	^ None
%

category: 'Grail-Built-in Functions'
method: builtins
___printKwarg___: kwargs named: aName default: aDefault
	"One of print's string-valued keywords.  An explicit None means ``use the
	default'', which is CPython's rule for sep and end -- ``print(x, sep=None)''
	is the same as omitting it, not an empty separator."

	| v |
	kwargs @env0:isNil ifTrue: [^ aDefault].
	v := kwargs @env0:at: aName otherwise: nil.
	(v @env0:isNil or: [v @env0:== None]) ifTrue: [^ aDefault].
	"A non-string is a TypeError, naming the keyword and the type it got --
	CPython's exact wording, since test_print matches the message."
	(v isKindOf: CharacterCollection) ifFalse: [
		^ TypeError ___signal___: aName @env0:, ' must be None or a string, not '
			@env0:, (bytes ___pyTypeNameOf___: v)].
	^ v
%

category: 'Grail-Built-in Functions'
method: builtins
___printTarget___: kwargs
	"Where print writes: the ``file'' argument, else sys.stdout, else nil
	meaning the console.

	sys.stdout is read at CALL TIME rather than captured, so reassigning it
	redirects subsequent prints -- the whole point of
	test.support.captured_stdout().  Grail's own sys.stdout is None, which is
	how an ordinary print still reaches the Transcript."

	| f sysMod out |
	kwargs @env0:isNil ifFalse: [
		f := kwargs @env0:at: 'file' otherwise: nil.
		(f @env0:notNil and: [f @env0:~~ None]) ifTrue: [^ f]].
	sysMod := Python @env0:at: #'sys' otherwise: nil.
	sysMod @env0:isNil ifTrue: [^ nil].
	"___pyAttrLoad___ rather than the ``stdout'' accessor send.  An assignment
	``sys.stdout = buf'' lands in the module instance's DYNAMIC store, while
	the compiled accessor keeps answering the None it was initialised with and
	shadows it -- so the accessor reports no redirection ever happened.  This
	is the path a Python-level ``sys.stdout'' read already takes."
	out := [sysMod @env0:___instance___ @env1:___pyAttrLoad___: #'stdout']
		@env0:on: AbstractException do: [:ex | ex @env0:return: nil].
	(out @env0:isNil or: [out @env0:== None]) ifTrue: [^ nil].
	^ out
%

category: 'Grail-Built-in Functions'
method: builtins
_exit: positional kw: kwargs
	"Python builtin exit() — varargs fast path. Alias for quit(); in
	CPython both are added by site.py as instances of `_sitebuiltins.Quitter`
	and are interchangeable. Ignores any positional/keyword args."

	^ ExitClientError @env0:signal: 'exit()' status: 0
%

category: 'Grail-Built-in Functions'
method: builtins
_quit: positional kw: kwargs
	"Python builtin quit() — varargs fast path. Exits the interpreter
	cleanly. Ignores any positional/keyword args."

	^ ExitClientError @env0:signal: 'quit()' status: 0
%

category: 'Grail-Built-in Functions'
method: builtins
_round: positional kw: kwargs
	"Python builtin round(number[, ndigits]) — varargs fast path.
	The 1-arg case has a fixed-arity fast path (`round:`); this method
	handles 2-arg calls and the kwarg form `round(x, ndigits=n)`."

	| number ndigits multiplier |
	self ___requireArgs___: positional atLeast: 1
		message: 'round() missing required argument ''number'' (pos 1)'.
	number := positional @env0:at: 1.
	ndigits := (positional @env0:size @env0:>= 2)
		ifTrue: [positional @env0:at: 2]
		ifFalse: [
			(kwargs == nil)
				ifTrue: [nil]
				ifFalse: [kwargs @env0:at: 'ndigits' ifAbsent: [nil]]
		].
	"__round__:/___round__:kw: first (CPython protocol) -- see round:'s
	twin comment for the three-shape dispatch order (varargs form for
	a Python-source dunder with a defaulted parameter e.g. fractions.py,
	then the plain kernel-style 1-arg dunder, then the raw fallback);
	the kernel arithmetic below MNUs on PythonInstances, including
	round(x, None) which must raise a TypeError from the type's own
	None-check rather than crash in `10 raisedTo: nil`."
	((number @env0:class @env0:whichClassIncludesSelector: #'___round__:kw:' environmentId: 1) @env0:notNil)
		ifTrue: [^ number perform: #'___round__:kw:' env: 1
			withArguments: { (ndigits @env0:isNil ifTrue: [{ }] ifFalse: [{ ndigits }]). nil }].
	((number @env0:class @env0:whichClassIncludesSelector: #'__round__:' environmentId: 1) @env0:notNil)
		ifTrue: [^ number perform: #'__round__:' env: 1 withArguments: { ndigits }].
	ndigits ifNil: [^ number @env0:rounded].
	multiplier := 10 @env0:raisedTo: ndigits.
	"Match CPython: ``round(1.234, 2)'' returns the Float 1.23.
	Smalltalk's ``Integer / Integer'' returns a Fraction, so divide
	by the Float form of the multiplier when the input is a Float."
	^ (number isKindOf: Float)
		@env0:ifTrue: [
			((number @env0:* multiplier) @env0:rounded @env0:asFloat)
				@env0:/ multiplier @env0:asFloat]
		@env0:ifFalse: [
			((number @env0:* multiplier) @env0:rounded) @env0:/ multiplier]
%

category: 'Grail-Built-in Functions'
method: builtins
___strictKeyword___: kwargs for: aName
	"The ``strict='' keyword shared by zip() and map(), and the rejection
	of every other keyword.  CPython names the offending keyword rather
	than saying the function takes none, which is what
	``map(f, xs, badkw=1)'' reports."

	| v |
	(kwargs @env0:== nil or: [kwargs @env0:size @env0:= 0]) ifTrue: [^ false].
	v := false.
	kwargs @env0:keysAndValuesDo: [:k :each | | key |
		key := k @env0:asString.
		key @env0:= 'strict'
			ifTrue: [v := each]
			ifFalse: [
				TypeError ___signal___: (aName @env0:, '() got an unexpected keyword argument '''
					@env0:, key @env0:, '''')]].
	^ v ___isTruthy___
%

category: 'Grail-Built-in Functions'
method: builtins
_zip: positional kw: kwargs
	"Python builtin zip(*iterables, strict=False) — varargs fast path.
	Each positional element is an iterable; the result is an iterator
	yielding tuples drawn from each one in lockstep, stopping at the
	shortest -- or, under strict=True, raising ValueError when they are
	not all the same length.

	``strict'' used to be ACCEPTED AND IGNORED: zip(a, b, strict=True)
	over mismatched lengths quietly truncated, which is the one outcome
	the keyword exists to rule out."

	| iterators |
	iterators := Array @env0:new: positional @env0:size.
	1 @env0:to: positional @env0:size do: [:i |
		iterators @env0:at: i put: (self ___pyIter___: (positional @env0:at: i))].
	"LAZY, as in CPython -- an eager zip looped forever (then
	OOM-killed the session) on infinite sources like
	zip(count(), count(1))."
	^ zip_iterator
		___on: iterators
		strict: (self ___strictKeyword___: kwargs for: 'zip')
%

category: 'Grail-Built-in Functions'
method: builtins
_map: positional kw: kwargs
	"Python builtin map(func, *iterables, strict=False) — varargs fast path
	for 2+ positional args (func plus one or more iterables); a bare
	``map(f, xs)'' with no keyword goes through the fixed-arity map:_:
	instead.  3.14 gave map() zip()'s ``strict'' keyword; before that it
	took none, and this method still rejects every OTHER keyword."

	| iterators isStrict |
	isStrict := self ___strictKeyword___: kwargs for: 'map'.
	positional @env0:size @env0:< 2 ifTrue: [
		TypeError ___signal___: 'map() must have at least two arguments.'].
	iterators := Array @env0:new: positional @env0:size @env0:- 1.
	2 @env0:to: positional @env0:size do: [:i |
		iterators @env0:at: i @env0:- 1 put: (self ___pyIter___: (positional @env0:at: i))].
	^ map_iterator
		___on: (positional @env0:at: 1)
		sources: iterators
		strict: isStrict
%

set compile_env: 0

category: 'Grail-Built-in Functions'
classmethod: builtins
___builtinNamespaceNames___
	"Every name in CPython's ``builtins'' namespace -- i.e. dir(builtins) on
	CPython 3.14, the version Grail targets.  This is a SPEC, not an
	inventory of what Grail implements: it is the set of names Python itself
	lets an unqualified reference resolve to, so it changes only when the
	language does.

	NameAst uses it to decide whether a user-written bare name may bind
	directly to a Smalltalk global.  Grail's own Python SymbolDictionary also
	holds module classes (``json'', ``math''), implementation classes
	(``PyDict'', ``PySocket'') and flattened ``module_attr'' names
	(``sys_flags''), and the user's symbol list reaches the GemStone kernel
	on top of that -- none of which Python would resolve.  Without this gate
	``Decimal'' silently bound to GemStone's ScaledDecimal and ``json''
	resolved with no import at all, instead of raising NameError.

	The five module-level dunders (__name__, __doc__, __package__,
	__loader__, __spec__) are deliberately EXCLUDED: dir(builtins) lists
	them, but in real code they are the enclosing module's own attributes,
	so they must go through the module-attribute path.

	Memoised per session -- codegen asks for this on every free name."

	| s |
	s := SessionTemps current at: #GrailBuiltinNamespaceNames otherwise: nil.
	s ifNotNil: [^ s].
	s := IdentitySet new.
	s addAll: #(
		#'ArithmeticError' #'AssertionError' #'AttributeError' #'BaseException'
		#'BaseExceptionGroup' #'BlockingIOError' #'BrokenPipeError'
		#'BufferError' #'BytesWarning' #'ChildProcessError'
		#'ConnectionAbortedError' #'ConnectionError' #'ConnectionRefusedError'
		#'ConnectionResetError' #'DeprecationWarning' #'EOFError' #'Ellipsis'
		#'EncodingWarning' #'EnvironmentError' #'Exception' #'ExceptionGroup'
		#'False' #'FileExistsError' #'FileNotFoundError' #'FloatingPointError'
		#'FutureWarning' #'GeneratorExit' #'IOError' #'ImportError'
		#'ImportWarning' #'IndentationError' #'IndexError' #'InterruptedError'
		#'IsADirectoryError' #'KeyError' #'KeyboardInterrupt' #'LookupError'
		#'MemoryError' #'ModuleNotFoundError' #'NameError' #'None'
		#'NotADirectoryError' #'NotImplemented' #'NotImplementedError'
		#'OSError' #'OverflowError' #'PendingDeprecationWarning'
		#'PermissionError' #'ProcessLookupError' #'PythonFinalizationError'
		#'RecursionError' #'ReferenceError' #'ResourceWarning' #'RuntimeError'
		#'RuntimeWarning' #'StopAsyncIteration' #'StopIteration' #'SyntaxError'
		#'SyntaxWarning' #'SystemError' #'SystemExit' #'TabError'
		#'TimeoutError' #'True' #'TypeError' #'UnboundLocalError'
		#'UnicodeDecodeError' #'UnicodeEncodeError' #'UnicodeError'
		#'UnicodeTranslateError' #'UnicodeWarning' #'UserWarning' #'ValueError'
		#'Warning' #'ZeroDivisionError' #'_IncompleteInputError'
		#'__build_class__' #'__debug__' #'__import__' #'abs' #'aiter' #'all'
		#'anext' #'any' #'ascii' #'bin' #'bool' #'breakpoint' #'bytearray'
		#'bytes' #'callable' #'chr' #'classmethod' #'compile' #'complex'
		#'copyright' #'credits' #'delattr' #'dict' #'dir' #'divmod'
		#'enumerate' #'eval' #'exec' #'exit' #'filter' #'float' #'format'
		#'frozenset' #'getattr' #'globals' #'hasattr' #'hash' #'help' #'hex'
		#'id' #'input' #'int' #'isinstance' #'issubclass' #'iter' #'len'
		#'license' #'list' #'locals' #'map' #'max' #'memoryview' #'min' #'next'
		#'object' #'oct' #'open' #'ord' #'pow' #'print' #'property' #'quit'
		#'range' #'repr' #'reversed' #'round' #'set' #'setattr' #'slice'
		#'sorted' #'staticmethod' #'str' #'sum' #'super' #'tuple' #'type'
		#'vars' #'zip'
	).
	SessionTemps current at: #GrailBuiltinNamespaceNames put: s.
	^ s
%
