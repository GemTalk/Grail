Extension { #name : 'TextIOWrapper' }

{ #category : 'Grail-Opening' }
TextIOWrapper class >> ___constructText___: posArgs kw: kwArgs [
	"``io.TextIOWrapper(buffer, encoding, errors, newline, ...)'' -- and this
	is the one place where Grail's TextIOWrapper and CPython's are two
	different objects wearing one name.

	Grail's is a FileIO subclass over a GsFile: it OPENS a file and decodes
	what it reads.  That is what open() answers in text mode, and what
	io.TextIOWrapper has always been here.  CPython's wraps an existing
	BUFFER -- a BufferedReader, a BytesIO -- and owns no file at all.  Text
	mode over a buffer is the second one, and socket.makefile('r') is exactly
	that call: ``io.TextIOWrapper(io.BufferedReader(SocketIO(...)), enc)''.
	Inherited unchanged, FileIO's constructors took the BUFFER for a FILE
	NAME and tried to open it.

	So the first argument decides.  A str (or a PathLike) keeps the GsFile
	path; anything else is a buffer and is handed to _pyio's TextIOWrapper,
	CPython's own pure-Python implementation, already vendored here for the
	buffered layer.  That one has been unusable until now for a reason that
	had nothing to do with io: its constructor asks
	``codecs.lookup(encoding).incrementaldecoder'', and Grail's codecs was a
	stub whose lookup raised LookupError for every name.  With a real
	registry behind it, it works.

	A SUBCLASS takes the GsFile path here, because the only subclasses that
	reach this method are Grail's own Smalltalk ones.  A Python ``class
	C(io.TextIOWrapper)'' is rooted at _pyio's TextIOWrapper instead (Class >>
	___subclass___:instVarNames:classInstVarNames:, #1459), so it wraps a
	buffer as CPython's does and never arrives here."

	| first |
	posArgs @env0:size @env0:< 1 ifTrue: [
		TypeError ___signal___:
			'TextIOWrapper() missing required argument ''buffer'' (pos 1)'].
	first := posArgs @env0:at: 1.
	((self ~~ TextIOWrapper) @env0:or: [self ___isPathLikeArgument___: first])
		ifTrue: [^ super _new: posArgs kw: kwArgs].
	^ ((io instance) ___pyioClass___: #'TextIOWrapper')
		@env1:value: posArgs value: kwArgs

]

{ #category : 'Grail-Opening' }
TextIOWrapper class >> ___isPathLikeArgument___: anObject [
	"True when the first constructor argument names a FILE rather than being
	a buffer.  A CharacterCollection is the common case; ``__fspath__'' is
	PEP 519's, so pathlib.Path lands here too.  Everything else -- anything
	with a read/readable -- is a buffer.

	Deliberately a positive test for path-ness rather than a negative test
	for buffer-ness: a buffer object is free to define almost anything, but
	the two spellings that mean ``open this'' are closed.  The class chain is
	probed rather than the own method dict, so a Path SUBCLASS counts."

	(anObject isKindOf: CharacterCollection) ifTrue: [^ true].
	^ (anObject @env0:class @env0:whichClassIncludesSelector: #'__fspath__'
		environmentId: 1) @env0:notNil

]

{ #category : 'Grail-Class Methods' }
TextIOWrapper class >> __instancecheck__: anObject [
	"isinstance(x, io.TextIOWrapper) for a TextIOWrapper over a BUFFER.

	Those are _pyio's class, not this one: a plain ``io.TextIOWrapper(buffer)''
	answers _pyio's (___constructText___:kw:), and a Python ``class
	C(io.TextIOWrapper)'' is rooted there (Class >> ___subclass___:...), so
	isKindOf: says no where CPython says yes -- for pytest's CaptureIO among
	others (#1459).  Consulted only after isKindOf: has failed, and only for
	TextIOWrapper itself, not for Grail's Smalltalk subclasses of it."

	| pyio |
	self == TextIOWrapper ifFalse: [^ false].
	pyio := [(io instance) ___pyioClass___: #'TextIOWrapper']
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	^ (pyio @env0:isKindOf: Behavior) and: [anObject @env0:isKindOf: pyio]

]

{ #category : 'Grail-Opening' }
TextIOWrapper class >> __new__ [
	^ TypeError ___signal___:
		'TextIOWrapper() missing required argument ''buffer'' (pos 1)'

]

{ #category : 'Grail-Opening' }
TextIOWrapper class >> __new__: bufferArg [
	^ self ___constructText___: { bufferArg } kw: nil

]

{ #category : 'Grail-Opening' }
TextIOWrapper class >> __new__: bufferArg _: encodingArg [
	^ self ___constructText___: { bufferArg. encodingArg } kw: nil

]

{ #category : 'Grail-Opening' }
TextIOWrapper class >> __new__: bufferArg _: encodingArg _: errorsArg [
	^ self ___constructText___: { bufferArg. encodingArg. errorsArg } kw: nil

]

{ #category : 'Grail-Opening' }
TextIOWrapper class >> __new__: bufferArg _: encodingArg _: errorsArg _: newlineArg [
	^ self ___constructText___:
		{ bufferArg. encodingArg. errorsArg. newlineArg } kw: nil

]

{ #category : 'Grail-Opening' }
TextIOWrapper class >> __new__: bufferArg _: encodingArg _: errorsArg _: newlineArg _: lineBufferingArg [
	^ self ___constructText___:
		{ bufferArg. encodingArg. errorsArg. newlineArg. lineBufferingArg }
		kw: nil

]

{ #category : 'Grail-Opening' }
TextIOWrapper class >> __new__: bufferArg _: encodingArg _: errorsArg _: newlineArg _: lineBufferingArg _: writeThroughArg [
	^ self ___constructText___:
		{ bufferArg. encodingArg. errorsArg. newlineArg. lineBufferingArg.
		  writeThroughArg }
		kw: nil

]

{ #category : 'Grail-Class Methods' }
TextIOWrapper class >> __subclasscheck__: aClass [
	"issubclass(C, io.TextIOWrapper), the class-level twin of
	__instancecheck__: above."

	| pyio |
	self == TextIOWrapper ifFalse: [^ false].
	(aClass @env0:isKindOf: Behavior) ifFalse: [^ false].
	pyio := [(io instance) ___pyioClass___: #'TextIOWrapper']
		@env0:on: Error do: [:ex | ex @env0:return: nil].
	^ (pyio @env0:isKindOf: Behavior)
		and: [aClass == pyio or: [aClass @env0:inheritsFrom: pyio]]

]

{ #category : 'Grail-Opening' }
TextIOWrapper class >> _new: posArgs kw: kwArgs [
	"The keyword form -- ``io.TextIOWrapper(buf, encoding='utf-8')'', which
	is how _pyio.open and most callers spell it."

	^ self ___constructText___: posArgs kw: kwArgs

]

{ #category : 'Grail-Reading' }
TextIOWrapper >> ___ioRead___: n [
	"read(size=-1) - read up to size characters (approximated as bytes,
	then completed to a whole trailing UTF-8 sequence); -1 / None means
	read to EOF."

	| raw |
	self _checkReadable.
	(n == nil @env0:or: [n == None @env0:or: [n @env0:< 0]]) ifTrue: [
		^ self _decode: (self _readToEnd)].
	raw := self _rawRead: n.
	raw := self _completeUtf8Tail: raw.
	^ self _decode: raw

]

{ #category : 'Grail-Reading' }
TextIOWrapper >> ___ioReadline___: limit [
	self _checkReadable.
	^ self _decode: (self _rawReadline: limit)

]

{ #category : 'Grail-Private' }
TextIOWrapper >> _completeUtf8Tail: raw [
	"read(n) reads n BYTES, which can split a multi-byte UTF-8 sequence.
	If the tail is an incomplete sequence, read the missing continuation
	bytes so the decode below sees whole characters."

	| enc i have lead need extra |
	enc := self @env0:dynamicInstVarAt: #_encoding.
	enc @env0:= 'utf-8' ifFalse: [^ raw].
	raw @env0:isEmpty ifTrue: [^ raw].
	i := raw @env0:size.
	have := 0.
	[(i @env0:> 0) @env0:and: [(((raw @env0:at: i) @env0:codePoint) @env0:bitAnd: 16rC0) @env0:= 16r80]]
		@env0:whileTrue: [have := have @env0:+ 1. i := i @env0:- 1].
	i @env0:= 0 ifTrue: [^ raw].
	lead := (raw @env0:at: i) @env0:codePoint.
	lead @env0:< 16rC0 ifTrue: [^ raw].
	need := lead @env0:>= 16rF0 ifTrue: [3] ifFalse: [lead @env0:>= 16rE0 ifTrue: [2] ifFalse: [1]].
	have @env0:>= need ifTrue: [^ raw].
	extra := self _rawRead: (need @env0:- have).
	^ raw @env0:, extra

]

{ #category : 'Grail-Private' }
TextIOWrapper >> _decode: raw [
	"Decode a raw byte String per the stored encoding.  latin-1 is an
	identity map (single-byte String chars ARE latin-1 code points)."

	| enc |
	raw @env0:isEmpty ifTrue: [^ ''].
	enc := self @env0:dynamicInstVarAt: #_encoding.
	enc @env0:= 'latin-1' ifTrue: [^ raw].
	"latin-9 differs from latin-1 at 8 bytes, so it cannot be the identity map
	above; hand the bytes to the codec that already knows the table
	(bytes >> decode:_:) rather than repeating it here."
	enc @env0:= 'iso-8859-15' ifTrue: [ | ba |
		ba := bytes @env0:new: raw @env0:size.
		1 @env0:to: raw @env0:size do: [:i | ba @env0:at: i put: (raw @env0:at: i) @env0:codePoint].
		^ ba decode: 'iso-8859-15' _: 'strict'].
	^ [raw @env0:decodeFromUTF8] @env0:on: Error do: [:ex |
		UnicodeDecodeError ___signal___: ('''utf-8'' codec can''t decode bytes from file ' @env0:, (self @env0:dynamicInstVarAt: #_name))]

]

{ #category : 'Grail-State' }
TextIOWrapper >> encoding [
	^ (self @env0:dynamicInstVarAt: #_encoding)

]

{ #category : 'Grail-Writing' }
TextIOWrapper >> write: data [
	"Write a str; answer the character count (CPython contract)."

	| f enc out cp |
	self _checkWritable.
	(data isKindOf: CharacterCollection) ifFalse: [
		TypeError ___signal___: 'write() argument must be str'].
	data @env0:isEmpty ifTrue: [^ 0].
	f := self @env0:dynamicInstVarAt: #_gsfile.
	enc := self @env0:dynamicInstVarAt: #_encoding.
	enc @env0:= 'latin-1' ifTrue: [
		out := String @env0:new: data @env0:size.
		1 @env0:to: data @env0:size do: [:i |
			cp := (data @env0:at: i) @env0:codePoint.
			cp @env0:> 255 ifTrue: [
				UnicodeEncodeError ___signal___: '''latin-1'' codec can''t encode character'].
			out @env0:at: i put: (Character @env0:codePoint: cp)].
		f @env0:nextPutAll: out
	] ifFalse: [
		enc @env0:= 'iso-8859-15' ifTrue: [ | encoded |
			"The str codec owns the latin-9 table, including the UnicodeEncodeError
			for a character latin-9 cannot represent."
			encoded := data encode: 'iso-8859-15' _: 'strict'.
			out := String @env0:new: encoded @env0:size.
			1 @env0:to: encoded @env0:size do: [:i |
				out @env0:at: i put: (Character @env0:codePoint: (encoded @env0:at: i))].
			f @env0:nextPutAll: out
		] ifFalse: [
			f @env0:nextPutAllUtf8: data]].
	^ data @env0:size

]
