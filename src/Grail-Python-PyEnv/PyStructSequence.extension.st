Extension { #name : 'PyStructSequence' }

{ #category : 'Instance Creation' }
PyStructSequence class >> ___construct___: sequence dict: aDictOrNil [
	"CPython's structseq_new and its words (Objects/structseq.c:163-266): any
	iterable, of a length the type takes, and a dict -- nil when none was
	given -- filling the named-only fields the sequence left unset."

	| items |
	items := [sequence @env0:___pyStarToArray___]
		@env0:on: TypeError do: [:ex | ex @env0:return: nil].
	items @env0:isNil ifTrue: [^ TypeError ___signal___: self ___notASequenceMessage].
	self ___refuseLength___: items @env0:size.
	aDictOrNil @env0:isNil ifFalse: [
		self ___refuseUnexpectedFieldsIn___: aDictOrNil from: items @env0:size].
	^ self @env0:___sequence___: items named: aDictOrNil

]

{ #category : 'Grail-Error Messages' }
PyStructSequence class >> ___dictSecondArgMessage [
	^ self @env0:___typeName___ @env0:, '() takes a dict as second arg, if any'

]

{ #category : 'Grail-Error Messages' }
PyStructSequence class >> ___lengthMessageFor: aQualifier count: aFieldCount given: aLength [
	^ self @env0:___typeName___ @env0:, '() takes ' @env0:, aQualifier
		@env0:, aFieldCount @env0:printString @env0:, '-sequence ('
		@env0:, aLength @env0:printString @env0:, '-sequence given)'

]

{ #category : 'Grail-Error Messages' }
PyStructSequence class >> ___noNewAttributeMessageFor: aName [
	^ '''' @env0:, self @env0:___typeName___ @env0:, ''' object has no attribute '''
		@env0:, aName @env0:asString @env0:, ''' and no __dict__ for setting new attributes'

]

{ #category : 'Grail-Error Messages' }
PyStructSequence class >> ___notASequenceMessage [
	^ 'constructor requires a sequence'

]

{ #category : 'Grail-Error Messages' }
PyStructSequence class >> ___readonlyMessage [
	^ 'readonly attribute'

]

{ #category : 'Instance Creation' }
PyStructSequence class >> ___refuseLength___: aLength [
	"CPython's refusal of a sequence too short or too long for the type
	(Objects/structseq.c:195-221): between n_sequence_fields and n_fields
	items when the two differ, exactly n_sequence_fields when they do not."

	| low high |
	low := self @env0:___sequenceFieldCount___.
	high := self @env0:___fieldCount___.
	low @env0:= high ifTrue: [
		aLength @env0:= low ifTrue: [^ self].
		^ TypeError ___signal___: (self ___lengthMessageFor: 'a ' count: low given: aLength)].
	aLength @env0:< low ifTrue: [
		^ TypeError ___signal___: (self ___lengthMessageFor: 'an at least ' count: low given: aLength)].
	aLength @env0:> high ifTrue: [
		^ TypeError ___signal___: (self ___lengthMessageFor: 'an at most ' count: high given: aLength)]

]

{ #category : 'Instance Creation' }
PyStructSequence class >> ___refuseUnexpectedFieldsIn___: aDict from: aLength [
	"A dict key that is not a named-only field the sequence left unset is
	refused (Objects/structseq.c:242-262): the dict fills only the fields past
	the items given."

	| unset |
	unset := self @env0:___namedOnlyFields___ @env0:copyFrom:
		(aLength @env0:- self @env0:___sequenceFieldCount___ @env0:+ 1 @env0:max: 1)
		to: self @env0:___namedOnlyFields___ @env0:size.
	aDict @env0:keysDo: [:key |
		((key @env0:isKindOf: CharacterCollection)
			and: [unset @env0:includes: key @env0:asSymbol]) ifFalse: [
				^ TypeError ___signal___: (self ___unexpectedFieldsMessage)]]

]

{ #category : 'Grail-Error Messages' }
PyStructSequence class >> ___replaceTakesNoPositionalMessage [
	^ '__replace__() takes no positional arguments'

]

{ #category : 'Grail-Error Messages' }
PyStructSequence class >> ___replaceUnexpectedMessageFor: someNames [
	^ 'Got unexpected field name(s): ' @env0:, (list @env0:withAll: someNames) __repr__ @env0:asString

]

{ #category : 'Grail-Error Messages' }
PyStructSequence class >> ___replaceUnnamedMessage [
	^ '__replace__() is not supported for ' @env0:, self @env0:___typeName___
		@env0:, ' because it has unnamed field(s)'

]

{ #category : 'Grail-Error Messages' }
PyStructSequence class >> ___unexpectedFieldsMessage [
	^ self @env0:___typeName___ @env0:, '() got duplicate or unexpected field name(s)'

]

{ #category : 'Grail-Class Attrs' }
PyStructSequence class >> __match_args__ [
	"The named sequence fields, as structseq.c sets it for pattern matching."

	^ tuple @env0:withAll: (self @env0:___sequenceNames___ @env0:collect: [:name | name @env0:asString])

]

{ #category : 'Instance Creation' }
PyStructSequence class >> __new__ [
	^ self _new: #() kw: nil

]

{ #category : 'Instance Creation' }
PyStructSequence class >> __new__: sequence [
	^ self ___construct___: sequence dict: nil

]

{ #category : 'Instance Creation' }
PyStructSequence class >> __new__: sequence _: aDict [
	"``T(sequence, dict)'' -- what an unpickle calls, with the pair
	__reduce__ answers.  The dict is optional but not nullable: CPython's
	default is no dict at all, so an explicit None is refused like any other
	non-dict (Objects/structseq.c:187-193)."

	(aDict @env0:isKindOf: AbstractDictionary)
		ifFalse: [^ TypeError ___signal___: self ___dictSecondArgMessage].
	^ self ___construct___: sequence dict: aDict

]

{ #category : 'Instance Creation' }
PyStructSequence class >> _new: positional kw: keywords [
	"``T(sequence, dict={})'' by position or by name, as Argument Clinic binds
	structseq_new's two parameters (Objects/structseq.c:155-161)."

	| values |
	values := TypeError @env0:___argumentsOf___: positional keywords: keywords
		named: #('sequence' 'dict') positionalOnly: 0 required: 1 for: 'structseq'.
	(values @env0:at: 2) @env0:isNil ifTrue: [^ self __new__: (values @env0:at: 1)].
	^ self __new__: (values @env0:at: 1) _: (values @env0:at: 2)

]

{ #category : 'Grail-Class Attrs' }
PyStructSequence class >> n_fields [
	^ self @env0:___fieldCount___

]

{ #category : 'Grail-Class Attrs' }
PyStructSequence class >> n_sequence_fields [
	^ self @env0:___sequenceFieldCount___

]

{ #category : 'Grail-Class Attrs' }
PyStructSequence class >> n_unnamed_fields [
	^ self @env0:___unnamedFieldCount___

]

{ #category : 'Grail-Fields' }
PyStructSequence >> ___fieldValues___ [
	"Every field's value, in the order the constructor takes them."

	^ (Array @env0:withAll: self) @env0:, (self @env0:class @env0:___namedOnlyFields___
		@env0:collect: [:name | self ___namedOnlyField___: name])

]

{ #category : 'Grail-Fields' }
PyStructSequence >> ___namedOnlyField___: aName [
	"A named-only field's value; one nothing set is None.  A struct sequence
	built without the constructor -- ``withAll:'' from the kernel side -- has
	those slots empty."

	^ (self @env0:dynamicInstVarAt: aName) @env0:ifNil: [None]

]

{ #category : 'Grail-Attributes' }
PyStructSequence >> ___pyAttrLoad___: aName [
	"A field by name: a named sequence field is its tuple item, a named-only
	field its own slot (CPython's members, Objects/structseq.c)."

	| name index |
	name := aName @env0:asSymbol.
	index := self @env0:class @env0:___sequenceNames___ @env0:indexOf: name.
	index @env0:> 0 ifTrue: [^ self @env0:at: index].
	(self @env0:class @env0:___namedOnlyFields___ @env0:includes: name)
		ifTrue: [^ self ___namedOnlyField___: name].
	"The n_fields family is the TYPE's, read through an instance too."
	(#(#n_fields #n_sequence_fields #n_unnamed_fields) @env0:includes: name)
		ifTrue: [^ self @env0:class ___pyAttrLoad___: name].
	^ super ___pyAttrLoad___: aName

]

{ #category : 'Grail-Attributes' }
PyStructSequence >> ___pyAttrStore___: aName put: aValue [
	"A struct sequence's fields are read-only, and it has no __dict__ for
	anything else (Objects/structseq.c's members are READONLY)."

	(self @env0:class @env0:___fieldNames___ @env0:includes: aName @env0:asSymbol)
		ifTrue: [^ AttributeError ___signal___: self @env0:class ___readonlyMessage].
	^ AttributeError ___signal___: (self @env0:class ___noNewAttributeMessageFor: aName)

]

{ #category : 'Grail-Copying' }
PyStructSequence >> ___replace__: positional kw: changes [
	"``copy.replace(seq, **changes)'' -- a new one with the named fields
	changed (Objects/structseq.c:384-440).  A type with unnamed fields has no
	name for each of them, so it is refused."

	| names values unexpected |
	positional @env0:isEmpty ifFalse: [
		^ TypeError ___signal___: self @env0:class ___replaceTakesNoPositionalMessage].
	self @env0:class @env0:___unnamedFieldCount___ @env0:> 0 ifTrue: [
		^ TypeError ___signal___: self @env0:class ___replaceUnnamedMessage].
	names := self @env0:class @env0:___fieldNames___.
	values := self ___fieldValues___.
	unexpected := OrderedCollection @env0:new.
	changes @env0:ifNotNil: [:given |
		given @env0:keysAndValuesDo: [:key :value | | index |
			index := names @env0:indexOf: key @env0:asSymbol.
			index @env0:= 0
				ifTrue: [unexpected @env0:add: key]
				ifFalse: [values @env0:at: index put: value]]].
	unexpected @env0:isEmpty ifFalse: [
		^ TypeError ___signal___: (self @env0:class ___replaceUnexpectedMessageFor: unexpected)].
	^ self @env0:class @env0:___sequence___: values named: nil

]

{ #category : 'Grail-Pickling' }
PyStructSequence >> __reduce__ [
	"``(type, (the tuple, {the named-only fields}))'', which __new__:_:
	reverses (Objects/structseq.c:339-379)."

	| fields |
	fields := PyDict @env0:new.
	self @env0:class @env0:___namedOnlyFields___ @env0:do: [:name |
		fields @env0:at: name @env0:asString put: (self ___namedOnlyField___: name)].
	^ tuple @env0:with: self @env0:class
		with: (tuple @env0:with: (tuple @env0:withAll: self) with: fields)

]

{ #category : 'Grail-Copying' }
PyStructSequence >> __replace__ [
	^ self ___replace__: #() kw: nil

]

{ #category : 'Grail-String Representation' }
PyStructSequence >> __repr__ [
	"``type.name(field=value, ...)'' over the sequence fields, each named by
	CPython's member at its position (Objects/structseq.c:270-337) -- so an
	unnamed field takes the name of the named-only one that follows, as
	os.stat_result's int times are reprinted under st_atime and friends."

	| names stream |
	names := self @env0:class @env0:___fieldNames___.
	stream := WriteStream @env0:on: Unicode7 @env0:new.
	stream @env0:nextPutAll: self @env0:class @env0:___typeName___; @env0:nextPut: $(.
	1 @env0:to: self @env0:size @env0:do: [:index |
		index @env0:> 1 ifTrue: [stream @env0:nextPutAll: ', '].
		stream
			@env0:nextPutAll: (names @env0:at: index) @env0:asString;
			@env0:nextPut: $=;
			@env0:nextPutAll: (self @env0:at: index) __repr__ @env0:asString].
	stream @env0:nextPut: $).
	^ stream @env0:contents

]
