! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for ClassTablesChunkedTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'ClassTablesChunkedTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
ClassTablesChunkedTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! ClassTablesChunkedTestCase
!
! A CLASS'S PER-METHOD TABLES MUST FIT GEMSTONE'S 5M-BYTE LITERAL LIMIT.
!
! Every Python class carries class-side tables with an entry per method --
! docstrings, code objects, signatures, default keys, receivers, annotations,
! type parameters -- and each was ONE accessor compiled from ONE string
! literal in the class-build text.  The limit is in STORAGE bytes, and one
! character above U+FFFF anywhere in the class -- even one the source spells
! as an escape -- stores the whole build text at four bytes a character.
! idna's generated UTS46Tests has 6,329 methods and 3,338 ``\U000...''
! escapes, and its import failed with an uncatchable ``string literal too
! big (exceeds 5M bytes)''.  Measured with a generated module: 6,000 trivial
! methods import, and fail once one such character is added, raw or escaped.
!
! Tables too big for one literal are now split into chunk accessors that the
! table's own selector threads a fresh table through, as the IR text twin
! already was (IRTextSourcesChunkedTestCase).  What can go wrong is a LOST OR
! ALTERED entry, which reads as a method with no docstring, no signature or
! no code object.  So the fixture is read through Python at the real budget
! and at one small enough to split every table, with a positive control that
! the small budget really did split them.
! ===============================================================================

doit
ClassTablesChunkedTestCase removeAllMethods.
ClassTablesChunkedTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: ClassTablesChunkedTestCase
tearDown
	SessionTemps current removeKey: #'___grailIRTextSourcesBudget___' ifAbsent: [].
	(importlib @env1:modules) removeKey: #'ctc_chunked' ifAbsent: [].
	self ___forgetCanonicalModule___: 'ctc_chunked'
%

category: 'Grail-Private'
method: ClassTablesChunkedTestCase
___load___: aBudgetOrNil
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
%

category: 'Grail-Private'
method: ClassTablesChunkedTestCase
___holderOf___: aModule
	^ aModule @env1:___pyAttrLoad___: #'Holder'
%

category: 'Grail-Private'
method: ClassTablesChunkedTestCase
___splitTablesOf___: aClass
	"The tables of aClass that were split into chunk accessors."

	^ #(#'___methodDocTable___' #'___methodCodeTable___' #'___methodSignatureTable___'
		#'___methodDefaultKeysTable___' #'___methodReceiverTable___'
		#'___methodAnnotationsTable___' #'___methodTypeParamsTable___')
			select: [:sel |
				(aClass class
					whichClassIncludesSelector: ((sel copyFrom: 1 to: sel size - 3) , '_2___:') asSymbol
					environmentId: 1) notNil]
%

category: 'Grail-Tests - class tables under the literal limit'
method: ClassTablesChunkedTestCase
testTheFixtureAgreesWithCPythonAtTheRealBudget
	"Includes the check that exec's a class whose docstring table alone is
	past the limit, which raised ``string literal too big'' before."

	| mod |
	mod := self ___load___: nil.
	self assert: (self ___splitTablesOf___: (self ___holderOf___: mod)) isEmpty
		description: 'the real budget split a class this small'.
	self
		assert: (mod @env1:___pyAttrLoad___: #'SUMMARY') asString
		equals: '8 checks, 0 disagreeing'
%

category: 'Grail-Tests - class tables under the literal limit'
method: ClassTablesChunkedTestCase
testEveryTableReadsTheSameWhenSplit
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
%
