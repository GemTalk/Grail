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

{ #category : 'Grail-Source Encoding' }
builtins >> ___codingDeclarationIn___: bytes [
	"The encoding the PEP 263 declaration of a source names, or nil.  It is a
	comment on the first line, or on the second when the first holds no code
	(Parser/tokenizer/string_tokenizer.c:86-99)."

	| lines declared |
	lines := self ___firstTwoLinesOf___: bytes.
	declared := self ___codingSpecIn___: lines first.
	(declared isNil and: [lines size > 1 and: [self ___holdsNoCode___: lines first]])
		ifTrue: [declared := self ___codingSpecIn___: lines last].
	^ declared

]

{ #category : 'Grail-Source Encoding' }
builtins >> ___codingSpecIn___: aLine [
	"CPython's get_coding_spec (Parser/tokenizer/helpers.c:336-386): in a line
	that is a comment and nothing else, the first ``coding'' followed by ``:''
	or ``='', blanks, and a name -- normalized as get_normal_name does -- or
	nil."

	| hash index name |
	hash := aLine indexOf: $#.
	(hash = 0 or: [(self ___holdsNoCode___: (aLine copyFrom: 1 to: hash - 1)) not])
		ifTrue: [^ nil].
	index := hash.
	[index := aLine indexOfSubCollection: 'coding' startingAt: index + 1 ifAbsent: [0].
	index > 0] whileTrue: [
		name := self ___encodingNameIn___: aLine after: index + 6.
		name notNil ifTrue: [^ self ___normalEncodingName___: name]].
	^ nil

]

{ #category : 'Grail-Source Encoding' }
builtins >> ___decodedSource___: bytes [
	"The text of a bytes source, decoded as CPython's tokenizer decodes it
	(Parser/tokenizer/string_tokenizer.c:54-117): a UTF-8 BOM is dropped, and
	the rest is read in the encoding its PEP 263 declaration names, or as
	UTF-8 when it names none or UTF-8.  Grail read every bytes source as
	UTF-8, so a declared cp1251 was the ``Non-UTF-8 code'' error
	(test_exceptions testSyntaxErrorOffset)."

	| body encoding text |
	body := (self ___startsWithUtf8Bom___: bytes)
		ifTrue: [bytes copyFrom: 4 to: bytes size]
		ifFalse: [bytes].
	encoding := self ___codingDeclarationIn___: body.
	(body ~~ bytes and: [encoding notNil and: [encoding ~= 'utf-8']])
		ifTrue: [^ self ___signalEncoding___: encoding withBomIn: body].
	(encoding isNil or: [encoding = 'utf-8']) ifFalse: [
		^ [body @env1:decode: encoding]
			on: AbstractException
			do: [:ex | self ___signalUndecodableSource___: ex]].
	text := [body @env1:decode] on: AbstractException do: [:ex | ex return: nil].
	text isNil ifTrue: [^ self @env1:___signalNonUtf8Source___: body].
	^ text

]

{ #category : 'Grail-Source Encoding' }
builtins >> ___encodingNameIn___: aLine after: anIndex [
	"The name a declaration gives after ``coding'' at anIndex: a ``:'' or
	``='', then blanks, then ASCII letters, digits, ``-'', ``_'' and ``.'' --
	or nil when there is no such name there."

	| start stop |
	(anIndex <= aLine size and: [':=' includes: (aLine at: anIndex)]) ifFalse: [^ nil].
	start := anIndex + 1.
	[start <= aLine size and: [(aLine at: start) = $  or: [(aLine at: start) = Character tab]]]
		whileTrue: [start := start + 1].
	stop := start.
	[stop <= aLine size and: [self ___isEncodingNameCharacter___: (aLine at: stop)]]
		whileTrue: [stop := stop + 1].
	stop = start ifTrue: [^ nil].
	^ aLine copyFrom: start to: stop - 1

]

{ #category : 'Grail-Source Encoding' }
builtins >> ___firstTwoLinesOf___: bytes [
	"A source's first two lines, or its only one, read byte for byte: a
	declaration is ASCII, and Latin-1 gives every byte a character.  The
	bytes after them are never read, since the import path asks this of
	every module it loads."

	| lines line |
	lines := OrderedCollection new.
	line := WriteStream on: String new.
	bytes do: [:each |
		each = 10
			ifTrue: [
				lines add: line contents.
				lines size = 2 ifTrue: [^ lines asArray].
				line := WriteStream on: String new]
			ifFalse: [line nextPut: (Character codePoint: each)]].
	lines add: line contents.
	^ lines asArray

]

{ #category : 'Grail-Source Encoding' }
builtins >> ___holdsNoCode___: aLine [
	"Whether aLine has nothing but blanks before a comment or its end -- the
	test after which CPython stops looking for a declaration
	(Parser/tokenizer/helpers.c:399-411)."

	aLine do: [:each |
		(each = $# or: [each = Character cr]) ifTrue: [^ true].
		(each = $  or: [each = Character tab or: [each codePoint = 12]]) ifFalse: [^ false]].
	^ true

]

{ #category : 'Grail-Source Encoding' }
builtins >> ___isEncodingNameCharacter___: aCharacter [
	"Py_ISALNUM, which is ASCII only, or one of ``-'', ``_'' and ``.''."

	^ (aCharacter codePoint < 128 and: [aCharacter isAlphaNumeric])
		or: ['-_.' includes: aCharacter]

]

{ #category : 'Grail-Source Encoding' }
builtins >> ___needsSourceDecoding___: someBytes [
	"Whether a source needs more than plain UTF-8 decoding: it opens with a
	UTF-8 BOM, or its PEP 263 declaration names another encoding.  Asked by
	the import path before every module's decode, so a ``# -*- coding: utf-8
	-*-'' line, common in the standard library, keeps the plain decode."

	| encoding |
	(self ___startsWithUtf8Bom___: someBytes) ifTrue: [^ true].
	encoding := self ___codingDeclarationIn___: someBytes.
	^ encoding notNil and: [encoding ~= 'utf-8']

]

{ #category : 'Grail-Source Encoding' }
builtins >> ___normalEncodingName___: aName [
	"CPython's get_normal_name (Parser/tokenizer/helpers.c:306-333): UTF-8
	and Latin-1 under any of their spellings answer one name each -- the
	first 12 characters compared in lower case with ``_'' as ``-'' -- and
	every other name answers itself."

	| key |
	key := (aName copyFrom: 1 to: (aName size min: 12)) asLowercase copyReplaceAll: '_' with: '-'.
	(key = 'utf-8' or: [key beginsWith: 'utf-8-']) ifTrue: [^ 'utf-8'].
	(#('latin-1' 'iso-8859-1' 'iso-latin-1') includes: key) ifTrue: [^ 'iso-8859-1'].
	(#('latin-1-' 'iso-8859-1-' 'iso-latin-1-') detect: [:prefix | key beginsWith: prefix] ifNone: [nil])
		isNil ifFalse: [^ 'iso-8859-1'].
	^ aName

]

{ #category : 'Grail-Source Encoding' }
builtins >> ___signalEncoding___: anEncoding withBomIn: bytes [
	"CPython's refusal of a UTF-8 BOM beside a declaration of any other
	encoding, over the first line (Parser/tokenizer/helpers.c:425-435)."

	| line |
	line := (self ___firstTwoLinesOf___: bytes) first.
	^ SyntaxError @env1:___signalNew___: (Array
			with: 'encoding problem: ' , anEncoding , ' with BOM'
			with: (tuple withAll: { '<string>'. 1. 0. line. 1. line size }))
		kw: nil

]

{ #category : 'Grail-Source Encoding' }
builtins >> ___signalUndecodableSource___: anException [
	"A source its declared encoding cannot read -- an encoding that does not
	exist, one that is not a text encoding, a byte it cannot decode -- is a
	SyntaxError carrying the codec's own message, at line 0 and offset -1,
	where CPython reports a failure it names no line for."

	^ SyntaxError @env1:___signalNew___: (Array
			with: (anException @env1:__str__) asString
			with: (tuple withAll: { '<string>'. 0. -1. None. None. None }))
		kw: nil

]

{ #category : 'Grail-Source Encoding' }
builtins >> ___startsWithUtf8Bom___: bytes [
	"Whether bytes open with a COMPLETE UTF-8 byte order mark."

	^ bytes size >= 3
		and: [(bytes at: 1) = 239 and: [(bytes at: 2) = 187 and: [(bytes at: 3) = 191]]]

]
