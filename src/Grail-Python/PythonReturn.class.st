"Internal signal used to implement Python return statements.

When a Python function body is compiled as a Smalltalk closure stored in a
SymbolDictionary, the Smalltalk ^ (non-local return) cannot escape to the
correct home context. Instead, ReturnAst generates:
    PythonReturn ___signal___: value
and FunctionDefAst wraps the body in:
    [...] on: PythonReturn do: [:ex | ex returnValue]

Instance variables:
  returnValue - the value being returned

"
Class {
	#name : 'PythonReturn',
	#superclass : 'Exception',
	#instVars : [
		'returnValue'
	],
	#category : 'Grail-Exceptions'
}

{ #category : 'Grail-Accessing' }
PythonReturn >> returnValue [
	^ returnValue

]

{ #category : 'Grail-Accessing' }
PythonReturn >> returnValue: aValue [
	returnValue := aValue

]
