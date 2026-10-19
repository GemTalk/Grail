Class {
	#name : 'BoundMethodNameTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - BoundMethod Names' }
BoundMethodNameTestCase >> testModuleReturnsReceiverClassName [
	"``bm.__module__'' falls back to the receiver class name as a
	best-effort identifier — Grail BoundMethods don't track the
	defining module."

	| bm |
	bm := BoundMethod @env1:receiver: 'hello' selector: #'lower'.
	self assert: bm @env1:__module__ equals: 'Unicode7'

]

{ #category : 'Grail-Tests - BoundMethod Names' }
BoundMethodNameTestCase >> testNameReturnsSelectorString [
	"``bm.__name__'' returns the bound selector as a String."

	| bm |
	bm := BoundMethod @env1:receiver: 'hello' selector: #'upper'.
	self assert: bm @env1:__name__ equals: 'upper'

]

{ #category : 'Grail-Tests - BoundMethod Names' }
BoundMethodNameTestCase >> testQualnameQualifiesByReceiverType [
	"``bm.__qualname__'' qualifies a bound method with its receiver's PYTHON
	type, as CPython does: ``'hello'.lower.__qualname__'' is ``str.lower''.

	This asserted the BARE name -- ``the same identifier as __name__ until Grail
	tracks lexical nesting'' -- and that was the defect, not a rule: a bare
	``lower'' names nothing reachable from a module, which is exactly why the
	CLASS-receiver case was qualified earlier (pickle resolves a callable by
	walking its qualname).  test_funcattrs' test_builtin__qualname__ asserts
	``list.append'' and ``str.maketrans''.

	Qualifying by the receiver's type rather than by the method's DEFINING class
	is deliberate and imperfect; see BoundMethod >> __qualname__.  Asking the
	Smalltalk defining class leaked Grail internals (``CharacterCollection.lower'',
	``Unicode7.lower''), which is worse than the one case this gets wrong -- an
	inherited method reports the subclass."

	| bm |
	bm := BoundMethod @env1:receiver: 'hello' selector: #'lower'.
	self assert: bm @env1:__qualname__ equals: 'str.lower'.
	self assert: bm @env1:__name__ equals: 'lower'

]

{ #category : 'Grail-Tests - BoundMethod Names' }
BoundMethodNameTestCase >> testUnboundFormFallsBackToReceiverClassName [
	"An unbound class-method BoundMethod (receiver isNil) returns
	the placeholder receiver's class name for ``__name__''.  Matches
	the no-receiver path used by class-body forward refs."

	| bm |
	bm := BoundMethod @env1:receiver: nil selector: nil.
	self assert: bm @env1:__name__ equals: 'UndefinedObject'

]
