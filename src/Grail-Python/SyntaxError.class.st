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
