"An exception that represents a Python error that bubbled up through the C API.

Raised by CPythonLibrary >> checkPythonError when PyErr_GetRaisedException
returns a non-NULL exception object. Carries the Python exception type name
and message as separate instance variables for programmatic inspection.

Example:
	[
		CPythonLibrary current runStatements: '1/0'
	] on: CPythonException do: [ :ex |
		ex pythonTypeName   '=> ''ZeroDivisionError'''
		ex pythonMessage    '=> ''division by zero'''
		ex messageText      '=> ''ZeroDivisionError: division by zero'''
	]."
Class {
	#name : 'CPythonException',
	#superclass : 'Error',
	#instVars : [
		'pythonTypeName',
		'pythonMessage'
	],
	#category : 'CPython'
}

{ #category : 'Instance Creation' }
CPythonException class >> pythonTypeName: aTypeName message: aMessage [

	^ self new initializePythonTypeName: aTypeName message: aMessage

]

{ #category : 'Initialization' }
CPythonException >> initializePythonTypeName: aTypeName message: aMessage [

	pythonTypeName := aTypeName.
	pythonMessage := aMessage.
	messageText := aTypeName , ': ' , aMessage.

]

{ #category : 'Accessing' }
CPythonException >> messageText [
	"Answer the messageText instVar directly.  A GLASS host extent
	carries a session-method override of Exception>>messageText (the
	Grease issue #111 shim, 'restore pre-3.6.0 behavior') that answers
	the gsDetails instVar instead — which this class never sets — so
	inherited lookup returned nil there even though initialize had
	stored the text.  A persistent accessor here outranks the inherited
	session override on every extent and is identical to the kernel
	behavior on a stock one."

	^ messageText

]

{ #category : 'Accessing' }
CPythonException >> pythonMessage [

	^ pythonMessage

]

{ #category : 'Accessing' }
CPythonException >> pythonTypeName [

	^ pythonTypeName

]
