"Python SyntaxError exception.

Instance variables:
  msg - error message
  filename - name of the file with the syntax error
  lineno - line number where the error occurred
  offset - column offset where the error occurred
  text - text of the line with the error
  end_lineno - end line number (Python 3.10+)
  end_offset - end column offset (Python 3.10+)

"
Class {
	#name : 'SyntaxError',
	#superclass : 'Exception',
	#instVars : [
		'msg',
		'filename',
		'lineno',
		'offset',
		'text',
		'end_lineno',
		'end_offset'
	],
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Python Attribute Access' }
SyntaxError >> ___checkedLocation___: aLocation [
	"A SyntaxError's location argument, refused as SyntaxError_init refuses it
	(Objects/exceptions.c:2725-2756): any iterable, made a tuple as
	PySequence_Tuple makes it, of four to seven items -- filename, lineno,
	offset, text, then end_lineno, end_offset and metadata -- and an
	end_lineno needs its end_offset.  Grail read whatever was there, so
	``SyntaxError('bad', ('bad.py', 1, 2))'' was built (test_exceptions
	test_incorrect_constructor)."

	| info |
	info := tuple @env1:__new__: aLocation.
	info size < 4 ifTrue: [
		^ TypeError @env1:___signal___: 'function takes at least 4 arguments ('
			, info size printString , ' given)'].
	info size > 7 ifTrue: [
		^ TypeError @env1:___signal___: 'function takes at most 7 arguments ('
			, info size printString , ' given)'].
	info size = 5 ifTrue: [
		^ TypeError @env1:___signal___: 'end_offset must be provided when end_lineno is provided'].
	^ info

]
