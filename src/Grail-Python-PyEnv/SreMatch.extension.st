Extension { #name : 'SreMatch' }

{ #category : 'Grail-Instantiation' }
SreMatch class >> ___subclass___: aSymbol instVarNames: ivarNames classInstVarNames: classIvarNames [
	"``class B(re.Match)'' -- CPython's C type has no Py_TPFLAGS_BASETYPE."
	^ TypeError ___signal___: 'type ''re.Match'' is not an acceptable base type'

]

{ #category : 'Grail-Python Attribute Hook' }
SreMatch class >> __module__ [
	"type(match).__module__ (test_re.py's test_match_repr formats its
	regex against this)."
	^ 're'

]

{ #category : 'Grail-Python Attribute Hook' }
SreMatch class >> __name__ [
	"type(x).__name__ -- 'Match', as __qualname__ below.  typing names its alias
	after the origin's __name__ (``Pattern = _alias(stdlib_re.Pattern, 1)''), so
	the Smalltalk name leaked into ``repr(typing.Match)'' as typing.SreMatch."
	^ 'Match'

]

{ #category : 'Grail-Instance Creation' }
SreMatch class >> __new__ [
	"CPython's re.Match type disallows direct instantiation (bpo-43916)
	-- Match objects only ever come from a successful match/search/
	fullmatch call.  Grail-side instances are all created via
	newFromCPtr:, not the Python-facing constructor, so this is safe to
	reject unconditionally (test_re.py's test_disallow_instantiation).

	NOTE: the zero-arg Python call ``re.Match()`` dispatches through
	Object class>>value:value: to bare __new__, NOT _new:kw: (that
	varargs entry is only consulted when kwargs is non-empty) --
	overriding _new:kw: alone left the plain 0-arg call unblocked."

	TypeError ___signal___: 'cannot create ''re.Match'' instances'

]

{ #category : 'Grail-Python Attribute Hook' }
SreMatch class >> __qualname__ [
	"type(match).__qualname__ -- CPython spells it 'Match', not the
	Smalltalk class name 'SreMatch'."
	^ 'Match'

]

{ #category : 'Grail-Methods - Private' }
SreMatch >> ___groupKey___: arg [
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
			(arg ___hasIndexDunder___)
				ifTrue: [arg __index__]
				ifFalse: [^ arg]].
	(idx @env0:isKindOf: SmallInteger) ifFalse: [
		IndexError ___signal___: 'no such group'].
	^ idx

]

{ #category : 'Grail-Copy Protocol' }
SreMatch >> __copy__ [
	"CPython's Match.__copy__: a match is an immutable snapshot, so copying
	answers it unchanged.  Without the dunder copy.copy fell to the reduction
	protocol, which rebuilds the match -- and a Grail match does not survive
	being reconstructed (``not valid in this session'')."

	^ self

]

{ #category : 'Grail-Copy Protocol' }
SreMatch >> __deepcopy__: memo [
	"CPython's Match.__deepcopy__ -- same reasoning as __copy__."

	^ self

]

{ #category : 'Grail-Methods' }
SreMatch >> __getitem__: groupArg [
	"``m[g]'' — subscripting a match is ``m.group(g)'' in CPython.
	django.urls.resolvers._route_to_regex reads named groups as
	``match['parameter']''."

	^ self group: groupArg

]

{ #category : 'Grail-Printing' }
SreMatch >> __repr__ [
	"repr(match) -> <re.Match object; span=(a, b), match='...'> mirroring
	CPython's match_repr (test_re.py's test_match_repr).  Long matches
	are elided to the first/last 25 chars, same as CPython."

	| whole sp groupRepr stream |
	whole := self group.
	sp := self span.
	groupRepr := whole __repr__.
	groupRepr @env0:size @env0:> 53 ifTrue: [
		groupRepr := (whole @env0:copyFrom: 1 to: 25) __repr__
			@env0:, '...'
			@env0:, (whole @env0:copyFrom: whole @env0:size @env0:- 24 to: whole @env0:size) __repr__].
	stream := AppendStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: '<re.Match object; span=('.
	stream @env0:print: (sp @env0:at: 1).
	stream @env0:nextPutAll: ', '.
	stream @env0:print: (sp @env0:at: 2).
	stream @env0:nextPutAll: '), match='.
	stream @env0:nextPutAll: groupRepr.
	stream @env0:nextPutAll: '>'.
	^ stream @env0:contents

]

{ #category : 'Grail-Methods' }
SreMatch >> _end: positional kw: keywords [
	"Varargs dispatcher for end()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 0) ifTrue: [^ self end].
	(nargs == 1) ifTrue: [^ self end: (positional @env0:at: 1)].
	TypeError ___signal___: 'end() takes 0 or 1 arguments'

]

{ #category : 'Grail-Methods' }
SreMatch >> _expand: positional kw: keywords [
	"Varargs dispatcher for expand()."
	^ self expand: (positional @env0:at: 1)

]

{ #category : 'Grail-Methods' }
SreMatch >> _group: positional kw: keywords [
	"Varargs dispatcher for group()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 0) ifTrue: [^ self group].
	(nargs == 1) ifTrue: [^ self group: (positional @env0:at: 1)].
	(nargs == 2) ifTrue: [^ self group: (positional @env0:at: 1) _: (positional @env0:at: 2)].
	(nargs == 3) ifTrue: [^ self group: (positional @env0:at: 1) _: (positional @env0:at: 2) _: (positional @env0:at: 3)].
	TypeError ___signal___: 'group() takes 0 to 3 arguments'

]

{ #category : 'Grail-Methods' }
SreMatch >> _groupdict: positional kw: keywords [
	"Varargs dispatcher for groupdict()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 0) ifTrue: [^ self groupdict].
	(nargs == 1) ifTrue: [^ self groupdict: (positional @env0:at: 1)].
	TypeError ___signal___: 'groupdict() takes 0 or 1 arguments'

]

{ #category : 'Grail-Methods' }
SreMatch >> _groups: positional kw: keywords [
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

]

{ #category : 'Grail-Methods' }
SreMatch >> _span: positional kw: keywords [
	"Varargs dispatcher for span()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 0) ifTrue: [^ self span].
	(nargs == 1) ifTrue: [^ self span: (positional @env0:at: 1)].
	TypeError ___signal___: 'span() takes 0 or 1 arguments'

]

{ #category : 'Grail-Methods' }
SreMatch >> _start: positional kw: keywords [
	"Varargs dispatcher for start()."
	| nargs |
	nargs := positional @env0:size.
	(nargs == 0) ifTrue: [^ self start].
	(nargs == 1) ifTrue: [^ self start: (positional @env0:at: 1)].
	TypeError ___signal___: 'start() takes 0 or 1 arguments'

]

{ #category : 'Grail-Methods' }
SreMatch >> end [
	"end() -> int"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'end' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Methods' }
SreMatch >> end: groupArg [
	"end(group) -> int"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'end' selfPtr: (self @env0:cPtrAddress)
		with: groupArg

]

{ #category : 'Grail-Properties' }
SreMatch >> endpos [
	"The value of endpos passed to search() or match()."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'endpos' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Methods' }
SreMatch >> expand: template [
	"expand(template) -> str.

	Expanded on the Grail side (re._parser.parse_template plus the same
	___expandTemplate___ that sub uses) rather than via the C
	match_expand: that path fetches AND CALLS re._compile_template,
	whose Python body needs `_sre.template` -- a heap TemplateObject
	the shim's OOP-marshalling can't carry (see SrePattern>>sub:_:_:).
	Worse, the AttributeError it raised inside the GciPerform callback
	could not unwind across the user-action frame, degenerating into an
	UncontinuableError storm."

	| pat parsed |
	pat := self re.
	parsed := SrePattern ___reParser___ parse_template: template _: pat.
	^ pat ___expandTemplate___: parsed withMatch: self

]

{ #category : 'Grail-Methods' }
SreMatch >> group [
	"group() -> str (whole match, equivalent to group(0))"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Methods' }
SreMatch >> group: groupArg [
	"group(groupN) -> str"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: (self @env0:cPtrAddress)
		with: (self ___groupKey___: groupArg)

]

{ #category : 'Grail-Methods' }
SreMatch >> group: g1 _: g2 [
	"group(g1, g2) -> tuple"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: (self @env0:cPtrAddress)
		with: (self ___groupKey___: g1) with: (self ___groupKey___: g2)

]

{ #category : 'Grail-Methods' }
SreMatch >> group: g1 _: g2 _: g3 [
	"group(g1, g2, g3) -> tuple"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'group' selfPtr: (self @env0:cPtrAddress)
		with: (self ___groupKey___: g1) with: (self ___groupKey___: g2) with: (self ___groupKey___: g3)

]

{ #category : 'Grail-Methods' }
SreMatch >> groupdict [
	"groupdict() -> dict"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'groupdict' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Methods' }
SreMatch >> groupdict: defaultValue [
	"groupdict(default) -> dict"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'groupdict' selfPtr: (self @env0:cPtrAddress)
		with: defaultValue

]

{ #category : 'Grail-Methods' }
SreMatch >> groups [
	"groups() -> tuple"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'groups' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Methods' }
SreMatch >> groups: defaultValue [
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

]

{ #category : 'Grail-Properties' }
SreMatch >> lastgroup [
	"The name of the last matched capturing group."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'lastgroup' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Properties' }
SreMatch >> lastindex [
	"The integer index of the last matched capturing group."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'lastindex' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Properties' }
SreMatch >> pos [
	"The value of pos passed to search() or match()."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'pos' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Properties' }
SreMatch >> re [
	"The regular expression object."
	"Returns the C pointer for the pattern object, wrapped as SrePattern."
	| patCPtr |
	patCPtr := (CPythonShim @env0:current) @env0:callTypedReturnCPtr: '_sre' type: 'Match' method: 're' selfPtr: (self @env0:cPtrAddress).
	^ SrePattern @env0:newFromCPtr: patCPtr

]

{ #category : 'Grail-Properties' }
SreMatch >> regs [
	"A tuple of (start, end) for each group."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'regs' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Methods' }
SreMatch >> span [
	"span() -> (int, int)"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'span' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Methods' }
SreMatch >> span: groupArg [
	"span(group) -> (int, int)"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'span' selfPtr: (self @env0:cPtrAddress)
		with: groupArg

]

{ #category : 'Grail-Methods' }
SreMatch >> start [
	"start() -> int"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'start' selfPtr: (self @env0:cPtrAddress)

]

{ #category : 'Grail-Methods' }
SreMatch >> start: groupArg [
	"start(group) -> int"
	^ (CPythonShim @env0:current)
		@env0:callTyped: '_sre' type: 'Match' method: 'start' selfPtr: (self @env0:cPtrAddress)
		with: groupArg

]

{ #category : 'Grail-Properties' }
SreMatch >> string [
	"The string passed to match() or search()."
	^ (CPythonShim @env0:current) @env0:callTyped: '_sre' type: 'Match' method: 'string' selfPtr: (self @env0:cPtrAddress)

]
