Extension { #name : 'AbstractDictionary' }

{ #category : 'Grail-Call Protocol' }
AbstractDictionary >> ___asCallKeywords___ [
	"This dictionary as the keywords a call hands its callee, once every ``**''
	operand is merged in (CallAst >> printKeywordsDictOn:).

	CPython refuses a keyword that is not a str when it unpacks the call's
	keywords (Objects/call.c:1095-1100, _PyStack_UnpackDict), which is AFTER
	the merge: ``f(**{1: 2})'' is ``keywords must be strings'', while
	``f(**{1: 2}, **{1: 3})'' is the duplicate's TypeError.  Grail handed the
	int key on.  And CPython binds from keys it has already unpacked, so a
	str-subclass key whose __eq__ deletes from the caller's dict cannot disturb
	the binding (bpo-2016, test_extcall's ``Name.__eq__''); Grail's callee read
	the caller's dict while that __eq__ deleted from it.  Only a key of a str
	SUBCLASS runs user code when binding compares it, so only then is the
	dictionary copied: one of exact strs passes as it is, as it always has."

	self @env0:keysDo: [:key |
		key @env0:___isPyStr___ ifFalse: [^ TypeError ___signal___: 'keywords must be strings']].
	^ (self @env0:keys @env0:allSatisfy: [:key | key @env0:___isExactPyStr___])
		ifTrue: [self]
		ifFalse: [self @env0:copy]

]
