Class {
	#name : 'ClassTablesChunkedTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ClassTablesChunkedTestCase >> ___holderOf___: aModule [
	^ aModule @env1:___pyAttrLoad___: #'Holder'

]

{ #category : 'Grail-Private' }
ClassTablesChunkedTestCase >> ___load___: aBudgetOrNil [
	"A fresh import of the fixture under aBudgetOrNil bytes a table literal,
	or the real budget when nil."

	(importlib @env1:modules) removeKey: #'ctc_chunked' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ctc_chunked'.
	aBudgetOrNil isNil
		ifTrue: [SessionTemps current removeKey: #'___grailIRTextSourcesBudget___' ifAbsent: []]
		ifFalse: [SessionTemps current at: #'___grailIRTextSourcesBudget___' put: aBudgetOrNil].
	^ importlib
		loadModuleFromPath: importlib grailDir , '/tests/python/class_tables_chunked.py'
		name: 'ctc_chunked'

]

{ #category : 'Grail-Private' }
ClassTablesChunkedTestCase >> ___splitTablesOf___: aClass [
	"The tables of aClass that were split into chunk accessors."

	^ #(#'___methodDocTable___' #'___methodCodeTable___' #'___methodSignatureTable___'
		#'___methodDefaultKeysTable___' #'___methodReceiverTable___'
		#'___methodAnnotationsTable___' #'___methodTypeParamsTable___')
			select: [:sel |
				(aClass class
					whichClassIncludesSelector: ((sel copyFrom: 1 to: sel size - 3) , '_2___:') asSymbol
					environmentId: 1) notNil]

]

{ #category : 'Grail-Setup' }
ClassTablesChunkedTestCase >> tearDown [
	SessionTemps current removeKey: #'___grailIRTextSourcesBudget___' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'ctc_chunked' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ctc_chunked'

]

{ #category : 'Grail-Tests - class tables under the literal limit' }
ClassTablesChunkedTestCase >> testEveryTableReadsTheSameWhenSplit [
	"Lose or alter nothing: at a budget small enough to split every table,
	every method still has its docstring, code object, signature, defaults,
	receiver, annotations and type parameters, as CPython reports them."

	| mod split |
	mod := self ___load___: 300.
	split := self ___splitTablesOf___: (self ___holderOf___: mod).
	self assert: split size = 7
		description: 'a 300-byte budget split only ' , split printString
			, ', so the checks below would read single accessors and prove nothing'.
	self
		assert: (mod @env1:___pyAttrLoad___: #'SUMMARY') asString
		equals: '8 checks, 0 disagreeing'

]

{ #category : 'Grail-Tests - class tables under the literal limit' }
ClassTablesChunkedTestCase >> testTheFixtureAgreesWithCPythonAtTheRealBudget [
	"Includes the check that exec's a class whose docstring table alone is
	past the limit, which raised ``string literal too big'' before."

	| mod |
	mod := self ___load___: nil.
	self assert: (self ___splitTablesOf___: (self ___holderOf___: mod)) isEmpty
		description: 'the real budget split a class this small'.
	self
		assert: (mod @env1:___pyAttrLoad___: #'SUMMARY') asString
		equals: '8 checks, 0 disagreeing'

]
