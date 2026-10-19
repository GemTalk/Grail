Class {
	#name : 'UnicodeError',
	#superclass : 'ValueError',
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Python Attribute Hook' }
UnicodeError class >> ___pythonValueAttrs___ [
	"CPython's UnicodeEncodeError / UnicodeDecodeError name their five
	constructor arguments as read-write ATTRIBUTES -- encoding, object,
	start, end, reason -- and stdlib code reads them.  Without this the
	accessors below came back as BoundMethods, so
	``offset + exc.start'' answered ``unsupported operand type(s) for +:
	'SmallInteger' and 'BoundMethod''' -- which is how
	encodings/punycode.py's decoder fails when it tries to re-raise with
	the offsets adjusted.

	Registered on UnicodeError rather than on each subclass because
	UnicodeTranslateError names four of the five in the same way, and a
	subclass that happens not to carry them answers nil rather than
	misreporting.

	Extends the inherited set; BaseException builds a fresh IdentitySet
	per call, so adding to the answer is safe."

	^ super ___pythonValueAttrs___
		add: #'encoding';
		add: #'object';
		add: #'start';
		add: #'end';
		add: #'reason';
		yourself

]
