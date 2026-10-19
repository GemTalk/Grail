"One warning captured by ``catch_warnings(record=True)'.

CPython appends these to the list its context manager hands back, and callers
read them by ATTRIBUTE -- w[0].message, w[0].category, w[-1].filename.  Grail
recorded two-element pairs instead, so every one of those reads failed.

The distinction that matters most: ``message' is a Warning INSTANCE, not the
text.  ``warnings.warn(""boom"")' records UserWarning(""boom""), so str(w[0].message)
is the text and w[0].message.args[0] is too -- test_warnings uses the latter.
Recording the bare string passes a str() check and fails everything else."
Class {
	#name : 'WarningMessage',
	#superclass : 'Object',
	#instVars : [
		'message',
		'category',
		'filename',
		'lineno',
		'file',
		'line',
		'source'
	],
	#category : 'Grail-Modules'
}

{ #category : 'Grail-Instance creation' }
WarningMessage class >> ___message___: aMessage category: aCategory filename: aFilename lineno: aLineno [
	"Build a record.  aMessage may be either the warning TEXT or an already
	constructed Warning instance -- CPython accepts both at warn() and stores
	an instance either way, so the coercion happens here rather than at each
	call site."

	| inst msg |
	msg := aMessage.
	(msg @env0:isKindOf: AbstractException)
		ifFalse: [
			"CALLED, so the category's own __init__ runs, as CPython's
			``category(message)'' does (see the display path in warnings).  The
			send names env 1: this classmethod is env-0 beside the ivar setter."
			msg := aCategory @env1:value: { aMessage } value: nil].
	inst := self @env0:new.
	inst
		___setMessage___: msg
		category: aCategory
		filename: aFilename
		lineno: aLineno.
	^ inst

]

{ #category : 'Grail-Python Attribute Hook' }
WarningMessage class >> ___pythonValueAttrs___ [
	"The seven unary methods below are Python VALUE attributes, not bound
	methods.  Without this, ``w[0].message'' answers a BoundMethod and the
	next step -- ``.args[0]'', ``.category.__name__'' -- fails on it, which
	is exactly how the first cut of this class read."

	^ IdentitySet new
		add: #message;
		add: #category;
		add: #filename;
		add: #lineno;
		add: #file;
		add: #line;
		add: #source;
		yourself

]

{ #category : 'Grail-Private' }
WarningMessage >> ___line___: aLine [
	"The source line warn_explicit took from a loader; nil leaves None, for
	the display to read from the file."

	aLine == nil ifFalse: [line := aLine].
	^ self

]

{ #category : 'Grail-Private' }
WarningMessage >> ___setMessage___: aMessage category: aCategory filename: aFilename lineno: aLineno [
	message := aMessage.
	category := aCategory.
	filename := aFilename == nil ifTrue: [None] ifFalse: [aFilename].
	lineno := aLineno == nil ifTrue: [0] ifFalse: [aLineno].
	file := None.
	line := None.
	source := None.
	^ self

]
