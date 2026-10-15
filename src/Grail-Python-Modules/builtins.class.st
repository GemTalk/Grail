"Python builtins module — root class for all Python built-in functions.

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
    that holds `(builtins instance, #abs)`. The BoundMethod's
    `value:value:` dispatches to the arity-resolved selector at call
    time, falling back to `_name:kw:` if no fixed-arity match exists.
  * `callable(boundMethod)` returns True because BoundMethod defines
    `__call__:` (forwarding to `value:value:`).

Per Python semantics, `type(builtins) is type(math)` — both report as
`<class 'module'>`. The Smalltalk subclass relationship between
`builtins` and `module` is an implementation detail, not a Python type
relationship.

See https://docs.python.org/3/library/functions.html for the complete
list of Python built-in functions.

"
Class {
	#name : 'builtins',
	#superclass : 'NativeModule',
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Built-in Functions' }
builtins class >> ___builtinNamespaceNames___ [
	"Every name in CPython's ``builtins'' namespace -- i.e. dir(builtins) on
	CPython 3.14, the version Grail targets.  This is a SPEC, not an
	inventory of what Grail implements: it is the set of names Python itself
	lets an unqualified reference resolve to, so it changes only when the
	language does.

	NameAst uses it to decide whether a user-written bare name may bind
	directly to a Smalltalk global.  Grail's own Python SymbolDictionary also
	holds module classes (``json'', ``math''), implementation classes
	(``PyDict'', ``PyRawSocket'') and flattened ``module_attr'' names
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

]

{ #category : 'Grail-Built-in Functions' }
builtins class >> stdinProvider [
	"The session's input() line source, or nil when input() should fall
	back to the gem's own terminal.  See _input:kw: for the full order."

	| boxed |
	boxed := SessionTemps current at: #GrailStdinProvider otherwise: nil.
	boxed == nil ifTrue: [^ nil].
	^ boxed at: 1

]

{ #category : 'Grail-Built-in Functions' }
builtins class >> stdinProvider: anObjectOrNil [
	"Install the session's input() line source; nil removes it.

	The provider answers ``nextLinePrompt: promptString'' with the line the
	user typed (a trailing newline is tolerated and stripped), nil for end
	of input, which input() raises as EOFError, or the Symbol #interrupt
	for a read the user cancelled, which input() raises as
	KeyboardInterrupt.  It RECEIVES the prompt instead of having it printed
	for it — see _input:kw: for why.

	Session-local on purpose (SessionTemps): a GCI client installs a client
	forwarder here at login, and input() becomes one round trip to wherever
	the user is actually typing — the client traps the send, reads a line,
	and continues the call with it.  Nothing persists, no other session is
	affected, and logout discards it."

	"Two traps, both measured, both from ClientForwarder being a ROOT class
	(no superclass), where even isNil goes through doesNotUnderstand: and
	forwards to the client -- at install time, before any client is ready
	to answer.  So: == nil rather than isNil, because == compiles to a
	special bytecode and sends nothing; and the provider is stored BOXED in
	an Array, because SessionTemps>>at:put: itself sends to the value it
	stores, while Array construction and at: are primitives."
	anObjectOrNil == nil
		ifTrue: [SessionTemps current removeKey: #GrailStdinProvider ifAbsent: []]
		ifFalse: [
			SessionTemps current at: #GrailStdinProvider put: (Array with: anObjectOrNil)]

]
