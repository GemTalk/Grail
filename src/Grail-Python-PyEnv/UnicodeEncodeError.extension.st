Extension { #name : 'UnicodeEncodeError' }

{ #category : 'Grail-Python Protocol' }
UnicodeEncodeError >> __str__ [
	"CPython's UnicodeEncodeError_str (Objects/exceptions.c:3663-3723):
	empty for an error with no object; otherwise reason and encoding made
	strs FIRST -- their __str__ may change the error -- the object checked
	again, and the one offending character named, as its \\xNN / \\uNNNN /
	\\UNNNNNNNN escape, only when start and end bracket exactly one in range.
	Every field is read as it stands, so an assignment after construction
	shows (test_exceptions test_unicode_change_attributes).

	A raise that passed a bare message keeps BaseException's str."

	| reasonText encodingText object |
	self ___hasFields___ ifFalse: [^ super __str__].
	(self ___field___: #'object') == nil ifTrue: [^ ''].
	reasonText := self ___strOf___: #'reason'.
	encodingText := self ___strOf___: #'encoding'.
	object := self ___checkedObjectOf___: 'string'
		where: [:each | (each @env0:isKindOf: CharacterCollection) or: [each @env0:isKindOf: AbstractPyStr]].
	(self ___namesOneItemOf___: object) ifTrue: [
		^ '''' @env0:, encodingText @env0:, ''' codec can''t encode character '''
			@env0:, (self ___escapeForMessage___:
				(self ___codePointAt___: (self ___field___: #'start') in: object))
			@env0:, ''' in position ' @env0:, (self ___field___: #'start') @env0:printString
			@env0:, ': ' @env0:, reasonText].
	^ '''' @env0:, encodingText @env0:, ''' codec can''t encode characters in '
		@env0:, self ___rangeText___ @env0:, ': ' @env0:, reasonText

]
