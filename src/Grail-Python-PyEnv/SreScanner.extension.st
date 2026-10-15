Extension { #name : 'SreScanner' }

{ #category : 'Grail-Instance Creation' }
SreScanner class >> __new__ [
	"CPython's _sre.SRE_Scanner type disallows direct instantiation
	(bpo-43916) -- scanner objects only ever come from
	pattern.scanner(...).  Grail-side instances are created via
	___init___:string:cursor:endpos: (called through Pattern>>scanner:),
	not the Python-facing constructor, so this is safe to reject
	unconditionally (test_re.py's test_disallow_instantiation).

	NOTE: the zero-arg Python call ``SreScanner()`` dispatches through
	Object class>>value:value: to bare __new__, NOT _new:kw: (that
	varargs entry is only consulted when kwargs is non-empty) --
	overriding _new:kw: alone left the plain 0-arg call unblocked."

	TypeError ___signal___: 'cannot create ''_sre.SRE_Scanner'' instances'

]

{ #category : 'Grail-Scanner' }
SreScanner >> ___init___: aPattern string: aString cursor: c endpos: e [
	"Initialize the scanner state."
	pattern := aPattern.
	string := aString.
	cursor := c.
	endpos := e.
	mustAdvance := false.
	^ self

]

{ #category : 'Grail-Scanner' }
SreScanner >> match [
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

]

{ #category : 'Grail-Scanner' }
SreScanner >> pattern [
	"The SrePattern this scanner is scanning with (CPython SRE_Scanner.pattern)."
	^ pattern

]

{ #category : 'Grail-Scanner' }
SreScanner >> search [
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

]
