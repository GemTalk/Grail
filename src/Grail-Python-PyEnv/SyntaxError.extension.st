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

	"The location is read from EXACTLY two arguments, as SyntaxError_init reads
	it, and checked there (___checkedLocation___:)."
	loc := ((anArray @env0:size) @env0:= 2)
		ifTrue: [ self @env0:___checkedLocation___: (anArray @env0:at: 2) ] ifFalse: [ nil ].
	put value: #'filename'   value: (self ___locElem___: loc at: 1).
	put value: #'lineno'     value: (self ___locElem___: loc at: 2).
	put value: #'offset'     value: (self ___locElem___: loc at: 3).
	put value: #'text'       value: (self ___locElem___: loc at: 4).
	put value: #'end_lineno' value: (self ___locElem___: loc at: 5).
	put value: #'end_offset' value: (self ___locElem___: loc at: 6).
	"A member CPython's SyntaxError always has, None unless assigned."
	put value: #'print_file_and_line' value: none

]

{ #category : 'Grail-Python Protocol' }
SyntaxError >> ___basenameOf___: aFilename [
	"CPython's my_basename (Objects/exceptions.c:2805-2826), which __str__
	renders the filename through: what follows the last separator, or the
	whole name when there is none."

	| start |
	start := 1.
	1 to: aFilename @env0:size do: [:index |
		(aFilename @env0:at: index) == $/ ifTrue: [start := index @env0:+ 1]].
	^ aFilename @env0:copyFrom: start to: aFilename @env0:size

]

{ #category : 'Grail-Python Protocol' }
SyntaxError >> ___field___: aName [
	"The attribute ___args___: stores as a dynamic instVar -- the slot a
	Python-level store (``e.lineno = 1'') writes too -- or nil."

	^ self @env0:dynamicInstVarAt: aName

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

{ #category : 'Grail-Python Protocol' }
SyntaxError >> __str__ [
	"CPython's SyntaxError_str (Objects/exceptions.c:2830-2873): the message,
	then the file's BASENAME and the line in parentheses -- ``invalid syntax
	(<string>, line 1)'' -- or whichever of the two is known, and str(msg)
	alone when neither is.  A filename counts only when it is a str, a line
	only when it is an int.

	SyntaxError used to inherit BaseException's, the str of the whole args
	tuple, so ``str(e)'' read ``('invalid syntax', ('<string>', 1, 4, '1 +',
	1, 5))'' -- which test_grammar's test_max_level, matching the start of it,
	does not accept."

	| message file line |
	message := self ___field___: #'msg'.
	message == nil ifTrue: [message := ExecBlock @env0:___pyNone___].
	message := str __new__: message.
	file := self ___field___: #'filename'.
	(file @env0:isKindOf: CharacterCollection)
		ifTrue: [file := self ___basenameOf___: file]
		ifFalse: [file := nil].
	line := self ___field___: #'lineno'.
	(line @env0:isKindOf: Integer) ifFalse: [line := nil].
	(file == nil and: [line == nil]) ifTrue: [^ message].
	file == nil ifTrue: [^ message @env0:, ' (line ' @env0:, line @env0:printString @env0:, ')'].
	line == nil ifTrue: [^ message @env0:, ' (' @env0:, file @env0:, ')'].
	^ message @env0:, ' (' @env0:, file @env0:, ', line ' @env0:, line @env0:printString @env0:, ')'

]
