Extension { #name : 'SyntaxError' }

{ #category : 'Grail-Python Attribute Access' }
SyntaxError >> ___args___: anArray [
	"Normalise args as BaseException does, then ALSO unpack CPython's
	SyntaxError location fields from them.  ``anArray'' is a Smalltalk Array of
	the positional constructor arguments (hence @env0:size / @env0:at:); its
	second element, when present, is the Python location tuple."

	| loc none put |
	super ___args___: anArray.
	anArray @env0:isNil ifTrue: [^ self].
	none := ExecBlock @env0:___pyNone___.

	"Write DYNAMIC instVars, not the declared ones.  ___pyAttrLoad___ resolves a
	Python attribute through the dynamic-instVar probe; the class's DECLARED
	instVars are invisible to it, which is why they sat unread for so long.
	Storing the None SINGLETON (never nil) for an absent field matters too: a
	nil dynamic instVar reads back as ABSENT -> AttributeError, whereas CPython
	reports None for an unset SyntaxError field.  A later Python-level store
	(``e.lineno = 100'') overwrites this same slot."
	put := [:nm :v | self @env0:dynamicInstVarAt: nm put: v].

	put value: #'msg' value: (((anArray @env0:size) @env0:>= 1)
		ifTrue: [ anArray @env0:at: 1 ] ifFalse: [ none ]).

	loc := ((anArray @env0:size) @env0:>= 2)
		ifTrue: [ anArray @env0:at: 2 ] ifFalse: [ nil ].
	put value: #'filename'   value: (self ___locElem___: loc at: 1).
	put value: #'lineno'     value: (self ___locElem___: loc at: 2).
	put value: #'offset'     value: (self ___locElem___: loc at: 3).
	put value: #'text'       value: (self ___locElem___: loc at: 4).
	put value: #'end_lineno' value: (self ___locElem___: loc at: 5).
	put value: #'end_offset' value: (self ___locElem___: loc at: 6)

]

{ #category : 'Grail-Python Attribute Access' }
SyntaxError >> ___locElem___: loc at: anIndex [
	"Element anIndex (1-based) of the location tuple, or nil when absent.

	``loc'' is a Grail ``tuple'', so index it through the PYTHON protocol
	(__len__ / __getitem__, 0-based) -- Smalltalk's size/at: silently miss.
	Guarded throughout: the location may be nil, None, a short tuple, or not a
	sequence at all, and building an exception must never itself raise.  nil is
	the right answer for absent: a nil instVar reads back as None, which is
	what CPython reports for an unset SyntaxError field."

	| none |
	none := ExecBlock @env0:___pyNone___.
	loc @env0:isNil ifTrue: [^ none].
	(loc == none) ifTrue: [^ none].
	"Comparison and arithmetic go through @env0: as well: in env 1 the numeric
	selectors are Python's (__ge__ / __sub__), so a bare >= or - on a
	SmallInteger is a DNU."
	^ [ ((loc __len__) @env0:>= anIndex)
		ifTrue: [ loc __getitem__: (anIndex @env0:- 1) ]
		ifFalse: [ none ] ] @env0:on: Error do: [:ex | none]

]
