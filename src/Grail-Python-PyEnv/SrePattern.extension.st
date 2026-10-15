Extension { #name : 'SrePattern' }

{ #category : 'Grail-Methods - Private' }
SrePattern class >> ___isLiteralRepl___: repl [
	"Class-side mirror so instance and other receivers share the rule.
	A literal replacement (Python's sub fast path) is a string-shaped
	value containing no backslash and not callable.  Callables and
	templates with `\` references both need full expansion."

	(repl isKindOf: CharacterCollection) ifFalse: [^ false].
	^ (repl @env0:indexOf: $\) @env0:= 0

]

{ #category : 'Grail-Methods - Private' }
SrePattern class >> ___reParser___ [
	"The re._parser module, IMPORTED -- registered in this session if it was
	not, and answered either way.

	It used to be looked up by name in the session's sys.modules, with no
	fallback.  Python code in re reaches _parser through the committed module's
	own binding, so it works in any session; only that by-name lookup needed
	the submodule REGISTERED here, which a session that merely warm-binds a
	deployed module never does.  There the lookup was an uncatchable
	LookupError and the process ended -- unless something earlier had
	compiled a regex, which is why it looked intermittent (#1253)."

	^ (importlib @env0:___instance___) @env1:import_module: 're._parser'

]

{ #category : 'Grail-Instantiation' }
SrePattern class >> ___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames [
	"``class B(re.Pattern)'' -- CPython's C type has no Py_TPFLAGS_BASETYPE."
	^ TypeError ___signal___: 'type ''re.Pattern'' is not an acceptable base type'

]

{ #category : 'Grail-Python Attribute Hook' }
SrePattern class >> __module__ [
	"type(pattern).__module__ (test_re.py's test_match_repr formats its
	regex against this)."
	^ 're'

]

{ #category : 'Grail-Python Attribute Hook' }
SrePattern class >> __name__ [
	"type(x).__name__ -- 'Pattern', as __qualname__ below.  typing names its alias
	after the origin's __name__ (``Pattern = _alias(stdlib_re.Pattern, 1)''), so
	the Smalltalk name leaked into ``repr(typing.Pattern)'' as typing.SrePattern."
	^ 'Pattern'

]

{ #category : 'Grail-Instance Creation' }
SrePattern class >> __new__ [
	"CPython's re.Pattern type disallows direct instantiation (bpo-43916)
	-- Pattern objects only ever come from re.compile()/_sre.compile().
	Grail-side instances are all created via newFromCPtr:(compileArgs:),
	not the Python-facing constructor, so this is safe to reject
	unconditionally (test_re.py's test_disallow_instantiation).

	NOTE: the zero-arg Python call ``re.Pattern()`` dispatches through
	Object class>>value:value: to bare __new__, NOT _new:kw: (that
	varargs entry is only consulted when kwargs is non-empty) --
	overriding _new:kw: alone left the plain 0-arg call unblocked."

	TypeError ___signal___: 'cannot create ''re.Pattern'' instances'

]

{ #category : 'Grail-Python Attribute Hook' }
SrePattern class >> __qualname__ [
	"type(pattern).__qualname__ -- CPython spells it 'Pattern', not the
	Smalltalk class name 'SrePattern'."
	^ 'Pattern'

]

{ #category : 'Grail-Methods - Private' }
SrePattern >> ___expandTemplate___: aTemplate withMatch: m [
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

]

{ #category : 'Grail-Comparison' }
SrePattern >> ___isBytesPattern___ [
	"True when compiled from bytes (the source is a ByteArray) -- the C
	PatternObject isbytes flag, used by __eq__/__hash__."
	^ (self pattern) @env0:isKindOf: ByteArray

]

{ #category : 'Grail-Methods - Private' }
SrePattern >> ___isLiteralRepl___: repl [
	"Forward to the class-side rule so subn:_:_: shares it too."

	^ self @env0:class ___isLiteralRepl___: repl

]

{ #category : 'Grail-Methods - Private' }
SrePattern >> ___resolveSPE___: positional kw: keywords for: fname [
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

]

{ #category : 'Grail-Methods - Private' }
SrePattern >> ___searchFrom___: pos in: aString to: endpos mustAdvance: mustAdvance [
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

]

{ #category : 'Grail-Methods - Private' }
SrePattern >> ___subWithExpansion___: repl in: aString count: count subn: returnTuple [
	"Walk every match in aString (or the first `count` if count > 0)
	and rebuild the result string with each match replaced by the
	expansion of `repl`.  Mirrors CPython's pattern_subx for the
	non-literal / callable replacement path, but without going through
	the C TemplateObject — that round trip needs a Smalltalk wrapper
	for the heap-allocated template that the shim doesn't yet
	support.  Returns a String when ``returnTuple`` is false, or a
	(String, count) tuple when true (the subn return shape)."

	| template parts pos m mEnd mStart expanded numSubs emptySep mustAdvance |
	"A bytes pattern substituting over a bytes subject must return
	bytes (CPython semantics) — join with an empty ByteArray so the
	result class follows the subject.  The old unconditional '' join
	returned a str whose ByteArray-equality only held under the
	kernel's lenient CharacterCollection>>= (a GLASS host extent's
	Squeak-style override answers false)."
	emptySep := (aString isKindOf: ByteArray)
		ifTrue: [ByteArray @env0:new]
		ifFalse: [''].
	"A callable repl is marked by template=nil; anything else is parsed once.

	CALLABILITY IS PYTHON'S callable(), not a class test.  This asked whether
	repl was a BoundMethod, a block or a method, so a callable instance,
	functools.partial, operator.itemgetter or a class fell through to
	parse_template and had its repr spliced into the result as text (#1253).

	The parser is fetched only when there is a template to parse, and IMPORTED
	rather than looked up by name -- see SrePattern class >> ___reParser___."
	(builtins instance callable: repl)
		ifTrue: [template := nil]
		ifFalse: [template := SrePattern ___reParser___ parse_template: repl _: self].
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
					ifFalse: [repl @env1:___pyCallValue___: { m } kw: nil]
			]
			ifFalse: [
				expanded := self ___expandTemplate___: template withMatch: m
			].
		parts @env0:add: expanded.
		numSubs := numSubs @env0:+ 1.
		mustAdvance := mEnd @env0:= mStart.
		pos := mEnd
	] @env0:repeat

]

{ #category : 'Grail-Copy Protocol' }
SrePattern >> __copy__ [
	"CPython's Pattern.__copy__: a compiled pattern is IMMUTABLE and shared,
	so copying answers the pattern itself.  test_re's test_copying asserts
	the identity, and without the dunder copy.copy fell to the reduction
	protocol and rebuilt a second, equal-but-distinct pattern."

	^ self

]

{ #category : 'Grail-Copy Protocol' }
SrePattern >> __deepcopy__: memo [
	"CPython's Pattern.__deepcopy__ -- same reasoning as __copy__."

	^ self

]

{ #category : 'Grail-Comparison' }
SrePattern >> __eq__: other [
	"Two compiled patterns are equal iff same source, flags, and
	str/bytes-ness -- mirroring C pattern_richcompare, which compares
	flags/isbytes/code (the same source and flags produce the same code
	outside re.LOCALE; groups/groupindex are derived from the source).  A
	non-pattern operand returns the NotImplemented sentinel so == defers to
	the reflected comparison / identity (test_pattern_compare / _bytes)."
	(other @env0:isKindOf: SrePattern) ifFalse: [^ NotImplemented].
	(self @env0:== other) ifTrue: [^ true].
	((self flags) @env0:= (other flags)) ifFalse: [^ false].
	((self ___isBytesPattern___) @env0:= (other ___isBytesPattern___)) ifFalse: [^ false].
	^ (self pattern) @env0:= (other pattern)

]

{ #category : 'Grail-Comparison' }
SrePattern >> __hash__ [
	"Hash from the value fields (source, flags, isbytes) so patterns that
	compare equal hash equal, mirroring C pattern_hash (test_pattern_compare)."
	| h |
	h := (self pattern) __hash__.
	h := h @env0:bitXor: (self flags).
	h := h @env0:bitXor: ((self ___isBytesPattern___) @env0:ifTrue: [1] ifFalse: [0]).
	^ h

]

{ #category : 'Grail-Comparison' }
SrePattern >> __ne__: other [
	"Inverse of __eq__, preserving the NotImplemented sentinel for a
	non-pattern operand so != can defer to the reflected comparison."
	| eqr |
	eqr := self __eq__: other.
	(eqr @env0:== NotImplemented) ifTrue: [^ eqr].
	^ eqr @env0:not

]

{ #category : 'Grail-Printing' }
SrePattern >> __repr__ [
	"repr(pattern) -> re.compile('source', re.FLAG|...) mirroring
	CPython's pattern_repr: the source repr truncated to 200 chars,
	flag names in sre.c's table order, and the implicit re.UNICODE
	dropped for str patterns (test_pattern_compile repr checks)."

	| src flagsVal srcRepr names stream remaining |
	src := self pattern.
	flagsVal := self flags.
	"For a str (non-bytes) pattern, drop the implicit re.UNICODE, but only when
	UNICODE is the sole charset flag -- matching CPython pattern_repr's
	(flags & (LOCALE|UNICODE|ASCII)) == UNICODE test."
	(src isKindOf: ByteArray) ifFalse: [
		((flagsVal @env0:bitAnd: 292) @env0:= 32) ifTrue: [   "292 = LOCALE|UNICODE|ASCII (4|32|256)"
			flagsVal := flagsVal @env0:- 32]
	].
	names := OrderedCollection @env0:new.
	remaining := flagsVal.
	"re.TEMPLATE (value 1) is intentionally absent: CPython 3.14 removed it from
	the repr table, so bit 0 surfaces via the 0x remainder below, not as a name."
	{ { 're.IGNORECASE'. 2 }. { 're.LOCALE'. 4 }.
	  { 're.MULTILINE'. 8 }. { 're.DOTALL'. 16 }. { 're.UNICODE'. 32 }.
	  { 're.VERBOSE'. 64 }. { 're.DEBUG'. 128 }. { 're.ASCII'. 256 } }
		@env0:do: [:pair |
			((remaining @env0:bitAnd: (pair @env0:at: 2)) @env0:= 0) ifFalse: [
				names @env0:add: (pair @env0:at: 1).
				remaining := remaining @env0:- (pair @env0:at: 2)]].
	"Flags with no name are appended as one 0x hex literal after the named
	flags, mirroring CPython (test_unknown_flags)."
	(remaining @env0:= 0) ifFalse: [
		names @env0:add: '0x' @env0:, ((remaining @env0:printStringRadix: 16 showRadix: false) @env0:asLowercase)].
	srcRepr := src __repr__.
	srcRepr @env0:size @env0:> 200 ifTrue: [
		srcRepr := srcRepr @env0:copyFrom: 1 to: 200].
	stream := AppendStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: 're.compile('.
	stream @env0:nextPutAll: srcRepr.
	names @env0:notEmpty ifTrue: [
		stream @env0:nextPutAll: ', '.
		names @env0:do: [:n | stream @env0:nextPutAll: n]
			separatedBy: [stream @env0:nextPut: $|]].
	stream @env0:nextPut: $).
	^ stream @env0:contents

]

{ #category : 'Grail-Methods' }
SrePattern >> _findall: positional kw: keywords [
	"Varargs dispatcher for findall()."
	| r s p e |
	r := self ___resolveSPE___: positional kw: keywords for: 'findall'.
	s := r @env0:at: 1. p := r @env0:at: 2. e := r @env0:at: 3.
	e ~~ nil ifTrue: [^ self findall: s _: (p == nil ifTrue: [0] ifFalse: [p]) _: e].
	p ~~ nil ifTrue: [^ self findall: s _: p].
	^ self findall: s

]

{ #category : 'Grail-Methods' }
SrePattern >> _finditer: positional kw: keywords [
	"Varargs dispatcher for finditer()."
	| r s p e |
	r := self ___resolveSPE___: positional kw: keywords for: 'finditer'.
	s := r @env0:at: 1. p := r @env0:at: 2. e := r @env0:at: 3.
	e ~~ nil ifTrue: [^ self finditer: s _: (p == nil ifTrue: [0] ifFalse: [p]) _: e].
	p ~~ nil ifTrue: [^ self finditer: s _: p].
	^ self finditer: s

]

{ #category : 'Grail-Methods' }
SrePattern >> _fullmatch: positional kw: keywords [
	"Varargs dispatcher for fullmatch()."
	| r s p e |
	r := self ___resolveSPE___: positional kw: keywords for: 'fullmatch'.
	s := r @env0:at: 1. p := r @env0:at: 2. e := r @env0:at: 3.
	e ~~ nil ifTrue: [^ self fullmatch: s _: (p == nil ifTrue: [0] ifFalse: [p]) _: e].
	p ~~ nil ifTrue: [^ self fullmatch: s _: p].
	^ self fullmatch: s

]

{ #category : 'Grail-Methods' }
SrePattern >> _match: positional kw: keywords [
	"Varargs dispatcher for match() — first-class calls and keyword args."
	| r s p e |
	r := self ___resolveSPE___: positional kw: keywords for: 'match'.
	s := r @env0:at: 1. p := r @env0:at: 2. e := r @env0:at: 3.
	e ~~ nil ifTrue: [^ self match: s _: (p == nil ifTrue: [0] ifFalse: [p]) _: e].
	p ~~ nil ifTrue: [^ self match: s _: p].
	^ self match: s

]

{ #category : 'Grail-Methods' }
SrePattern >> _scanner: positional kw: keywords [
	"Varargs dispatcher for scanner() — positional and keyword args
	(string, pos, endpos)."
	| r s p e |
	r := self ___resolveSPE___: positional kw: keywords for: 'scanner'.
	s := r @env0:at: 1. p := r @env0:at: 2. e := r @env0:at: 3.
	e ~~ nil ifTrue: [^ self scanner: s _: (p == nil ifTrue: [0] ifFalse: [p]) _: e].
	p ~~ nil ifTrue: [^ self scanner: s _: p].
	^ self scanner: s

]

{ #category : 'Grail-Methods' }
SrePattern >> _search: positional kw: keywords [
	"Varargs dispatcher for search()."
	| r s p e |
	r := self ___resolveSPE___: positional kw: keywords for: 'search'.
	s := r @env0:at: 1. p := r @env0:at: 2. e := r @env0:at: 3.
	e ~~ nil ifTrue: [^ self search: s _: (p == nil ifTrue: [0] ifFalse: [p]) _: e].
	p ~~ nil ifTrue: [^ self search: s _: p].
	^ self search: s

]

{ #category : 'Grail-Methods' }
SrePattern >> _split: positional kw: keywords [
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

]

{ #category : 'Grail-Methods' }
SrePattern >> _sub: positional kw: keywords [
	"Varargs dispatcher for sub()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 2) ifTrue: [^ self sub: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs == 3) ifTrue: [^ self sub: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'sub() takes 2 or 3 arguments'

]

{ #category : 'Grail-Methods' }
SrePattern >> _subn: positional kw: keywords [
	"Varargs dispatcher for subn()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 2) ifTrue: [^ self subn: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs == 3) ifTrue: [^ self subn: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'subn() takes 2 or 3 arguments'

]

{ #category : 'Grail-Methods' }
SrePattern >> findall: aString [
	"findall(string) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'findall' selfPtr: (self @env0:cPtrAddress)
		with: aString

]

{ #category : 'Grail-Methods' }
SrePattern >> findall: aString _: pos [
	"findall(string, pos) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'findall' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos

]

{ #category : 'Grail-Methods' }
SrePattern >> findall: aString _: pos _: endpos [
	"findall(string, pos, endpos) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'findall' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos with: endpos

]

{ #category : 'Grail-Methods' }
SrePattern >> finditer: aString [
	"finditer(string) -> iterator of SreMatch.  Returns a list (list is
	iterable in Python; werkzeug.routing uses ``for m in p.finditer(s)'').
	Walks the string with scanner semantics (see
	___searchFrom___:in:to:mustAdvance:)."
	^ self finditer: aString _: 0 _: aString @env0:size

]

{ #category : 'Grail-Methods' }
SrePattern >> finditer: aString _: pos [
	"finditer(string, pos) -> iterator of SreMatch."
	^ self finditer: aString _: pos _: aString @env0:size

]

{ #category : 'Grail-Methods' }
SrePattern >> finditer: aString _: pos _: endpos [
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

]

{ #category : 'Grail-Properties' }
SrePattern >> flags [
	"The regex matching flags."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'flags' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Methods' }
SrePattern >> fullmatch: aString [
	"fullmatch(string) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'fullmatch' selfPtr: (self @env0:cPtrAddress)
		with: aString.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]

]

{ #category : 'Grail-Methods' }
SrePattern >> fullmatch: aString _: pos [
	"fullmatch(string, pos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'fullmatch' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]

]

{ #category : 'Grail-Methods' }
SrePattern >> fullmatch: aString _: pos _: endpos [
	"fullmatch(string, pos, endpos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'fullmatch' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos with: endpos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]

]

{ #category : 'Grail-Properties' }
SrePattern >> groupindex [
	"A dictionary mapping group names to group numbers."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'groupindex' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Properties' }
SrePattern >> groups [
	"The number of capturing groups in the pattern."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'groups' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Methods' }
SrePattern >> match: aString [
	"match(string) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'match' selfPtr: (self @env0:cPtrAddress)
		with: aString.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]

]

{ #category : 'Grail-Methods' }
SrePattern >> match: aString _: pos [
	"match(string, pos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'match' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]

]

{ #category : 'Grail-Methods' }
SrePattern >> match: aString _: pos _: endpos [
	"match(string, pos, endpos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'match' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos with: endpos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]

]

{ #category : 'Grail-Properties' }
SrePattern >> pattern [
	"The pattern string from which the RE object was compiled."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Pattern' method: 'pattern' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Methods' }
SrePattern >> scanner: aString [
	"scanner(string) -> SreScanner positioned at 0."
	^ (SreScanner @env0:new) ___init___: self string: aString cursor: 0 endpos: aString @env0:size

]

{ #category : 'Grail-Methods' }
SrePattern >> scanner: aString _: pos [
	"scanner(string, pos) -> SreScanner."
	^ (SreScanner @env0:new) ___init___: self string: aString cursor: pos endpos: aString @env0:size

]

{ #category : 'Grail-Methods' }
SrePattern >> scanner: aString _: pos _: endpos [
	"scanner(string, pos, endpos) -> SreScanner."
	^ (SreScanner @env0:new) ___init___: self string: aString cursor: pos endpos: endpos

]

{ #category : 'Grail-Methods' }
SrePattern >> search: aString [
	"search(string) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'search' selfPtr: (self @env0:cPtrAddress)
		with: aString.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]

]

{ #category : 'Grail-Methods' }
SrePattern >> search: aString _: pos [
	"search(string, pos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'search' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]

]

{ #category : 'Grail-Methods' }
SrePattern >> search: aString _: pos _: endpos [
	"search(string, pos, endpos) -> SreMatch or None"
	| result |
	result := (CPythonShim @env0:current)
		@env0:callTypedReturnCPtr: '_sre' type: 'Pattern' method: 'search' selfPtr: (self @env0:cPtrAddress)
		with: aString with: pos with: endpos.
	^ (result == 0) ifTrue: [None] ifFalse: [SreMatch @env0:newFromCPtr: result]

]

{ #category : 'Grail-Methods' }
SrePattern >> split: aString [
	"split(string) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'split' selfPtr: (self @env0:cPtrAddress)
		with: aString

]

{ #category : 'Grail-Methods' }
SrePattern >> split: aString _: maxsplit [
	"split(string, maxsplit) -> list"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Pattern' method: 'split' selfPtr: (self @env0:cPtrAddress)
		with: aString with: maxsplit

]

{ #category : 'Grail-Methods' }
SrePattern >> sub: repl _: aString [
	"sub(repl, string) -> str"
	^ self sub: repl _: aString _: 0

]

{ #category : 'Grail-Methods' }
SrePattern >> sub: repl _: aString _: count [
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

]

{ #category : 'Grail-Methods' }
SrePattern >> subn: repl _: aString [
	"subn(repl, string) -> (str, int)"
	^ self subn: repl _: aString _: 0

]

{ #category : 'Grail-Methods' }
SrePattern >> subn: repl _: aString _: count [
	"subn(repl, string, count) -> (str, int).  See sub:_:_: for
	why non-literal replacements expand on the Grail side."

	(self ___isLiteralRepl___: repl) ifTrue: [
		^ (CPythonShim @env0:current)
			@env0:callTyped: '_sre' type: 'Pattern' method: 'subn' selfPtr: (self @env0:cPtrAddress)
			with: repl with: aString with: count
	].
	^ (self ___subWithExpansion___: repl in: aString count: count subn: true)

]
