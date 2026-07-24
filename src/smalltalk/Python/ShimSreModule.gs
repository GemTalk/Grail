! ------------------- Superclass check
run
module ifNil: [self error: 'module is not defined. Check file ordering.'].
CPythonShim ifNil: [self error: 'CPythonShim is not defined. Check file ordering.'].
%

! ------- _sre class (C extension module via shim)
expectvalue /Class
doit
module subclass: '_sre'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
_sre comment:
'Python _sre C extension module (regular expression engine).

Provides the low-level SRE matching engine used by the re module.
This wrapper delegates to CPythonShim which calls the actual C
implementation of _sre compiled from CPython 3.14 source.

Usage (from Python source):
    import _sre
    _sre.getcodesize()   # => 4
    pattern = _sre.compile(...)
    match = pattern.search("hello")
'
%

expectvalue /Class
doit
_sre category: 'Grail-Modules'
%

! ------- SrePattern class (wraps C PatternObject*)
expectvalue /Class
doit
Object subclass: 'SrePattern'
  instVarNames: #(cPointer compileArgs)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
SrePattern comment:
'Wrapper for a C-allocated PatternObject* from _sre.compile().

cPointer holds the C PatternObject* as a CPointer.  A CPointer keeps its
address in non-persistent storage, so an SrePattern that is committed (the
re / jinja2 regex caches retain compiled patterns, and a DEPLOYED canonical
module closure -- werkzeug URL rules -- carries patterns compiled at
definition time) and later faulted into a fresh session comes back with a
NULL cPointer instead of a stale integer address.

compileArgs holds the six _sre.compile() arguments (pattern, flags, code,
groups, groupindex, indexgroup -- all plain committable values), letting
cPtrAddress RECOMPILE the pattern transparently in a session that faulted
the wrapper in with a NULL cPointer.  A wrapper without compileArgs (e.g.
minted by SreMatch>>re) still signals a clean Smalltalk error rather than
handing a NULL/stale address to C (the original SEGV fix).'
%

! ------- SreMatch class (wraps C MatchObject*)
expectvalue /Class
doit
Object subclass: 'SreMatch'
  instVarNames: #(cPointer)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
SreMatch comment:
'Wrapper for a C-allocated MatchObject* from pattern.match()/search().

cPointer holds the C MatchObject* as a CPointer.  As with SrePattern, the
CPointer keeps its address in non-persistent storage, so a committed match
faults into a fresh session as NULL rather than a stale integer address;
cPtrAddress then signals instead of dereferencing it in C.'
%

! ------- SreScanner class (Grail-side pattern.scanner() state)
expectvalue /Class
doit
Object subclass: 'SreScanner'
  instVarNames: #(pattern string cursor endpos mustAdvance)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
SreScanner comment:
'The object returned by pattern.scanner(string[, pos[, endpos]]): a stateful
cursor whose match()/search() return successive SreMatch objects (or None),
advancing an internal position.  A real C SRE_Scanner cannot be kept across
shim calls (its SRE_STATE points into the per-call UCS4 buffer cache), so this
reuses SrePattern>>___searchFrom___:in:to:mustAdvance: -- the same one-shot
primitive finditer uses -- with must_advance semantics after a zero-width
match.'
%

expectvalue /Metaclass3
doit
_sre removeAllMethods.
_sre class removeAllMethods.
SrePattern removeAllMethods.
SrePattern class removeAllMethods.
SreMatch removeAllMethods.
SreMatch class removeAllMethods.
SreScanner removeAllMethods.
SreScanner class removeAllMethods.
%

set compile_env: 1

! ===============================================================================
! SrePattern - env 0 class methods
! ===============================================================================

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: SrePattern
newFromCPtr: anAddress
	"Create a pattern wrapper for the C PatternObject* at anAddress (a
	SmallInteger returned by the shim). Returns nil for a NULL address.

	The address is boxed in a CPointer rather than stored as a raw integer:
	a CPointer keeps its address in non-persistent storage, so a wrapper
	that is committed and later faulted into a fresh session comes back
	NULL instead of carrying a stale address.  Dereferencing such a stale
	address in C was the cause of the SEGV when the re / jinja2 regex caches
	were committed and reused in a later session."

	anAddress = 0 ifTrue: [^ nil].
	^ self basicNew initCPointer: (CPointer forAddress: anAddress)
%

category: 'Grail-Instance Creation'
classmethod: SrePattern
newFromCPtr: anAddress compileArgs: anArray
	"Like newFromCPtr:, additionally remembering the six _sre.compile()
	arguments so the pattern can be RECOMPILED transparently after being
	committed and faulted into a fresh session (see the class comment)."

	| inst |
	anAddress = 0 ifTrue: [^ nil].
	inst := self basicNew initCPointer: (CPointer forAddress: anAddress).
	inst initCompileArgs: anArray.
	^ inst
%

category: 'Grail-Python Attribute Hook'
classmethod: SrePattern
___pythonValueAttrs___
	"Selectors whose Smalltalk methods are exposed to Python as
	*value* attributes rather than bound methods.  Without this
	hook, ``pattern.groups`` would yield a BoundMethod wrapping
	the getter — but the CPython API exposes ``groups`` as a
	struct member (Py_T_PYSSIZET), so ``pattern.groups`` must be
	the int.  Same story for ``groupindex``, ``flags``, and
	``pattern`` (the source string)."

	^ IdentitySet new
		add: #groups;
		add: #groupindex;
		add: #flags;
		add: #pattern;
		yourself
%

category: 'Grail-Private'
method: SrePattern
initCPointer: aCPointer
	cPointer := aCPointer
%

category: 'Grail-Private'
method: SrePattern
initCompileArgs: anArray
	compileArgs := anArray
%

category: 'Grail-Accessing'
method: SrePattern
cPointer
	"The CPointer wrapping the C PatternObject* (NULL across a session boundary)."
	^ cPointer
%

category: 'Grail-Private'
method: SrePattern
cPtrAddress
	"The raw C address to hand to the shim.  A pattern that was committed
	and faulted into a new session has a NULL cPointer because the C
	PatternObject no longer exists.  When the wrapper remembers its
	_sre.compile() arguments, RECOMPILE transparently -- a deployed
	canonical-module closure (werkzeug URL rules, module-level
	re.compile()) must keep serving in later sessions.  Without the args
	(a wrapper minted by SreMatch>>re), signal rather than hand a
	NULL/stale address into C -- dereferencing it would crash the gem."

	(cPointer isNil or: [cPointer isNull]) ifTrue: [
		compileArgs isNil ifTrue: [
			^ self error: 'SrePattern is not valid in this session: a compiled regular expression does not persist across a commit/session boundary (recompile the pattern).'].
		[ | addr sreCls |
		"_sre's class definition follows SrePattern's in this file --
		resolve it at runtime rather than compile time."
		sreCls := System myUserProfile symbolList objectNamed: #'_sre'.
		addr := sreCls
			callCompile: (compileArgs at: 1) flags: (compileArgs at: 2)
			code: (compileArgs at: 3) groups: (compileArgs at: 4)
			groupindex: (compileArgs at: 5) indexgroup: (compileArgs at: 6).
		addr = 0 ifTrue: [
			^ self error: 'SrePattern recompile failed in this session (see compileArgs).'].
		cPointer := CPointer forAddress: addr ] value].
	^ cPointer memoryAddress
%

! ===============================================================================
! SrePattern - env 1 methods (Python-compatible)
!
! Each Python method is implemented as a set of arity-specialized Smalltalk
! selectors (`match:`, `match:_:`, `match:_:_:`) plus a varargs fallback
! (`_match:kw:`). The dispatch model rewrite (see docs/Rewrite_Dispatch_Model.md)
! replaces the old "block returned from accessor" convention with real methods
! that the codegen dispatches to directly. The varargs form handles first-class
! calls (e.g. `f = pattern.match; f(s)`) and any call site with keyword args.
! ===============================================================================

set compile_env: 1

! --------- match -----------------------------------------------------------

category: 'Grail-Methods'
method: SrePattern
match: aString
	"match(string) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'match' selfPtr: (self @env0:cPtrAddress)
		with: aString.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Grail-Methods'
method: SrePattern
match: aString _: pos
	"match(string, pos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'match' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Grail-Methods'
method: SrePattern
match: aString _: pos _: endpos
	"match(string, pos, endpos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'match' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos with: endpos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Grail-Methods - Private'
method: SrePattern
___resolveSPE___: positional kw: keywords for: fname
	"Bind positional + keyword arguments for the (string, pos, endpos)
	Pattern methods (match/search/fullmatch/findall/finditer).  Returns
	{ string. posOrNil. endposOrNil }; a nil pos/endpos means 'use the
	method default'.  Accepts CPython's keyword names and raises TypeError
	on a duplicate, an unknown keyword, or a missing string -- matching
	`pat.match(string=..., pos=..., endpos=...)`."

	| s p e recognized |
	s := nil. p := nil. e := nil.
	positional @env0:size @env0:> 3 ifTrue: [
		TypeError ___signal___: fname @env0:, '() takes 1 to 3 arguments'].
	positional @env0:size @env0:>= 1 ifTrue: [s := positional @env0:at: 1].
	positional @env0:size @env0:>= 2 ifTrue: [p := positional @env0:at: 2].
	positional @env0:size @env0:>= 3 ifTrue: [e := positional @env0:at: 3].
	(keywords ~~ nil @env0:and: [keywords @env0:isEmpty @env0:not]) ifTrue: [
		recognized := 0.
		(keywords @env0:includesKey: 'string') ifTrue: [
			s ~~ nil ifTrue: [TypeError ___signal___: fname @env0:, '() got multiple values for argument ''string'''].
			s := keywords @env0:at: 'string'. recognized := recognized @env0:+ 1].
		(keywords @env0:includesKey: 'pos') ifTrue: [
			p ~~ nil ifTrue: [TypeError ___signal___: fname @env0:, '() got multiple values for argument ''pos'''].
			p := keywords @env0:at: 'pos'. recognized := recognized @env0:+ 1].
		(keywords @env0:includesKey: 'endpos') ifTrue: [
			e ~~ nil ifTrue: [TypeError ___signal___: fname @env0:, '() got multiple values for argument ''endpos'''].
			e := keywords @env0:at: 'endpos'. recognized := recognized @env0:+ 1].
		keywords @env0:size @env0:> recognized ifTrue: [
			TypeError ___signal___: fname @env0:, '() got an unexpected keyword argument']].
	s == nil ifTrue: [
		TypeError ___signal___: fname @env0:, '() missing required argument: ''string'''].
	^ { s. p. e }
%

category: 'Grail-Methods'
method: SrePattern
_match: positional kw: keywords
	"Varargs dispatcher for match() — first-class calls and keyword args."
	| r s p e |
	r := self ___resolveSPE___: positional kw: keywords for: 'match'.
	s := r @env0:at: 1. p := r @env0:at: 2. e := r @env0:at: 3.
	e ~~ nil ifTrue: [^ self match: s _: (p == nil ifTrue: [0] ifFalse: [p]) _: e].
	p ~~ nil ifTrue: [^ self match: s _: p].
	^ self match: s
%

! --------- search ----------------------------------------------------------

category: 'Grail-Methods'
method: SrePattern
search: aString
	"search(string) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'search' selfPtr: (self @env0:cPtrAddress)
		with: aString.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Grail-Methods'
method: SrePattern
search: aString _: pos
	"search(string, pos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'search' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Grail-Methods'
method: SrePattern
search: aString _: pos _: endpos
	"search(string, pos, endpos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'search' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos with: endpos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Grail-Methods'
method: SrePattern
_search: positional kw: keywords
	"Varargs dispatcher for search()."
	| r s p e |
	r := self ___resolveSPE___: positional kw: keywords for: 'search'.
	s := r @env0:at: 1. p := r @env0:at: 2. e := r @env0:at: 3.
	e ~~ nil ifTrue: [^ self search: s _: (p == nil ifTrue: [0] ifFalse: [p]) _: e].
	p ~~ nil ifTrue: [^ self search: s _: p].
	^ self search: s
%

! --------- fullmatch -------------------------------------------------------

category: 'Grail-Methods'
method: SrePattern
fullmatch: aString
	"fullmatch(string) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'fullmatch' selfPtr: (self @env0:cPtrAddress)
		with: aString.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Grail-Methods'
method: SrePattern
fullmatch: aString _: pos
	"fullmatch(string, pos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'fullmatch' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Grail-Methods'
method: SrePattern
fullmatch: aString _: pos _: endpos
	"fullmatch(string, pos, endpos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'fullmatch' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos with: endpos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

category: 'Grail-Methods'
method: SrePattern
_fullmatch: positional kw: keywords
	"Varargs dispatcher for fullmatch()."
	| r s p e |
	r := self ___resolveSPE___: positional kw: keywords for: 'fullmatch'.
	s := r @env0:at: 1. p := r @env0:at: 2. e := r @env0:at: 3.
	e ~~ nil ifTrue: [^ self fullmatch: s _: (p == nil ifTrue: [0] ifFalse: [p]) _: e].
	p ~~ nil ifTrue: [^ self fullmatch: s _: p].
	^ self fullmatch: s
%

! --------- findall ---------------------------------------------------------

category: 'Grail-Methods'
method: SrePattern
findall: aString
	"findall(string) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'findall' selfPtr: (self @env0:cPtrAddress)
		with: aString
%

category: 'Grail-Methods'
method: SrePattern
findall: aString _: pos
	"findall(string, pos) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'findall' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos
%

category: 'Grail-Methods'
method: SrePattern
findall: aString _: pos _: endpos
	"findall(string, pos, endpos) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'findall' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos with: endpos
%

category: 'Grail-Methods'
method: SrePattern
_findall: positional kw: keywords
	"Varargs dispatcher for findall()."
	| r s p e |
	r := self ___resolveSPE___: positional kw: keywords for: 'findall'.
	s := r @env0:at: 1. p := r @env0:at: 2. e := r @env0:at: 3.
	e ~~ nil ifTrue: [^ self findall: s _: (p == nil ifTrue: [0] ifFalse: [p]) _: e].
	p ~~ nil ifTrue: [^ self findall: s _: p].
	^ self findall: s
%

! --------- scanner-semantics search ----------------------------------------

category: 'Grail-Methods - Private'
method: SrePattern
___searchFrom___: pos in: aString to: endpos mustAdvance: mustAdvance
	"One scanner step: search aString from pos, with CPython's
	must_advance semantics when mustAdvance is true (never return a
	zero-width match AT pos, but still allow a longer match starting
	there).  This is how CPython's sub/finditer/split iterate; skipping
	a whole character after a zero-width match instead (the old
	workaround) LOSES any non-empty match starting at that position
	(test_zerowidth: finditer(r'\b|\w+', 'a::bc') must yield (0,0) THEN
	(0,1)).  A real C Scanner cannot be kept across shim calls -- its
	SRE_STATE points into the per-call UCS4 buffer cache -- so the flag
	is exposed via the one-shot grail_search_advance method instead."

	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre'
		type: 'Pattern'
		method: (mustAdvance ifTrue: ['grail_search_advance'] ifFalse: ['search'])
		selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos with: endpos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]
%

! --------- finditer --------------------------------------------------------

category: 'Grail-Methods'
method: SrePattern
finditer: aString
	"finditer(string) -> iterator of SreMatch.  Returns a list (list is
	iterable in Python; werkzeug.routing uses ``for m in p.finditer(s)'').
	Walks the string with scanner semantics (see
	___searchFrom___:in:to:mustAdvance:)."
	^ self finditer: aString _: 0 _: aString @env0:size
%

category: 'Grail-Methods'
method: SrePattern
finditer: aString _: pos
	"finditer(string, pos) -> iterator of SreMatch."
	^ self finditer: aString _: pos _: aString @env0:size
%

category: 'Grail-Methods'
method: SrePattern
finditer: aString _: pos _: endpos
	"finditer(string, pos, endpos) -> iterator of SreMatch.  Returns a
	real iterator (CPython's finditer is lazy and single-pass; `for m in
	...` and next()/StopIteration both work), built by walking with
	scanner semantics: after a zero-width match the next search runs from
	the SAME position with must_advance set, so a longer match starting
	there is still found (test_zerowidth)."
	| matches cursor m mStart mEnd mustAdvance |
	matches := OrderedCollection @env0:new.
	cursor := pos.
	mustAdvance := false.
	[cursor @env0:<= endpos] @env0:whileTrue: [
		m := self ___searchFrom___: cursor in: aString to: endpos mustAdvance: mustAdvance.
		(m == None) ifTrue: [^ matches __iter__].
		matches @env0:add: m.
		mStart := m start.
		mEnd := m end.
		mustAdvance := mEnd @env0:= mStart.
		cursor := mEnd
	].
	^ matches __iter__
%

category: 'Grail-Methods'
method: SrePattern
_finditer: positional kw: keywords
	"Varargs dispatcher for finditer()."
	| r s p e |
	r := self ___resolveSPE___: positional kw: keywords for: 'finditer'.
	s := r @env0:at: 1. p := r @env0:at: 2. e := r @env0:at: 3.
	e ~~ nil ifTrue: [^ self finditer: s _: (p == nil ifTrue: [0] ifFalse: [p]) _: e].
	p ~~ nil ifTrue: [^ self finditer: s _: p].
	^ self finditer: s
%

! --------- scanner (pattern.scanner()) ------------------------------------

category: 'Grail-Methods'
method: SrePattern
scanner: aString
	"scanner(string) -> SreScanner positioned at 0."
	^ (SreScanner @env0:new) ___init___: self string: aString cursor: 0 endpos: aString @env0:size
%

category: 'Grail-Methods'
method: SrePattern
scanner: aString _: pos
	"scanner(string, pos) -> SreScanner."
	^ (SreScanner @env0:new) ___init___: self string: aString cursor: pos endpos: aString @env0:size
%

category: 'Grail-Methods'
method: SrePattern
scanner: aString _: pos _: endpos
	"scanner(string, pos, endpos) -> SreScanner."
	^ (SreScanner @env0:new) ___init___: self string: aString cursor: pos endpos: endpos
%

category: 'Grail-Methods'
method: SrePattern
_scanner: positional kw: keywords
	"Varargs dispatcher for scanner() — positional and keyword args
	(string, pos, endpos)."
	| r s p e |
	r := self ___resolveSPE___: positional kw: keywords for: 'scanner'.
	s := r @env0:at: 1. p := r @env0:at: 2. e := r @env0:at: 3.
	e ~~ nil ifTrue: [^ self scanner: s _: (p == nil ifTrue: [0] ifFalse: [p]) _: e].
	p ~~ nil ifTrue: [^ self scanner: s _: p].
	^ self scanner: s
%

category: 'Grail-Scanner'
method: SreScanner
___init___: aPattern string: aString cursor: c endpos: e
	"Initialize the scanner state."
	pattern := aPattern.
	string := aString.
	cursor := c.
	endpos := e.
	mustAdvance := false.
	^ self
%

category: 'Grail-Scanner'
method: SreScanner
pattern
	"The SrePattern this scanner is scanning with (CPython SRE_Scanner.pattern)."
	^ pattern
%

category: 'Grail-Scanner'
method: SreScanner
search
	"scanner.search() -> the next SreMatch (advancing the internal cursor),
	or None when exhausted.  Mirrors finditer's per-step logic: after a
	zero-width match the next search runs with must_advance set."
	| m mStart mEnd |
	cursor @env0:> endpos ifTrue: [^ None].
	m := pattern ___searchFrom___: cursor in: string to: endpos mustAdvance: mustAdvance.
	m == None ifTrue: [^ None].
	mStart := m start.
	mEnd := m end.
	mustAdvance := mEnd @env0:= mStart.
	cursor := mEnd.
	^ m
%

category: 'Grail-Scanner'
method: SreScanner
match
	"scanner.match() -> an SreMatch anchored at the cursor (advancing), or
	None.  A forced (must_advance) zero-width match at the cursor is
	rejected and the cursor steps forward, matching CPython."
	| m mStart mEnd |
	cursor @env0:> endpos ifTrue: [^ None].
	m := pattern match: string _: cursor _: endpos.
	m == None ifTrue: [
		mustAdvance ifTrue: [cursor := cursor @env0:+ 1].
		^ None].
	mStart := m start.
	mEnd := m end.
	(mustAdvance @env0:and: [mEnd @env0:= mStart]) ifTrue: [
		cursor := cursor @env0:+ 1.
		mustAdvance := false.
		^ None].
	mustAdvance := mEnd @env0:= mStart.
	cursor := mEnd.
	^ m
%

! --------- sub -------------------------------------------------------------

category: 'Grail-Methods'
method: SrePattern
sub: repl _: aString
	"sub(repl, string) -> str"
	^ self sub: repl _: aString _: 0
%

category: 'Grail-Methods'
method: SrePattern
sub: repl _: aString _: count
	"sub(repl, string, count) -> str.

	Non-literal (`\1` / `\g<name>`) or callable replacements are
	expanded on the Grail side: the C-level template machinery
	relies on a `TemplateObject` allocated by
	`PyObject_GC_NewVar` and ferried through a `PyObject_Vectorcall`
	that round-trips back into the shim — a path the shim's
	OOP-marshalling can't carry without an SreTemplate wrapper.
	Literal replacements still take the C fast path."

	(self ___isLiteralRepl___: repl) ifTrue: [
		^ (CPythonShim @env0:current)
			@env0:callTyped: '_sre' type: 'Pattern' method: 'sub' selfPtr: (self @env0:cPtrAddress)
			with: repl with: aString with: count
	].
	^ (self ___subWithExpansion___: repl in: aString count: count subn: false)
%

category: 'Grail-Methods'
method: SrePattern
_sub: positional kw: keywords
	"Varargs dispatcher for sub()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 2) ifTrue: [^ self sub: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs == 3) ifTrue: [^ self sub: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'sub() takes 2 or 3 arguments'
%

! --------- subn ------------------------------------------------------------

category: 'Grail-Methods'
method: SrePattern
subn: repl _: aString
	"subn(repl, string) -> (str, int)"
	^ self subn: repl _: aString _: 0
%

category: 'Grail-Methods'
method: SrePattern
subn: repl _: aString _: count
	"subn(repl, string, count) -> (str, int).  See sub:_:_: for
	why non-literal replacements expand on the Grail side."

	(self ___isLiteralRepl___: repl) ifTrue: [
		^ (CPythonShim @env0:current)
			@env0:callTyped: '_sre' type: 'Pattern' method: 'subn' selfPtr: (self @env0:cPtrAddress)
			with: repl with: aString with: count
	].
	^ (self ___subWithExpansion___: repl in: aString count: count subn: true)
%

category: 'Grail-Methods'
method: SrePattern
_subn: positional kw: keywords
	"Varargs dispatcher for subn()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 2) ifTrue: [^ self subn: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs == 3) ifTrue: [^ self subn: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'subn() takes 2 or 3 arguments'
%

! --------- sub/subn: Smalltalk-side expansion helpers ---------------------
! See sub:_:_: for the rationale. The literal vs. non-literal split is
! a Grail workaround for the missing TemplateObject marshalling — the C
! side handles the literal case (no template object needed); we walk
! the matches in Smalltalk for the non-literal case.

category: 'Grail-Methods - Private'
classmethod: SrePattern
___isLiteralRepl___: repl
	"Class-side mirror so instance and other receivers share the rule.
	A literal replacement (Python's sub fast path) is a string-shaped
	value containing no backslash and not callable.  Callables and
	templates with `\` references both need full expansion."

	(repl isKindOf: CharacterCollection) ifFalse: [^ false].
	^ (repl @env0:indexOf: $\) @env0:= 0
%

category: 'Grail-Methods - Private'
method: SrePattern
___isLiteralRepl___: repl
	"Forward to the class-side rule so subn:_:_: shares it too."

	^ self @env0:class ___isLiteralRepl___: repl
%

category: 'Grail-Methods - Private'
method: SrePattern
___subWithExpansion___: repl in: aString count: count subn: returnTuple
	"Walk every match in aString (or the first `count` if count > 0)
	and rebuild the result string with each match replaced by the
	expansion of `repl`.  Mirrors CPython's pattern_subx for the
	non-literal / callable replacement path, but without going through
	the C TemplateObject — that round trip needs a Smalltalk wrapper
	for the heap-allocated template that the shim doesn't yet
	support.  Returns a String when ``returnTuple`` is false, or a
	(String, count) tuple when true (the subn return shape)."

	| parser template parts pos m mEnd mStart expanded numSubs result tail emptySep mustAdvance |
	parser := importlib modules @env0:at: #'re._parser'.
	"A bytes pattern substituting over a bytes subject must return
	bytes (CPython semantics) — join with an empty ByteArray so the
	result class follows the subject.  The old unconditional '' join
	returned a str whose ByteArray-equality only held under the
	kernel's lenient CharacterCollection>>= (a GLASS host extent's
	Squeak-style override answers false)."
	emptySep := (aString isKindOf: ByteArray)
		ifTrue: [ByteArray @env0:new]
		ifFalse: [''].
	"For callable repl we use template=nil as the marker; otherwise
	parse the replacement string once."
	((repl isKindOf: BoundMethod)
		or: [(repl isKindOf: ExecBlock)
			or: [repl isKindOf: GsNMethod]])
		ifTrue: [template := nil]
		ifFalse: [template := parser parse_template: repl _: self].
	parts := OrderedCollection @env0:new.
	pos := 0.
	numSubs := 0.
	mustAdvance := false.
	[
		(count @env0:> 0 and: [numSubs @env0:>= count]) ifTrue: [
			"Reached count limit; break with tail kept."
			parts @env0:add: (aString @env0:copyFrom: pos @env0:+ 1 to: aString @env0:size).
			^ returnTuple
				ifTrue: [(tuple @env0:withAll: { (emptySep join: parts). numSubs })]
				ifFalse: [emptySep join: parts]
		].
		"Scanner semantics (CPython pattern_subx): after a zero-width
		match the next search runs from the SAME position with
		must_advance set.  The old skip-one-character workaround both
		lost non-empty matches starting at that position AND, for a
		zero-width match at end-of-string, never terminated -- the C
		engine clamps a pos beyond len back to len, so plain search
		re-returned the same (len,len) match forever (test_zerowidth)."
		m := self ___searchFrom___: pos in: aString to: aString @env0:size mustAdvance: mustAdvance.
		(m == nil or: [m == None]) ifTrue: [
			parts @env0:add: (aString @env0:copyFrom: pos @env0:+ 1 to: aString @env0:size).
			^ returnTuple
				ifTrue: [(tuple @env0:withAll: { (emptySep join: parts). numSubs })]
				ifFalse: [emptySep join: parts]
		].
		mStart := m start.
		mEnd := m end.
		"Prefix from pos to match start."
		mStart @env0:> pos ifTrue: [
			parts @env0:add: (aString @env0:copyFrom: pos @env0:+ 1 to: mStart)
		].
		"Expand the replacement."
		template == nil
			ifTrue: [
				"Callable repl: call with the match, expect a string back.
				A Grail Python callable (lambda / def) compiles to a 2-arg
				block ``[:___positional___ :___kwargs___ | ...]'', so it must
				be invoked with the Grail calling convention (positional
				array + kwargs), NOT ``value: m'' — that raises ``block
				evaluated with 1 argument when 2 were expected''.  A
				BoundMethod uses its env-1 value:value:; a raw 1-arg
				Smalltalk block (rare) is called directly."
				expanded := (repl isKindOf: ExecBlock)
					ifTrue: [
						repl @env0:numArgs @env0:= 2
							ifTrue: [repl @env0:value: { m } value: nil]
							ifFalse: [repl @env0:value: m]]
					ifFalse: [repl value: { m } value: nil]
			]
			ifFalse: [
				expanded := self ___expandTemplate___: template withMatch: m
			].
		parts @env0:add: expanded.
		numSubs := numSubs @env0:+ 1.
		mustAdvance := mEnd @env0:= mStart.
		pos := mEnd
	] @env0:repeat
%

category: 'Grail-Methods - Private'
method: SrePattern
___expandTemplate___: aTemplate withMatch: m
	"Walk the template list (interleaved string literals and integer
	group indices, as produced by re._parser.parse_template) and
	build the replacement string for this match."

	| parts |
	parts := OrderedCollection @env0:new.
	aTemplate @env0:do: [:item |
		(item isKindOf: SmallInteger)
			ifTrue: [
				| g |
				g := m group: item.
				"Unmatched group -> empty string (CPython 3.5+ sub
				semantics).  group: answers the Python None SINGLETON,
				not Smalltalk nil -- comparing only against nil let None
				leak into the join and DNU on do: (test_symbolic_refs)."
				(g == nil or: [g == None]) ifFalse: [parts @env0:add: g]
			]
			ifFalse: [parts @env0:add: item]
	].
	"Bytes templates must expand to bytes — join with an empty
	ByteArray when the parts are bytes (see ___subWithExpansion___)."
	^ (parts @env0:notEmpty and: [(parts @env0:at: 1) isKindOf: ByteArray])
		ifTrue: [(ByteArray @env0:new) join: parts]
		ifFalse: ['' join: parts]
%

! --------- split -----------------------------------------------------------

category: 'Grail-Methods'
method: SrePattern
split: aString
	"split(string) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'split' selfPtr: (self @env0:cPtrAddress)
		with: aString
%

category: 'Grail-Methods'
method: SrePattern
split: aString _: maxsplit
	"split(string, maxsplit) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'split' selfPtr: (self @env0:cPtrAddress)
		with: aString with: maxsplit
%

category: 'Grail-Methods'
method: SrePattern
_split: positional kw: keywords
	"Varargs dispatcher for split() — positional and keyword args
	(string, maxsplit)."
	| s m recognized |
	s := nil. m := nil.
	positional @env0:size @env0:> 2 ifTrue: [
		TypeError ___signal___: 'split() takes 1 or 2 arguments'].
	positional @env0:size @env0:>= 1 ifTrue: [s := positional @env0:at: 1].
	positional @env0:size @env0:>= 2 ifTrue: [m := positional @env0:at: 2].
	(keywords ~~ nil @env0:and: [keywords @env0:isEmpty @env0:not]) ifTrue: [
		recognized := 0.
		(keywords @env0:includesKey: 'string') ifTrue: [
			s ~~ nil ifTrue: [TypeError ___signal___: 'split() got multiple values for argument ''string'''].
			s := keywords @env0:at: 'string'. recognized := recognized @env0:+ 1].
		(keywords @env0:includesKey: 'maxsplit') ifTrue: [
			m ~~ nil ifTrue: [TypeError ___signal___: 'split() got multiple values for argument ''maxsplit'''].
			m := keywords @env0:at: 'maxsplit'. recognized := recognized @env0:+ 1].
		keywords @env0:size @env0:> recognized ifTrue: [
			TypeError ___signal___: 'split() got an unexpected keyword argument']].
	s == nil ifTrue: [TypeError ___signal___: 'split() missing required argument: ''string'''].
	m ~~ nil ifTrue: [^ self split: s _: m].
	^ self split: s
%

category: 'Grail-Properties'
method: SrePattern
pattern
	"The pattern string from which the RE object was compiled."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'pattern' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Properties'
method: SrePattern
flags
	"The regex matching flags."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'flags' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Properties'
method: SrePattern
groups
	"The number of capturing groups in the pattern."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'groups' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Properties'
method: SrePattern
groupindex
	"A dictionary mapping group names to group numbers."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'groupindex' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Printing'
method: SrePattern
__repr__
	"repr(pattern) -> re.compile('source', re.FLAG|...) mirroring
	CPython's pattern_repr: the source repr truncated to 200 chars,
	flag names in sre.c's table order, and the implicit re.UNICODE
	dropped for str patterns (test_pattern_compile repr checks)."

	| src flagsVal srcRepr names stream |
	src := self pattern.
	flagsVal := self flags.
	(src isKindOf: ByteArray) ifFalse: [
		flagsVal := flagsVal @env0:- (flagsVal @env0:bitAnd: 32)
	].
	names := OrderedCollection @env0:new.
	{ { 're.TEMPLATE'. 1 }. { 're.IGNORECASE'. 2 }. { 're.LOCALE'. 4 }.
	  { 're.MULTILINE'. 8 }. { 're.DOTALL'. 16 }. { 're.UNICODE'. 32 }.
	  { 're.VERBOSE'. 64 }. { 're.DEBUG'. 128 }. { 're.ASCII'. 256 } }
		@env0:do: [:pair |
			((flagsVal @env0:bitAnd: (pair @env0:at: 2)) @env0:= 0) ifFalse: [
				names @env0:add: (pair @env0:at: 1)]].
	srcRepr := src __repr__.
	srcRepr @env0:size @env0:> 200 ifTrue: [
		srcRepr := srcRepr @env0:copyFrom: 1 to: 200].
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: 're.compile('.
	stream @env0:nextPutAll: srcRepr.
	names @env0:notEmpty ifTrue: [
		stream @env0:nextPutAll: ', '.
		names @env0:do: [:n | stream @env0:nextPutAll: n]
			separatedBy: [stream @env0:nextPut: $|]].
	stream @env0:nextPut: $).
	^ stream @env0:contents
%

! ===============================================================================
! SreMatch - env 0 class methods
! ===============================================================================

set compile_env: 0

category: 'Grail-Instance Creation'
classmethod: SreMatch
newFromCPtr: anAddress
	"Create a match wrapper for the C MatchObject* at anAddress (a
	SmallInteger returned by the shim). Returns nil for a NULL address.

	As with SrePattern, the address is boxed in a CPointer so a committed
	match faults into a fresh session as NULL rather than a stale integer
	address that would SEGV when dereferenced in C."

	anAddress = 0 ifTrue: [^ nil].
	^ self basicNew initCPointer: (CPointer forAddress: anAddress)
%

category: 'Grail-Python Attribute Hook'
classmethod: SreMatch
___pythonValueAttrs___
	"Selectors whose Smalltalk methods are exposed to Python as
	*value* attributes rather than bound methods.  Mirrors
	CPython's `Match` struct members: pos / endpos / lastindex /
	lastgroup / re / string / regs."

	^ IdentitySet new
		add: #pos;
		add: #endpos;
		add: #lastindex;
		add: #lastgroup;
		add: #re;
		add: #string;
		add: #regs;
		yourself
%

category: 'Grail-Private'
method: SreMatch
initCPointer: aCPointer
	cPointer := aCPointer
%

category: 'Grail-Accessing'
method: SreMatch
cPointer
	"The CPointer wrapping the C MatchObject* (NULL across a session boundary)."
	^ cPointer
%

category: 'Grail-Private'
method: SreMatch
cPtrAddress
	"The raw C address to hand to the shim. Signal rather than pass a
	NULL/stale address into C: a match that was committed and faulted into a
	new session has a NULL cPointer because the C MatchObject no longer
	exists, and dereferencing it would crash the gem."

	(cPointer isNil or: [cPointer isNull]) ifTrue: [
		^ self error: 'SreMatch is not valid in this session: a match object does not persist across a commit/session boundary (recompute the match).'].
	^ cPointer memoryAddress
%

! ===============================================================================
! SreMatch - env 1 methods (Python-compatible)
! ===============================================================================

set compile_env: 1

! --------- group -----------------------------------------------------------

category: 'Grail-Methods'
method: SreMatch
group
	"group() -> str (whole match, equivalent to group(0))"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Methods - Private'
method: SreMatch
___groupKey___: arg
	"Normalize a group() argument.  A group name (string) passes through;
	an integer (directly or via __index__ on an index-like object such as
	numpy ints or the test's Index wrapper) is range-checked.  An index
	outside the SmallInteger range cannot name any group and would be
	silently truncated by the C marshalling, so raise IndexError -- CPython
	raises IndexError for out-of-range / oversized group indices."
	| idx |
	(arg @env0:isKindOf: CharacterCollection) ifTrue: [^ arg].
	idx := (arg @env0:isKindOf: Integer)
		ifTrue: [arg]
		ifFalse: [
			((arg @env0:class @env0:whichClassIncludesSelector: #'__index__' environmentId: 1) ~~ nil)
				ifTrue: [arg __index__]
				ifFalse: [^ arg]].
	(idx @env0:isKindOf: SmallInteger) ifFalse: [
		IndexError ___signal___: 'no such group'].
	^ idx
%

category: 'Grail-Methods'
method: SreMatch
group: groupArg
	"group(groupN) -> str"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: (self @env0:cPtrAddress)
		with: (self ___groupKey___: groupArg)
%

category: 'Grail-Methods'
method: SreMatch
__getitem__: groupArg
	"``m[g]'' — subscripting a match is ``m.group(g)'' in CPython.
	django.urls.resolvers._route_to_regex reads named groups as
	``match['parameter']''."

	^ self group: groupArg
%

category: 'Grail-Methods'
method: SreMatch
group: g1 _: g2
	"group(g1, g2) -> tuple"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: (self @env0:cPtrAddress)
		with: (self ___groupKey___: g1) with: (self ___groupKey___: g2)
%

category: 'Grail-Methods'
method: SreMatch
group: g1 _: g2 _: g3
	"group(g1, g2, g3) -> tuple"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: (self @env0:cPtrAddress)
		with: (self ___groupKey___: g1) with: (self ___groupKey___: g2) with: (self ___groupKey___: g3)
%

category: 'Grail-Methods'
method: SreMatch
_group: positional kw: keywords
	"Varargs dispatcher for group()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 0) ifTrue: [^ self group].
	(nargs == 1) ifTrue: [^ self group: (positional @env0:at: 1)].
	(nargs == 2) ifTrue: [^ self group: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs == 3) ifTrue: [^ self group: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'group() takes 0 to 3 arguments'
%

! --------- groups ----------------------------------------------------------

category: 'Grail-Methods'
method: SreMatch
groups
	"groups() -> tuple"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'groups' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Methods'
method: SreMatch
groups: defaultValue
	"groups(default) -> tuple.  The C ``groups'' entry ignores the
	default argument, so substitute it here: every unmatched group
	(None) becomes defaultValue.  django.urls.resolvers relies on
	``match.groups(default='str')'' to default the optional converter
	group."
	| raw result |
	raw := (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'groups' selfPtr: (self @env0:cPtrAddress).
	(defaultValue == nil or: [defaultValue == None]) ifTrue: [^ raw].
	result := list ___new___.
	raw @env0:do: [:each |
		result append: ((each == None or: [each == nil])
			ifTrue: [defaultValue] ifFalse: [each])].
	^ tuple @env0:withAll: result
%

category: 'Grail-Methods'
method: SreMatch
_groups: positional kw: keywords
	"Varargs dispatcher for groups().  ``default'' may arrive
	positionally OR as a keyword (django calls
	``match.groups(default='str')'')."
	| nargs default |
	nargs := positional @env0:size.
	default := nil.
	nargs @env0:>= 1 ifTrue: [default := positional @env0:at: 1].
	(keywords @env0:isNil @env0:not and: [keywords @env0:includesKey: 'default'])
		ifTrue: [default := keywords @env0:at: 'default'].
	default @env0:isNil ifTrue: [^ self groups].
	^ self groups: default
%

! --------- groupdict -------------------------------------------------------

category: 'Grail-Methods'
method: SreMatch
groupdict
	"groupdict() -> dict"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'groupdict' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Methods'
method: SreMatch
groupdict: defaultValue
	"groupdict(default) -> dict"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'groupdict' selfPtr: (self @env0:cPtrAddress)
		with: defaultValue
%

category: 'Grail-Methods'
method: SreMatch
_groupdict: positional kw: keywords
	"Varargs dispatcher for groupdict()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 0) ifTrue: [^ self groupdict].
	(nargs == 1) ifTrue: [^ self groupdict: (positional @env0:at: 1)].
	TypeError ___signal___: 'groupdict() takes 0 or 1 arguments'
%

! --------- start -----------------------------------------------------------

category: 'Grail-Methods'
method: SreMatch
start
	"start() -> int"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'start' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Methods'
method: SreMatch
start: groupArg
	"start(group) -> int"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'start' selfPtr: (self @env0:cPtrAddress)
		with: groupArg
%

category: 'Grail-Methods'
method: SreMatch
_start: positional kw: keywords
	"Varargs dispatcher for start()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 0) ifTrue: [^ self start].
	(nargs == 1) ifTrue: [^ self start: (positional @env0:at: 1)].
	TypeError ___signal___: 'start() takes 0 or 1 arguments'
%

! --------- end -------------------------------------------------------------

category: 'Grail-Methods'
method: SreMatch
end
	"end() -> int"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'end' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Methods'
method: SreMatch
end: groupArg
	"end(group) -> int"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'end' selfPtr: (self @env0:cPtrAddress)
		with: groupArg
%

category: 'Grail-Methods'
method: SreMatch
_end: positional kw: keywords
	"Varargs dispatcher for end()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 0) ifTrue: [^ self end].
	(nargs == 1) ifTrue: [^ self end: (positional @env0:at: 1)].
	TypeError ___signal___: 'end() takes 0 or 1 arguments'
%

! --------- span ------------------------------------------------------------

category: 'Grail-Methods'
method: SreMatch
span
	"span() -> (int, int)"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'span' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Methods'
method: SreMatch
span: groupArg
	"span(group) -> (int, int)"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'span' selfPtr: (self @env0:cPtrAddress)
		with: groupArg
%

category: 'Grail-Methods'
method: SreMatch
_span: positional kw: keywords
	"Varargs dispatcher for span()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 0) ifTrue: [^ self span].
	(nargs == 1) ifTrue: [^ self span: (positional @env0:at: 1)].
	TypeError ___signal___: 'span() takes 0 or 1 arguments'
%

! --------- expand ----------------------------------------------------------

category: 'Grail-Methods'
method: SreMatch
expand: template
	"expand(template) -> str.

	Expanded on the Grail side (re._parser.parse_template plus the same
	___expandTemplate___ that sub uses) rather than via the C
	match_expand: that path fetches AND CALLS re._compile_template,
	whose Python body needs `_sre.template` -- a heap TemplateObject
	the shim's OOP-marshalling can't carry (see SrePattern>>sub:_:_:).
	Worse, the AttributeError it raised inside the GciPerform callback
	could not unwind across the user-action frame, degenerating into an
	UncontinuableError storm."

	| pat parser parsed |
	pat := self re.
	parser := importlib modules @env0:at: #'re._parser'.
	parsed := parser parse_template: template _: pat.
	^ pat ___expandTemplate___: parsed withMatch: self
%

category: 'Grail-Methods'
method: SreMatch
_expand: positional kw: keywords
	"Varargs dispatcher for expand()."
	^ self expand: (positional @env0:at: 1)
%

category: 'Grail-Properties'
method: SreMatch
string
	"The string passed to match() or search()."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'string' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Properties'
method: SreMatch
re
	"The regular expression object."
	"Returns the C pointer for the pattern object, wrapped as SrePattern."
	| patCPtr |
	patCPtr := (CPythonShim @env0:current) @env0:callTypedReturnCPtr: '_sre' type: 'Match' method: 're' selfPtr: (self @env0:cPtrAddress).
	^ SrePattern @env0:newFromCPtr: patCPtr
%

category: 'Grail-Properties'
method: SreMatch
pos
	"The value of pos passed to search() or match()."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'pos' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Properties'
method: SreMatch
endpos
	"The value of endpos passed to search() or match()."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'endpos' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Properties'
method: SreMatch
lastindex
	"The integer index of the last matched capturing group."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'lastindex' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Properties'
method: SreMatch
lastgroup
	"The name of the last matched capturing group."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'lastgroup' selfPtr: (self @env0:cPtrAddress)
%

category: 'Grail-Properties'
method: SreMatch
regs
	"A tuple of (start, end) for each group."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'regs' selfPtr: (self @env0:cPtrAddress)
%

! ===============================================================================
! _sre module - env 0 class methods — bridge to CPythonShim
! ===============================================================================

set compile_env: 0

category: 'Grail-Private'
classmethod: _sre
callGetcodesize
	"Call _sre.getcodesize() via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'getcodesize'
%

category: 'Grail-Private'
classmethod: _sre
callAsciiIscased: character
	"Call _sre.ascii_iscased(character) via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'ascii_iscased'
		with: character
%

category: 'Grail-Private'
classmethod: _sre
callUnicodeIscased: character
	"Call _sre.unicode_iscased(character) via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'unicode_iscased'
		with: character
%

category: 'Grail-Private'
classmethod: _sre
callAsciiTolower: character
	"Call _sre.ascii_tolower(character) via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'ascii_tolower'
		with: character
%

category: 'Grail-Private'
classmethod: _sre
callUnicodeTolower: character
	"Call _sre.unicode_tolower(character) via CPythonShim."

	^ CPythonShim current
		callModule: '_sre'
		method: 'unicode_tolower'
		with: character
%

category: 'Grail-Private'
classmethod: _sre
callCompile: pattern flags: flags code: code groups: groups groupindex: groupindex indexgroup: indexgroup
	"Call _sre.compile(...) → returns C pointer (SmallInteger).

	A nil/None pattern is legal in CPython (re.Scanner compiles a combined
	SubPattern with pattern=None; the C side only stores it as .pattern),
	but the shim's marshalling wants a string, so substitute '' -- the
	compiled matcher is driven entirely by `code`, not by `pattern`."

	| pat |
	pat := (pattern == nil @env0:or: [pattern == None]) ifTrue: [''] ifFalse: [pattern].
	^ CPythonShim current
		callModule6ReturnCPtr: '_sre.compile'
		with: pat with: flags with: code
		with: groups with: groupindex with: indexgroup
%

! ===============================================================================
! _sre module - env 1 instance methods — Python-compatible callables
! ===============================================================================

set compile_env: 1

category: 'Grail-Initialization'
method: _sre
initialize
	"Initialize module-level constants."
	self @env0:at: #MAGIC put: 20230612.
	self @env0:at: #CODESIZE put: 4.
	self @env0:at: #MAXREPEAT put: 4294967295.
	self @env0:at: #MAXGROUPS put: 1073741823.
%

! ===============================================================================
! Module-level fast-path callables
! ===============================================================================

category: 'Grail-Built-in Functions'
method: _sre
getcodesize
	"_sre.getcodesize() -> int"
	^ self @env0:class @env0:callGetcodesize
%

category: 'Grail-Built-in Functions'
method: _sre
ascii_iscased: character
	"_sre.ascii_iscased(character) -> bool"
	^ self @env0:class @env0:callAsciiIscased: character
%

category: 'Grail-Built-in Functions'
method: _sre
unicode_iscased: character
	"_sre.unicode_iscased(character) -> bool"
	^ self @env0:class @env0:callUnicodeIscased: character
%

category: 'Grail-Built-in Functions'
method: _sre
ascii_tolower: character
	"_sre.ascii_tolower(character) -> int"
	^ self @env0:class @env0:callAsciiTolower: character
%

category: 'Grail-Built-in Functions'
method: _sre
unicode_tolower: character
	"_sre.unicode_tolower(character) -> int"
	^ self @env0:class @env0:callUnicodeTolower: character
%

category: 'Grail-Built-in Functions'
method: _sre
compile: pattern _: flags _: code _: groups _: groupindex _: indexgroup
	"_sre.compile(pattern, flags, code, groups, groupindex, indexgroup)
	-> SrePattern"

	| cPtr |
	cPtr := self @env0:class @env0:callCompile: pattern flags: flags code: code groups: groups groupindex: groupindex indexgroup: indexgroup.
	"Remember the compile arguments so a committed pattern faulted into a
	later session can recompile itself transparently (cPtrAddress)."
	^ SrePattern @env0:newFromCPtr: cPtr
		compileArgs: { pattern. flags. code. groups. groupindex. indexgroup }
%

! ===============================================================================
! Module-level stored-attribute accessors (constants)
! ===============================================================================

category: 'Grail-Accessors'
method: _sre
MAGIC
	^ self @env0:at: #MAGIC
%

category: 'Grail-Accessors'
method: _sre
CODESIZE
	^ self @env0:at: #CODESIZE
%

category: 'Grail-Accessors'
method: _sre
MAXREPEAT
	^ self @env0:at: #MAXREPEAT
%

category: 'Grail-Accessors'
method: _sre
MAXGROUPS
	^ self @env0:at: #MAXGROUPS
%

set compile_env: 0
