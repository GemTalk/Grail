Extension { #name : 'UnicodeTranslateError' }

{ #category : 'Grail-Initialization' }
UnicodeTranslateError class >> ___checkConstructorArguments___: someArguments [
	"PyArg_ParseTuple's ``UnnU'' in UnicodeTranslateError_init
	(Objects/exceptions.c:3873-3892): object, start, end, reason."

	self ___check___: someArguments count: 4.
	self ___checkStr___: someArguments at: 1.
	self ___checkPosition___: (someArguments @env0:at: 2).
	self ___checkPosition___: (someArguments @env0:at: 3).
	self ___checkStr___: someArguments at: 4

]

{ #category : 'Grail-Python Protocol' }
UnicodeTranslateError >> __str__ [
	"CPython's UnicodeTranslateError_str (Objects/exceptions.c:3890-3942): the
	encode error's message without a codec -- ``can't translate character
	'\\x78' in position 1: foo''.  It inherited BaseException's, which printed
	the four arguments as a tuple.

	A raise that passed a bare message keeps BaseException's str."

	| reasonText object |
	self ___hasFields___ ifFalse: [^ super __str__].
	(self ___field___: #'object') == nil ifTrue: [^ ''].
	reasonText := self ___strOf___: #'reason'.
	object := self ___checkedObjectOf___: 'string'
		where: [:each | (each @env0:isKindOf: CharacterCollection) or: [each @env0:isKindOf: AbstractPyStr]].
	(self ___namesOneItemOf___: object) ifTrue: [
		^ 'can''t translate character '''
			@env0:, (self ___escapeForMessage___:
				(self ___codePointAt___: (self ___field___: #'start') in: object))
			@env0:, ''' in position ' @env0:, (self ___field___: #'start') @env0:printString
			@env0:, ': ' @env0:, reasonText].
	^ 'can''t translate characters in ' @env0:, self ___rangeText___ @env0:, ': ' @env0:, reasonText

]
