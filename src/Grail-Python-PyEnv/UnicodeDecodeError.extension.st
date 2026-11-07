Extension { #name : 'UnicodeDecodeError' }

{ #category : 'Grail-Initialization' }
UnicodeDecodeError class >> ___checkConstructorArguments___: someArguments [
	"PyArg_ParseTuple's ``UOnnU'' in UnicodeDecodeError_init
	(Objects/exceptions.c:3751-3789), then the object's buffer: encoding,
	object, start, end, reason."

	self ___check___: someArguments count: 5.
	self ___checkStr___: someArguments at: 1.
	self ___checkPosition___: (someArguments @env0:at: 3).
	self ___checkPosition___: (someArguments @env0:at: 4).
	self ___checkStr___: someArguments at: 5.
	self ___checkBytesLike___: (someArguments @env0:at: 2)

]

{ #category : 'Grail-Python Protocol' }
UnicodeDecodeError >> __str__ [
	"CPython's UnicodeDecodeError_str (Objects/exceptions.c:3786-3836), in the
	shape of UnicodeEncodeError's: the offending BYTE is named in hex, and the
	object has to be bytes.

	    'ascii' codec can't decode byte 0xff in position 1: ordinal not in range(128)
	    'utf-8' codec can't decode bytes in position 2-3: invalid continuation byte

	A raise that passed a bare message keeps BaseException's str."

	| reasonText encodingText object |
	self ___hasFields___ ifFalse: [^ super __str__].
	(self ___field___: #'object') == nil ifTrue: [^ ''].
	reasonText := self ___strOf___: #'reason'.
	encodingText := self ___strOf___: #'encoding'.
	object := self ___checkedObjectOf___: 'bytes' where: [:each | each @env0:isKindOf: ByteArray].
	(self ___namesOneItemOf___: object) ifTrue: [
		^ '''' @env0:, encodingText @env0:, ''' codec can''t decode byte 0x'
			@env0:, (self ___twoHexDigits___: (object @env0:at: (self ___field___: #'start') @env0:+ 1))
			@env0:, ' in position ' @env0:, (self ___field___: #'start') @env0:printString
			@env0:, ': ' @env0:, reasonText].
	^ '''' @env0:, encodingText @env0:, ''' codec can''t decode bytes in '
		@env0:, self ___rangeText___ @env0:, ': ' @env0:, reasonText

]
